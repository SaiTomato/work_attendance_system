
import { ApiResponse, DashboardStats, AttendanceRecord, AuditLog } from '../types';
// import { api } from './api'; // 假设通用 api 已存在，这里先mock或直接写 fetch

// Skill: frontend-admin-view - 数据由后端提供
export const fetchDashboardStats = async (): Promise<ApiResponse<DashboardStats>> => {
    // 占位：实际调用后端 API
    // const response = await api.get('/attendance/dashboard/stats');
    // return response.data;

    // Mock return for skeleton
    return Promise.resolve({
        success: true,
        data: {
            date: new Date().toISOString().split('T')[0],
            totalEmployees: 100,
            present: 85,
            late: 5,
            absent: 2,
            leave: 3,
            exceptions: 5 // Skill: frontend-admin-view - 重点展示对象
        }
    });
};

export const fetchExceptions = async (date?: string): Promise<ApiResponse<AttendanceRecord[]>> => {
    // 占位：实际调用后端 API
    // const response = await api.get('/attendance/exceptions', { params: { date } });

    // Mock return
    return Promise.resolve({
        success: true,
        data: [
            { id: '1', employeeId: 'EMP-001', employeeName: '张三', date: '2023-10-27', status: 'late', checkInTime: '09:45:00' },
            { id: '2', employeeId: 'EMP-005', employeeName: '李四', date: '2023-10-27', status: 'absent' }
        ]
    });
};

export const fetchEmployeeHistory = async (employeeId: string): Promise<ApiResponse<AttendanceRecord[]>> => {
    // Mock
    return Promise.resolve({
        success: true,
        data: [
            { id: '101', employeeId, employeeName: '张三', date: '2023-10-27', status: 'present', checkInTime: '08:55', checkOutTime: '18:00' },
            { id: '102', employeeId, employeeName: '张三', date: '2023-10-26', status: 'late', checkInTime: '09:15', checkOutTime: '18:05' },
            { id: '103', employeeId, employeeName: '张三', date: '2023-10-25', status: 'present', checkInTime: '08:58', checkOutTime: '18:00' },
        ]
    });
};

export const fetchAuditLogs = async (recordId: string): Promise<ApiResponse<AuditLog[]>> => {
    // Mock
    return Promise.resolve({
        success: true,
        data: [
            {
                id: 'log-1',
                targetId: recordId,
                action: 'create',
                after: { status: 'present' },
                operatedBy: 'system',
                operatedAt: '2023-10-27T08:30:00Z'
            }
        ]
    });
};

export const updateAttendanceStatus = async (id: string, status: string, reason: string): Promise<ApiResponse<void>> => {
    // 占位：实际调用后端 API
    // await api.put(`/attendance/${id}`, { status, reason });
    console.log(`[Mock API] Updating ${id} to ${status} because: ${reason}`);
    return Promise.resolve({ success: true });
};

export const deleteAttendanceRecord = async (id: string): Promise<ApiResponse<void>> => {
    // 占位：实际调用后端 API
    // await api.delete(`/attendance/${id}`);
    console.log(`[Mock API] Deleting record: ${id}`);
    return Promise.resolve({ success: true });
};
