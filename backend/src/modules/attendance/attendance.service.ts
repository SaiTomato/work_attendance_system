
import { attendanceRepo } from './attendance.repo';
import { attendanceAudit } from './attendance.audit';
import { DailyStats, AttendanceRecord, AuditLog } from '../../types';

export class AttendanceService {
    async getEmployeeHistory(employeeId: string): Promise<AttendanceRecord[]> {
        return await attendanceRepo.getHistoryByEmployee(employeeId);
    }

    async getAuditLogs(recordId: string): Promise<AuditLog[]> {
        return await attendanceAudit.getLogsByTargetId(recordId);
    }

    async getAuditLogs(recordId: string): Promise<AuditLog[]> {
        return await attendanceAudit.getLogsByTargetId(recordId);
    }

    async createAttendance(data: Omit<AttendanceRecord, 'id'> & { source: string, operator: string }): Promise<void> {
        const newRecord = { ...data, id: Math.random().toString(36).substr(2, 9) };

        // 1. Repo Save
        await attendanceRepo.save(newRecord);

        // 2. Audit Log (Skill: audit-log-required)
        await attendanceAudit.log({
            targetId: newRecord.id,
            action: 'create',
            after: newRecord,
            operatedBy: data.operator
        });
    }

    async updateAttendance(id: string, status: string, operator: string, reason: string): Promise<void> {
        // 1. Fetch current for Audit 'Before'
        const current = await attendanceRepo.getRecordById(id);
        if (!current) throw new Error('Record not found');

        // 2. Repo Update
        const updated = await attendanceRepo.update(id, { status: status as any });

        // 3. Audit Log (Skill: audit-log-required)
        await attendanceAudit.log({
            targetId: id,
            action: 'update',
            before: { status: current.status },
            after: { status: updated?.status, reason },
            operatedBy: operator
        });
    }

    async getExceptionList(dateStr?: string): Promise<AttendanceRecord[]> {
        // Skill: attendance-status-calc - 业务逻辑层处理日期默认值
        const date = dateStr ? new Date(dateStr) : new Date();
        return await attendanceRepo.getExceptions(date);
    }

    async getDashboardStats(): Promise<DailyStats> {
        const today = new Date();
        // 业务逻辑：这里将来会处理缓存、跨时区日期确定等
        // Skill: attendance-status-calc (状态计算逻辑应在此处，统计也是一种计算)
        return await attendanceRepo.getDailyStats(today);
    }
}

export const attendanceService = new AttendanceService();
