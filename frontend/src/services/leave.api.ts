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
     * 全システムの処理済み履歴を取得（管理職用 - ページネーション対応）
     */
    async getAllProcessedHistory(filters: {
        search?: string,
        page?: number,
        limit?: number,
        sortField?: string,
        sortOrder?: 'asc' | 'desc'
    } = {}) {
        const response = await api.get('/leave/history', { params: filters });
        return response.data;
    },

    /**
     * 履歴を CSV としてダウンロード
     */
    async downloadLeaveHistoryCsv(searchTerm?: string) {
        const res = await api.get('/leave/history/export', {
            params: { search: searchTerm },
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `leave_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
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
