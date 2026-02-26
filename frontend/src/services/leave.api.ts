import { api } from './api';

export const leaveApi = {
    /**
     * 休暇申請の提出
     */
    async submitRequest(data: {
        type: 'PAID' | 'UNPAID';
        startDate: string;
        endDate: string;
        reason?: string;
    }) {
        const response = await api.post('/leave', data);
        return response.data;
    },

    /**
     * 自分の休暇申請履歴を取得
     */
    async getMyLeaves() {
        const response = await api.get('/leave/my');
        return response.data;
    },

    /**
     * 全ての承認待ち申請を取得
     */
    async getPendingLeaves() {
        const response = await api.get('/leave/pending');
        return response.data;
    },

    /**
     * 全システムの処理済み履歴を取得（管理職用）
     */
    async getAllProcessedHistory() {
        const response = await api.get('/leave/history');
        return response.data;
    },

    /**
     * 承認操作
     */
    async updateLeaveStatus(id: string, status: 'APPROVED' | 'REJECTED') {
        const response = await api.patch(`/leave/${id}/status`, { status });
        return response.data;
    },

    /**
     * 未読・承認待ち件数の通知を取得
     */
    async getNotificationCount() {
        const response = await api.get('/leave/notifications');
        return response.data;
    },

    /**
     * 既読としてマーク
     */
    async markAsRead() {
        const response = await api.post('/leave/mark-read');
        return response.data;
    }
};
