import { api } from './api';
import { ApiResponse, DailyStats, AttendanceRecord } from '../types';

/**
 * 获取仪表盘统计 - 使用封装好的 axios 实例，自动处理 Token 和端口
 */
export const fetchDashboardStats = async (): Promise<ApiResponse<DailyStats>> => {
    const res = await api.get('/attendance/dashboard/stats');
    return res.data;
};

/**
 * 获取异常列表
 */
export const fetchExceptions = async (date?: string): Promise<ApiResponse<AttendanceRecord[]>> => {
    const res = await api.get('/attendance/exceptions', {
        params: { date }
    });
    return res.data;
};

/**
 * 为单个员工获取历史记录 (之前 Service 缺失的逻辑)
 */
export const fetchEmployeeHistory = async (employeeId: string): Promise<ApiResponse<AttendanceRecord[]>> => {
    const res = await api.get(`/attendance/history/${employeeId}`);
    return res.data;
};

/**
 * 修改考勤状态
 */
export const updateAttendanceStatus = async (id: string, status: string, reason: string): Promise<ApiResponse<void>> => {
    const res = await api.put(`/attendance/${id}`, { status, reason });
    return res.data;
};

/**
 * 自助打卡 (Punch In/Out)
 */
export const punchAttendance = async (): Promise<ApiResponse<AttendanceRecord>> => {
    const res = await api.post('/attendance/punch');
    return res.data;
};

/**
 * 获取打卡令牌 (30秒有效)
 */
export const fetchPunchToken = async (): Promise<ApiResponse<{ token: string, expiresAt: number }>> => {
    const res = await api.get('/attendance/token');
    return res.data;
};

/**
 * 扫描并提交 Token (扫码端口使用)
 */
export const scanPunchToken = async (token: string): Promise<ApiResponse<AttendanceRecord>> => {
    const res = await api.post('/attendance/scan', { token });
    return res.data;
};

/**
 * 删除考勤记录
 */
export const deleteAttendanceRecord = async (id: string): Promise<ApiResponse<void>> => {
    const res = await api.delete(`/attendance/${id}`);
    return res.data;
};
