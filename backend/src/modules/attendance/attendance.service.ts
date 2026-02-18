import { attendanceRepo } from './attendance.repo';
import { DailyStats, AttendanceRecord } from '../../types';
import { AttendanceEngine } from '../../services/attendanceEngine';
import prisma from '../../db';

export class AttendanceService {
    async getDailyRecords(dateStr?: string, filter?: string): Promise<AttendanceRecord[]> {
        const date = dateStr ? new Date(dateStr) : new Date();
        return await attendanceRepo.getDailyRecords(date, filter);
    }

    async getDashboardStats(): Promise<DailyStats> {
        const today = new Date();
        return await attendanceRepo.getDailyStats(today);
    }

    async getEmployeeHistory(employeeId: string): Promise<AttendanceRecord[]> {
        return await attendanceRepo.getEmployeeHistory(employeeId);
    }

    async getAuditLogs(recordId: string) {
        return await attendanceRepo.getAuditLogs(recordId);
    }

    /**
     * 创建考勤记录，自动计算状态
     */
    async createAttendance(data: any): Promise<AttendanceRecord> {
        // 1. 获取员工档案
        const employee = await prisma.employee.findUnique({
            where: { employeeId: data.employeeId }
        });

        if (!employee) throw new Error('Employee not found');

        // 2. 【核心新增】检测当前是否存在未处理的考勤异常
        // 如果是管理员/管理员手动补录，可能需要跳过此逻辑，但对于员工自助打卡必须拦截
        const anomaly = await attendanceRepo.getEmployeeAnomaly(data.employeeId);
        if (anomaly) {
            throw new Error(anomaly.message); // 抛出具体的异常信息给前端
        }

        const rule = await this.getApplicableRule(data.employeeId);

        // 3. 应用时间取整规则
        let roundedCheckIn = data.checkInTime ? new Date(data.checkInTime) : null;
        let roundedCheckOut = data.checkOutTime ? new Date(data.checkOutTime) : null;

        // 3.1 上班打卡：向上取整到15分钟（迟到惩罚）
        if (roundedCheckIn) {
            const [stdHour, stdMin] = rule.standardCheckIn.split(':').map(Number);
            const standardTime = new Date(roundedCheckIn);
            standardTime.setHours(stdHour, stdMin, 0, 0);

            // 只有迟到的情况才需要向上取整
            if (roundedCheckIn > standardTime) {
                roundedCheckIn = AttendanceEngine.ceilTo15Min(roundedCheckIn);
            } else {
                // 正常或早到，统一记录为标准时间
                roundedCheckIn = standardTime;
            }
        }

        // 3.2 下班打卡：向下取整到15分钟（早退惩罚）
        if (roundedCheckOut) {
            const [stdHour, stdMin] = rule.standardCheckOut.split(':').map(Number);
            const standardTime = new Date(roundedCheckOut);
            standardTime.setHours(stdHour, stdMin, 0, 0);

            // 只有早退的情况才需要向下取整
            if (roundedCheckOut < standardTime) {
                roundedCheckOut = AttendanceEngine.floorTo15Min(roundedCheckOut);
            } else {
                // 正常或加班，统一记录为标准时间
                roundedCheckOut = standardTime;
            }
        }

        // 4. 自动计算状态 (如果没有手动指定状态)
        if (!data.status) {
            data.status = AttendanceEngine.calculateStatus(roundedCheckIn, roundedCheckOut, rule, employee);
        }

        // 5. 计算工时
        const workHours = AttendanceEngine.calculateWorkHours(roundedCheckIn, roundedCheckOut, data.status);

        // 6. 更新数据对象
        data.checkInTime = roundedCheckIn;
        data.checkOutTime = roundedCheckOut;
        data.workHours = workHours;

        return await attendanceRepo.createAttendance(data, data.operator || 'SYSTEM');
    }

    async updateAttendance(id: string, status: string, operator: string, reason: string): Promise<void> {
        // 1. 处理虚拟 ID (例如: missing-EMP001, leave-EMP001, wait-EMP001)
        if (id.includes('-')) {
            const employeeId = id.split('-')[1];
            const date = new Date().toISOString().split('T')[0];

            // 获取员工信息用于补录
            const employee = await prisma.employee.findUnique({ where: { employeeId } });
            if (!employee) throw new Error('Employee not found');

            // 如果管理员将其修正为 "正常"，则自动补全上班时间 (否则扫码端依然会拦截)
            let checkInTime = null;
            if (status === 'present' || status === 'late') {
                const rule = await this.getApplicableRule(employeeId);
                const [h, m] = rule.standardCheckIn.split(':').map(Number);
                const baseDate = new Date();
                baseDate.setHours(h, m, 0, 0);
                checkInTime = baseDate;
            }

            await attendanceRepo.createAttendance({
                employeeId,
                employeeName: employee.name,
                date,
                status,
                checkInTime,
                operator
            }, operator);

            return;
        }

        // 2. 原有的更新逻辑
        await attendanceRepo.updateAttendance(id, status, operator, reason);
    }

    async deleteAttendance(id: string, operator: string): Promise<boolean> {
        return await attendanceRepo.deleteAttendance(id, operator);
    }

    /**
     * 获取适用于该员工的考勤规则
     * 优先级: 个人 -> 部门 -> 全局默认
     */
    private async getApplicableRule(employeeId: string) {
        const employee = await prisma.employee.findUnique({
            where: { employeeId },
            include: {
                rules: { where: { isDefault: false }, take: 1 },
                department: {
                    include: { rules: { where: { isDefault: false }, take: 1 } }
                }
            }
        });

        if (employee?.rules?.[0]) return employee.rules[0];
        if (employee?.department?.rules?.[0]) return employee.department.rules[0];

        // 最后的降级：全局默认规则
        const defaultRule = await prisma.attendanceRule.findFirst({
            where: { isDefault: true }
        });

        if (!defaultRule) {
            throw new Error('No attendance rules configured in the system');
        }

        return defaultRule;
    }

    async syncLeaveToAttendance(leaveId: string) {
        const leave = await prisma.leaveRequest.findUnique({
            where: { id: leaveId },
            include: { employee: true }
        });

        if (!leave || leave.status !== 'APPROVED') return;

        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);

        // 遍历请假期间的每一天
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];

            const existing = await prisma.attendance.findFirst({
                where: {
                    employeeId: leave.employeeId,
                    date: dateStr,
                    deletedAt: null
                }
            });

            if (!existing) {
                // 如果当天没有记录，直接创建一个 leave 状态的考勤
                await attendanceRepo.createAttendance({
                    employeeId: leave.employeeId,
                    employeeName: leave.employee.name,
                    date: dateStr,
                    status: 'leave',
                }, 'SYSTEM_LEAVE_SYNC');
            } else if (existing.status === 'absent' || existing.status === 'late') {
                // 如果原本是缺勤/迟到（可能是先判定的异常），修正为 leave
                await attendanceRepo.updateAttendance(existing.id, 'leave', 'SYSTEM_LEAVE_SYNC', 'Leave ApprovedSync');
            }
        }
    }
}

export const attendanceService = new AttendanceService();
