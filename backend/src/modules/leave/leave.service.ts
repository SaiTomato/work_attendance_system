import prisma from '../../db';
import { LeaveType, ApprovalStatus } from '@prisma/client';
import { attendanceService } from '../attendance/attendance.service';

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
     * 管理员获取所有已处理（批准/驳回）的历史记录 - ページネーション・ソート対応
     */
    async getAllProcessedRequests(filters?: {
        search?: string;
        page?: number;
        limit?: number;
        sortField?: string;
        sortOrder?: 'asc' | 'desc';
    }) {
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;
        const sortField = filters?.sortField || 'updatedAt';
        const sortOrder = filters?.sortOrder || 'desc';

        const where: any = {
            status: { in: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED] }
        };

        if (filters?.search) {
            where.OR = [
                { employee: { name: { contains: filters.search, mode: 'insensitive' } } },
                { employee: { employeeId: { contains: filters.search, mode: 'insensitive' } } },
                { reason: { contains: filters.search, mode: 'insensitive' } }
            ];
        }

        const total = await prisma.leaveRequest.count({ where });

        // ソート設定
        const orderBy: any = {};
        if (sortField === 'employeeName') {
            orderBy.employee = { name: sortOrder };
        } else {
            orderBy[sortField] = sortOrder;
        }

        const requests = await prisma.leaveRequest.findMany({
            where,
            include: { employee: true },
            orderBy,
            skip: (page - 1) * limit,
            take: limit
        });

        return { requests, total };
    },

    /**
     * 导出休暇申请/历史记录为 CSV
     */
    async exportLeavesCsv(filters?: { search?: string }) {
        // エクスポート時は全件取得するため大きなリミットを指定
        const { requests } = await this.getAllProcessedRequests({ ...filters, page: 1, limit: 10000 });

        const header = ['申請者ID', '氏名', 'タイプ', '開始日', '終了日', '理由', 'ステータス', '承認者'];
        const rows = requests.map((l: any) => [
            l.employee.employeeId,
            l.employee.name,
            l.type === 'PAID' ? '有給' : '無給',
            l.startDate.toISOString().split('T')[0],
            l.endDate.toISOString().split('T')[0],
            (l.reason || '').replace(/\n/g, ' '),
            l.status === 'APPROVED' ? '承認済' : '却下済',
            l.approvedBy || '-'
        ]);

        const csvContent = [
            "\ufeff" + header.join(','),
            ...rows.map((row: any[]) => row.map((cell: any) => {
                const str = String(cell || '');
                return `"${str.replace(/"/g, '""')}"`;
            }).join(','))
        ].join('\n');

        return {
            filename: `休暇申請履歴_${new Date().toISOString().split('T')[0]}.csv`,
            content: csvContent
        };
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
        const updated = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status,
                approvedBy
            }
        });

        // 如果审批通过，同步到考勤表
        if (status === ApprovalStatus.APPROVED) {
            try {
                await attendanceService.syncLeaveToAttendance(id);
            } catch (err) {
                console.error('Leave sync to attendance failed:', err);
            }
        }

        return updated;
    }
};
