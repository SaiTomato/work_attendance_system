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
        // 1. 获取适用的规则
        const rule = await this.getApplicableRule(data.employeeId);

        // 2. 自动计算状态 (如果没有手动指定状态)
        if (!data.status && data.checkInTime) {
            data.status = AttendanceEngine.calculateStatus(new Date(data.checkInTime), rule);
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
