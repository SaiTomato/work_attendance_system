import { Router, Request, Response } from 'express';
import { leaveService } from '../modules/leave/leave.service';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import prisma from '../db';

const router = Router();

// 所有接口都需要认证
router.use(authenticate);

/**
 * 1. 员工提交请假申请
 * 角色限制: 严格限制为 viewer 角色 (因为管理账号不应绑定员工号)
 */
router.post('/', requireRole(['viewer']), async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user?.id },
            include: { employee: true }
        });

        if (!user?.employee) {
            return res.status(400).json({ success: false, message: '従業員データに関連付けられていないため、申請できません' });
        }

        const { type, startDate, endDate, reason } = req.body;

        const request = await leaveService.createRequest({
            employeeId: user.employee.employeeId,
            type,
            startDate,
            endDate,
            reason
        });

        res.json({ success: true, data: request, message: '申請を受け付けました' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 2. 获取当前员工的请假历史
 * 仅限 viewer 角色
 */
router.get('/my', requireRole(['viewer']), async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user?.id },
            include: { employee: true }
        });

        if (!user?.employee) {
            return res.status(400).json({ success: false, message: '従業員が紐付けられていません' });
        }

        const list = await leaveService.getEmployeeRequests(user.employee.employeeId);
        res.json({ success: true, data: list });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 2.1 获取未读/待办数量通知
 */
router.get('/notifications', async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user?.id },
            include: { employee: true }
        });

        let count = 0;
        const role = req.user?.role || '';

        if (['admin', 'manager', 'hr'].includes(role)) {
            count = await leaveService.getPendingCount();
        } else if (role === 'viewer' && user?.employee) {
            count = await leaveService.getUnreadCount(user.employee.employeeId);
        }

        res.json({ success: true, data: { count } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 2.2 标记已读
 */
router.post('/mark-read', requireRole(['viewer']), async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user?.id },
            include: { employee: true }
        });

        if (user?.employee) {
            await leaveService.markAsRead(user.employee.employeeId);
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 3. 获取所有待审批申请 (管理层)
 */
router.get('/pending', requireRole(['admin', 'manager', 'hr']), async (req: Request, res: Response) => {
    try {
        const list = await leaveService.getPendingRequests();
        res.json({ success: true, data: list });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 4. 获取全系统已处理的历史记录 (管理层)
 */
router.get('/history', requireRole(['admin', 'manager', 'hr']), async (req: Request, res: Response) => {
    try {
        const list = await leaveService.getAllProcessedRequests();
        res.json({ success: true, data: list });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 5. 审批申请 (管理层)
 */
router.patch('/:id/status', requireRole(['admin', 'manager', 'hr']), async (req: Request, res: Response) => {
    try {
        const { status } = req.body; // APPROVED or REJECTED
        const operator = req.user?.username || 'SYSTEM';

        const updated = await leaveService.updateStatus(req.params.id, status, operator);
        res.json({ success: true, data: updated, message: `申請を${status === 'APPROVED' ? '承認' : '却下'}しました` });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
