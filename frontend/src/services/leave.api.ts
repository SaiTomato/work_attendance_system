import { api } from './api';

export const leaveApi = {
    /**
     * 提交请假申请
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
     * 获取我的请假历史
     */
    async getMyLeaves() {
        const response = await api.get('/leave/my');
        return response.data;
    },

    /**
     * 获取所有待审批
     */
    async getPendingLeaves() {
        const response = await api.get('/leave/pending');
        return response.data;
    },

    /**
     * 获取全系统已处理的历史（针对管理层）
     */
    async getAllProcessedHistory() {
        const response = await api.get('/leave/history');
        return response.data;
    },

    /**
     * 审批操作
     */
    async updateLeaveStatus(id: string, status: 'APPROVED' | 'REJECTED') {
        const response = await api.patch(`/leave/${id}/status`, { status });
        return response.data;
    },

    /**
     * 获取未读/待办数量通知
     */
    async getNotificationCount() {
        const response = await api.get('/leave/notifications');
        return response.data;
    },

    /**
     * 标记已读
     */
    async markAsRead() {
        const response = await api.post('/leave/mark-read');
        return response.data;
    }
};
