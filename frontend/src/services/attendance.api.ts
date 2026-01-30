import { ApiResponse, DashboardStats, AttendanceRecord } from '../types';

// 强制硬编码测试，排除环境变量注入失败的干扰
const API_URL = 'http://localhost:3000';

/**
 * 通用的请求处理函数
 */
async function apiRequest<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const fullUrl = `${API_URL}${path}`;
    console.log(`[Frontend] Fetching: ${fullUrl}`);
    try {
        const response = await fetch(fullUrl, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: `Network error when calling ${fullUrl}` };
    }
}

// 1. 获取仪表盘统计 - 现在去问后端拿真数据！
export const fetchDashboardStats = async (): Promise<ApiResponse<DashboardStats>> => {
    return apiRequest<DashboardStats>('/api/attendance/dashboard/stats');
};

// 2. 获取异常列表 - 同样去问后端！
export const fetchExceptions = async (date?: string): Promise<ApiResponse<AttendanceRecord[]>> => {
    return apiRequest<AttendanceRecord[]>('/api/attendance/exceptions');
};

// 3. 修改状态
export const updateAttendanceStatus = async (id: string, status: string, reason: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/api/attendance/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, reason }),
    });
};

// 4. 删除记录
export const deleteAttendanceRecord = async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/api/attendance/${id}`, {
        method: 'DELETE',
    });
};
