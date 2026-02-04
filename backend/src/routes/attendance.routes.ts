import { Router, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { attendanceService } from '../modules/attendance/attendance.service';
import { createAttendanceValidator, updateAttendanceValidator } from '../modules/attendance/attendance.validator';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Skill: rbac-check - 所有接口进行认证
router.use(authenticate);

// Helper for standard response format
const successResponse = (res: Response, data: any = null, message: string = 'Success') => {
    res.json({ success: true, data, message });
};

const errorResponse = (res: Response, error: any, code: number = 500) => {
    res.status(code).json({
        success: false,
        error: typeof error === 'string' ? error : undefined,
        message: typeof error === 'string' ? error : 'Operation failed',
        details: typeof error !== 'string' ? error : undefined
    });
};

const validate = (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return errorResponse(res, errors.array(), 400);
    }
    next();
};

// 1. 创建记录
router.post('/', requireRole(['admin', 'hr', 'manager']), createAttendanceValidator, validate, async (req: Request, res: Response) => {
    try {
        const record = await attendanceService.createAttendance({
            ...req.body,
            operator: req.user?.username
        });
        successResponse(res, record, 'Record created');
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 2. 修改记录
router.put('/:id', requireRole(['admin', 'hr']), updateAttendanceValidator, validate, async (req: Request, res: Response) => {
    try {
        await attendanceService.updateAttendance(
            req.params.id,
            req.body.status,
            req.user?.username || 'unknown',
            req.body.reason
        );
        successResponse(res, null, 'Record updated');
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 3. 统计数据
router.get('/dashboard/stats', async (req: Request, res: Response) => {
    try {
        const stats = await attendanceService.getDashboardStats();
        successResponse(res, stats);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 4. 异常列表
router.get('/exceptions', async (req: Request, res: Response) => {
    try {
        const date = req.query.date as string;
        const list = await attendanceService.getExceptionList(date);
        successResponse(res, list);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 5. 个人历史
router.get('/history/:employeeId', async (req: Request, res: Response) => {
    try {
        const history = await attendanceService.getEmployeeHistory(req.params.employeeId);
        successResponse(res, history);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 6. 审计日志
router.get('/audit/:recordId', async (req: Request, res: Response) => {
    try {
        const logs = await attendanceService.getAuditLogs(req.params.recordId);
        successResponse(res, logs);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 7. 软删除记录
router.delete('/:id', requireRole(['admin', 'hr']), async (req: Request, res: Response) => {
    try {
        const success = await attendanceService.deleteAttendance(req.params.id, req.user?.username || 'unknown');
        if (success) {
            successResponse(res, null, 'Record deleted');
        } else {
            errorResponse(res, 'Record not found', 404);
        }
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

export default router;
