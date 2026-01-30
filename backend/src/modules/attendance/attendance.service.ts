import { attendanceRepo } from './attendance.repo';
import { DailyStats, AttendanceRecord } from '../../types';

export class AttendanceService {
    async getExceptionList(dateStr?: string): Promise<AttendanceRecord[]> {
        const date = dateStr ? new Date(dateStr) : new Date();
        return await attendanceRepo.getExceptions(date);
    }

    async getDashboardStats(): Promise<DailyStats> {
        const today = new Date();
        return await attendanceRepo.getDailyStats(today);
    }

    /**
     * 实现修改逻辑
     */
    async updateAttendance(id: string, status: string, operator: string, reason: string): Promise<void> {
        console.log(`[Service] Updating record ${id} to ${status} by ${operator} for reason: ${reason}`);
        await attendanceRepo.updateAttendance(id, status, operator, reason);
    }

    /**
     * 给其他的 API 留个位子
     */
    async deleteAttendance(id: string, operator: string): Promise<boolean> {
        return await attendanceRepo.deleteAttendance(id, operator);
    }
}

export const attendanceService = new AttendanceService();
