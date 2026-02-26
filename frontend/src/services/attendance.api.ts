import { api } from './api';
import { ApiResponse, DailyStats, AttendanceRecord, AuditLog } from '../types';

/**
 * ダッシュボード統計の取得
 */
export const fetchDashboardStats = async (): Promise<ApiResponse<DailyStats>> => {
    const res = await api.get('/attendance/dashboard/stats');
    return res.data;
};

/**
 * 勤怠一覧の取得 (フィルター対応)
 */
export const fetchAttendanceList = async (date?: string, filter?: string): Promise<ApiResponse<AttendanceRecord[]>> => {
    const res = await api.get('/attendance/list', {
        params: { date, filter }
    });
    return res.data;
};

/**
 * 本日のリアルタイムログストリームの取得
 */
export const fetchDailyLogsToday = async (page: number = 1, limit: number = 10, search?: string): Promise<ApiResponse<{ logs: AttendanceRecord[], total: number }>> => {
    const res = await api.get('/attendance/logs/today', {
        params: { page, limit, search }
    });
    return res.data;
};

/**
 * 特定従業員の履歴データの取得
 */
export const fetchEmployeeHistory = async (employeeId: string): Promise<ApiResponse<AttendanceRecord[]>> => {
    const res = await api.get(`/attendance/history/${employeeId}`);
    return res.data;
};

/**
 * 勤怠ステータスの更新
 */
export const updateAttendanceStatus = async (id: string, status: string, reason: string): Promise<ApiResponse<void>> => {
    const res = await api.put(`/attendance/${id}`, { status, reason });
    return res.data;
};

/**
 * 打刻の実行 (出勤/退勤)
 */
export const punchAttendance = async (): Promise<ApiResponse<AttendanceRecord>> => {
    const res = await api.post('/attendance/punch');
    return res.data;
};

/**
 * 打刻トークンの取得 (30秒有効)
 */
export const fetchPunchToken = async (): Promise<ApiResponse<{ token: string, expiresAt: number }>> => {
    const res = await api.get('/attendance/token');
    return res.data;
};

/**
 * トークンのスキャンと打刻の実行 (QRスキャナー用)
 */
export const scanPunchToken = async (token: string): Promise<ApiResponse<AttendanceRecord>> => {
    const res = await api.post('/attendance/scan', { token });
    return res.data;
};

/**
 * 勤怠記録の削除
 */
export const deleteAttendanceRecord = async (id: string): Promise<ApiResponse<void>> => {
    const res = await api.delete(`/attendance/${id}`);
    return res.data;
};

/**
 * システム全員のステータスリセット (未出勤化)
 */
export const triggerDailyReset = async (): Promise<ApiResponse<{ count: number }>> => {
    const res = await api.post('/attendance/reset');
    return res.data;
};

/**
 * システム全員の自動退勤実行
 */
export const triggerAutoCheckout = async (): Promise<ApiResponse<{ count: number }>> => {
    const res = await api.post('/attendance/auto-checkout');
    return res.data;
};

/**
 * 勤怠記録の監査ログ取得
 */
export const fetchAuditLogs = async (id: string): Promise<ApiResponse<AuditLog[]>> => {
    const res = await api.get(`/attendance/${id}/audit`);
    return res.data;
};

/**
 * 勤怠レポートのダウンロード (CSV)
 */
export const downloadAttendanceReport = async (startDate?: string, endDate?: string, search?: string): Promise<void> => {
    const res = await api.get('/attendance/export', {
        params: { startDate, endDate, search },
        responseType: 'blob'
    });

    const contentDisposition = res.headers['content-disposition'];
    let filename = `勤怠データ出力_${new Date().toISOString().split('T')[0]}.csv`;

    if (contentDisposition) {
        const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (filenameStarMatch) {
            filename = decodeURIComponent(filenameStarMatch[1]);
        } else {
            const filenameMatch = contentDisposition.match(/filename="?([^;"]+)"?/i);
            if (filenameMatch) {
                filename = decodeURIComponent(filenameMatch[1]);
            }
        }
    }

    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.replace(/"/g, ''));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
