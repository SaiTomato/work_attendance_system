import prisma from '../../db';
import { LeaveType, ApprovalStatus } from '@prisma/client';

export const leaveService = {
    /**
     * 员工提交申请
     */
    async createRequest(data: {
        employeeId: string;
        type: LeaveType;
        startDate: string;
        endDate: string;
        reason?: string;
    }) {
        return await prisma.leaveRequest.create({
            data: {
                employeeId: data.employeeId,
                type: data.type,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                reason: data.reason,
                status: ApprovalStatus.PENDING
            }
        });
    },

    /**
     * 获取员工个人的申请历史
     */
    async getEmployeeRequests(employeeId: string) {
        return await prisma.leaveRequest.findMany({
            where: { employeeId },
            orderBy: { createdAt: 'desc' }
        });
    },

    /**
     * 管理员获取所有待审批申请
     */
    async getPendingRequests() {
        return await prisma.leaveRequest.findMany({
            where: { status: ApprovalStatus.PENDING },
            include: { employee: true },
            orderBy: { createdAt: 'asc' }
        });
    },

    /**
     * 管理员获取所有已处理（批准/驳回）的历史记录
     */
    async getAllProcessedRequests() {
        return await prisma.leaveRequest.findMany({
            where: {
                status: { in: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED] }
            },
            include: { employee: true },
            orderBy: { updatedAt: 'desc' }
        });
    },

    /**
     * 获取管理层待审批数量
     */
    async getPendingCount() {
        return await prisma.leaveRequest.count({
            where: { status: ApprovalStatus.PENDING }
        });
    },

    /**
     * 获取员工未读的审批结果数量
     */
    async getUnreadCount(employeeId: string) {
        return await prisma.leaveRequest.count({
            where: {
                employeeId,
                status: { in: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED] },
                isReadByEmployee: false
            }
        });
    },

    /**
     * 标记员工的所有已处理请求为已读
     */
    async markAsRead(employeeId: string) {
        return await prisma.leaveRequest.updateMany({
            where: {
                employeeId,
                status: { in: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED] },
                isReadByEmployee: false
            },
            data: { isReadByEmployee: true }
        });
    },

    /**
     * 审批申请
     */
    async updateStatus(id: string, status: ApprovalStatus, approvedBy: string) {
        return await prisma.leaveRequest.update({
            where: { id },
            data: {
                status,
                approvedBy
            }
        });
    }
};
