import { attendanceRepo } from './attendance.repo';
import { DailyStats, AttendanceRecord } from '../../types';
import { AttendanceEngine } from '../../services/attendanceEngine';
import prisma from '../../db';

export class AttendanceService {
    async getExceptionList(dateStr?: string): Promise<AttendanceRecord[]> {
        const date = dateStr ? new Date(dateStr) : new Date();
        return await attendanceRepo.getExceptions(date);
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

        // 3. 自动计算状态 (如果没有手动指定状态)
        if (!data.status) {
            const checkInDate = data.checkInTime ? new Date(data.checkInTime) : null;
            data.status = AttendanceEngine.calculateStatus(checkInDate, rule, employee);
        }

        return await attendanceRepo.createAttendance(data, data.operator || 'SYSTEM');
    }

    async updateAttendance(id: string, status: string, operator: string, reason: string): Promise<void> {
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
}

export const attendanceService = new AttendanceService();
