
import { Router, Request, Response } from 'express';
// @ts-ignore
import { validationResult } from 'express-validator';
import { attendanceService } from '../modules/attendance/attendance.service';
import { createAttendanceValidator, updateAttendanceValidator } from '../modules/attendance/attendance.validator';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { attendanceRepo } from '../modules/attendance/attendance.repo';

const router = Router();

// Skill: rbac-check - 所有接口(除可能公开的)进行认证
router.use(authenticate);

// Helper for validation check
const validate = (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array() });
    }
    next();
};

router.post('/', requireRole(['admin', 'hr', 'manager']), createAttendanceValidator, validate, async (req: Request, res: Response) => {
    try {
        // Mock operator from Auth middleware
        await attendanceService.createAttendance({
            ...req.body,
            operator: req.user?.username || 'unknown'
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to create record' });
    }
});

router.put('/:id', requireRole(['admin', 'hr']), updateAttendanceValidator, validate, async (req: Request, res: Response) => {
    try {
        // Skill: attendance-api-create - 必须处理 validationResult (handled by validate middleware)
        await attendanceService.updateAttendance(
            req.params.id,
            req.body.status,
            req.user?.username || 'unknown',
            req.body.reason
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update record' });
    }
});

// Skill: rbac-check - 将来这里必须添加权限校验中间件
router.get('/dashboard/stats', async (req: Request, res: Response) => {
    try {
        const stats = await attendanceService.getDashboardStats();
        // Skill: attendance-api-create - 统一响应格式
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard stats'
        });
    }
});

// Skill: rbac-check - 此接口应仅对 Manager/Admin/HR 开放
router.get('/exceptions', async (req: Request, res: Response) => {
    try {
        const date = req.query.date as string;
        const list = await attendanceService.getExceptionList(date);
        res.json({
            success: true,
            data: list
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch exception list'
        });
    }
});

router.get('/history/:employeeId', async (req: Request, res: Response) => {
    try {
        const history = await attendanceService.getEmployeeHistory(req.params.employeeId);
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
});

router.get('/audit/:recordId', async (req: Request, res: Response) => {
    try {
        const logs = await attendanceService.getAuditLogs(req.params.recordId);
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
    }
});

// 4. 删除出席记录 (仅限 Admin/HR)
// Skill: rbac-check & audit-log-required
router.delete('/:id', authenticate, requireRole(['admin', 'hr']), async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const operator = req.user.username; // 从身份证明（Token）里拿人名，不怕伪造

        const success = await attendanceRepo.deleteAttendance(id, operator);

        if (success) {
            res.json({ success: true, message: 'Record deleted successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Record not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
