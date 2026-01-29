
import { DailyStats, AttendanceRecord } from '../../types';

export class AttendanceRepo {
    // 占位：实际应该连接数据库查询

    async getExceptions(date: Date): Promise<AttendanceRecord[]> {
        console.log(`[Repo] Fetching exceptions for ${date.toISOString()}`);
        // Mock data for exceptions
        return [
            {
                id: '1',
                employeeId: 'EMP-001',
                employeeName: '张三',
                date: date.toISOString().split('T')[0],
                status: 'late',
                checkInTime: '09:45:00'
            },
            {
                id: '2',
                employeeId: 'EMP-005',
                employeeName: '李四',
                date: date.toISOString().split('T')[0],
                status: 'absent'
            }
        ];
    }

    async getHistoryByEmployee(employeeId: string): Promise<AttendanceRecord[]> {
        console.log(`[Repo] Fetching history for ${employeeId}`);
        // Mock data
        return [
            { id: '101', employeeId, employeeName: '张三', date: '2023-10-27', status: 'present', checkInTime: '08:55' },
            { id: '102', employeeId, employeeName: '张三', date: '2023-10-26', status: 'late', checkInTime: '09:15' },
            { id: '103', employeeId, employeeName: '张三', date: '2023-10-25', status: 'present', checkInTime: '08:58' },
        ];
    }

    async save(record: AttendanceRecord): Promise<void> {
        console.log('[Repo] Saving record:', record);
        // Mock DB insert
    }

    async update(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | null> {
        console.log(`[Repo] Updating record ${id}:`, updates);
        // Mock DB update & return new record
        return {
            id,
            employeeId: 'EMP-MOCK',
            employeeName: 'Mock User',
            date: '2023-10-27',
            status: updates.status as any || 'present',
            ...updates
        } as AttendanceRecord;
    }

    async getRecordById(id: string): Promise<AttendanceRecord | null> {
        // Mock fetch for audit 'before' state
        return {
            id,
            employeeId: 'EMP-MOCK',
            employeeName: 'Mock User',
            date: '2023-10-27',
            status: 'absent', // Mocking current state as absent
            checkInTime: undefined
        };
    }

    async getDailyStats(date: Date): Promise<DailyStats> {
        console.log(`[Repo] Fetching stats for ${date.toISOString()}`);
        return {
            date: date.toISOString().split('T')[0],
            totalEmployees: 0,
            present: 0,
            late: 0,
            absent: 0,
            leave: 0,
            exceptions: 0
        };
    }
}

export const attendanceRepo = new AttendanceRepo();
