import { attendanceRepo } from './attendance.repo';
import { AttendanceEngine } from '../../services/attendanceEngine';
import { attendanceAudit } from './attendance.audit';
import prisma from '../../db';

export class AttendanceService {
    async getDailyRecords(dateStr?: string, filter?: string) {
        const date = dateStr ? new Date(dateStr) : new Date();
        return await attendanceRepo.getDailyRecords(date, filter);
    }

    async getAllLogsToday(page: number = 1, limit: number = 10) {
        return await attendanceRepo.getAllLogsToday(page, limit);
    }

    async getDashboardStats() {
        const today = new Date();
        return await attendanceRepo.getDailyStats(today);
    }

    async getEmployeeHistory(employeeId: string) {
        return await attendanceRepo.getEmployeeHistory(employeeId);
    }

    async getAuditLogs(targetId: string) {
        return await attendanceAudit.getLogsByTargetId(targetId);
    }

    async createAttendance(data: {
        employeeId: string;
        recorder: string;
        action?: 'PUNCH' | 'AUTO' | 'MANUAL';
        targetStatus?: string; // 仅管理员手动指定时有用
        reason?: string;
    }) {
        // 1. 获取员工信息
        const employee = await prisma.employee.findUnique({
            where: { employeeId: data.employeeId }
        });
        if (!employee) throw new Error('Employee not found');

        // 2. 获取当前最新的规则
        const rule = await prisma.attendanceRule.findFirst({ where: { isDefault: true } });
        if (!rule) throw new Error('System rule not configured');

        // 3. 获取该员工今日此刻之前的最新状态
        const latest = await attendanceRepo.getLatestRecordToday(data.employeeId);
        const currentStatus = latest?.status || null;

        // 4. 判定下一个状态
        let nextStatus: string;
        if (data.action === 'MANUAL' && data.targetStatus) {
            nextStatus = data.targetStatus;
        } else {
            nextStatus = AttendanceEngine.determineNextStatus(
                currentStatus,
                new Date(),
                rule,
                data.action || 'PUNCH'
            );
        }

        // 5. 拦截重复或非法流转
        if (nextStatus === currentStatus && data.action === 'PUNCH') {
            throw new Error(`当前状态已是 [${currentStatus}]，无需重复操作`);
        }

        // 6. 追加记录
        return await attendanceRepo.createAttendance({
            employeeId: data.employeeId,
            status: nextStatus,
            recorder: data.recorder,
            reason: data.reason
        });
    }

    /**
     * 【每日全员重置】 07:00 逻辑
     */
    async dailyReset() {
        // 1. 获取所有在职员工
        const activeEmployees = await prisma.employee.findMany({
            where: { status: 'ACTIVE', deletedAt: null }
        });

        const now = new Date();
        const day = now.getDay();
        if (day === 0 || day === 6) {
            console.log('[CRON] 週末のため、リセットをスキップします。');
            return { count: 0, skipped: true };
        }

        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let updatedCount = 0;
        for (const emp of activeEmployees) {
            let currentDutyStatus = emp.dutyStatus;
            let currentWorkLocation = emp.workLocation;

            // 2. 检查假期是否到期 (如果今日凌晨已超过假期结束日，则恢复正常)
            if (emp.dutyStatusEndDate && emp.dutyStatusEndDate < todayMidnight) {
                // 假期已过，重置为正常上班
                await prisma.employee.update({
                    where: { id: emp.id },
                    data: { dutyStatus: 'NORMAL', dutyStatusEndDate: null }
                });
                currentDutyStatus = 'NORMAL';
            }

            // 3. 根据状态决定今日初始化记录
            let targetStatus = '未出勤-正常';
            const recorder = 'SYSTEM';

            if (currentDutyStatus === 'PAID_LEAVE') {
                targetStatus = '休假-有休';
            } else if (currentDutyStatus === 'UNPAID_LEAVE') {
                targetStatus = '休假-无休';
            } else {
                // 正常上班的情况，再看地点
                if (currentWorkLocation === 'REMOTE') {
                    targetStatus = '公司外-远程';
                } else if (currentWorkLocation === 'WORKSITE') {
                    targetStatus = '公司外-现场';
                } else {
                    targetStatus = '未出勤-正常';
                }
            }

            await attendanceRepo.createAttendance({
                employeeId: emp.employeeId,
                status: targetStatus,
                recorder: recorder,
                recordTime: now,
                reason: 'Daily System Reset'
            });
            updatedCount++;
        }

        return { count: updatedCount };
    }

    /**
     * 【自动缺勤判定】 14:00 逻辑
     */
    async checkAbsence() {
        const now = new Date();
        // 仅针对 [正常上班] 且 [在办公室] 的员工进行自动判定
        const targetEmployees = await prisma.employee.findMany({
            where: {
                status: 'ACTIVE',
                dutyStatus: 'NORMAL',
                workLocation: 'OFFICE',
                deletedAt: null
            }
        });

        let count = 0;
        for (const emp of targetEmployees) {
            const latest = await attendanceRepo.getLatestRecordToday(emp.employeeId);
            // 如果到了 14:00 还是“未出勤”状态，则判定为缺勤
            if (!latest || latest.status.startsWith('未出勤')) {
                await attendanceRepo.createAttendance({
                    employeeId: emp.employeeId,
                    status: '异常-缺勤',
                    recorder: 'SYSTEM_ABSENCE_CHECK',
                    recordTime: now,
                    reason: '超过14:00未打卡，系统自动判定缺勤'
                });
                count++;
            }
        }
        return { count };
    }

    /**
     * 【一键自动退勤】强制对所有打过卡的人进行退勤处理
     */
    async autoCheckoutAll() {
        // 仅针对 [正常上班] 且 [在办公室] 的员工进行自动判定
        const targetEmployees = await prisma.employee.findMany({
            where: {
                status: 'ACTIVE',
                dutyStatus: 'NORMAL',
                workLocation: 'OFFICE',
                deletedAt: null
            }
        });

        let count = 0;
        const now = new Date();
        for (const emp of targetEmployees) {
            const latest = await attendanceRepo.getLatestRecordToday(emp.employeeId);
            // 只有当前处于“出勤”状态的人才需要退勤
            if (latest?.status.startsWith('出勤')) {
                await this.createAttendance({
                    employeeId: emp.employeeId,
                    recorder: 'SYSTEM_AUTO_CHECKOUT',
                    action: 'AUTO'
                });
                count++;
            }
        }
        return { count };
    }

    async updateAttendance(id: string, status: string, operator: string, reason: string) {
        // 在新系统中，"更新"就是"追加一条由管理员指定的状态"
        // 我们需要先根据记录 ID 找到员工 ID
        const oldRecord = await prisma.attendance.findUnique({ where: { id } });
        if (!oldRecord) throw new Error('Record not found');

        return await this.createAttendance({
            employeeId: oldRecord.employeeId,
            recorder: operator,
            action: 'MANUAL',
            targetStatus: status,
            reason: reason
        });
    }

    async deleteAttendance(id: string, operator: string): Promise<boolean> {
        // 流水账系统原则上不允许删除，但由于是实验项目，我们暂时保留软删除逻辑
        try {
            await prisma.attendance.update({
                where: { id },
                data: { status: 'DELETED-' + operator }
            });
            return true;
        } catch {
            return false;
        }
    }
}

export const attendanceService = new AttendanceService();
