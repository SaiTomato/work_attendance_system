import { Router, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { attendanceService } from '../modules/attendance/attendance.service';
import { createAttendanceValidator, updateAttendanceValidator } from '../modules/attendance/attendance.validator';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import prisma from '../db';

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

// 1. 生成打卡 Token (员工手机端调用 - 禁止终端账号调用)
router.get('/token', requireRole(['admin', 'manager', 'hr', 'viewer']), async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user?.id },
            include: { employee: true }
        });

        if (!user?.employee) return errorResponse(res, '未绑定员工', 400);

        // 生成一个包含时间戳的令牌 (简单加密示例)
        const timestamp = Date.now();
        const rawToken = `${user.employee.employeeId}|${timestamp}`;
        const encodedToken = Buffer.from(rawToken).toString('base64');

        successResponse(res, { token: encodedToken, expiresAt: timestamp + 30000 }, 'Token generated');
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 2. 扫描 Token 并打卡 (仅限终端设备或管理员)
router.post('/scan', requireRole(['terminal', 'admin']), async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        if (!token) return errorResponse(res, 'Token missing', 400);

        // 解码并校验时效
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [employeeId, timestampStr] = decoded.split('|');
        const timestamp = parseInt(timestampStr);

        if (Date.now() - timestamp > 30000) {
            return errorResponse(res, '打卡码已过期，请重新生成', 403);
        }

        const record = await attendanceService.createAttendance({
            employeeId,
            recorder: 'QR_SCANNER',
            action: 'PUNCH'
        });

        successResponse(res, record, '扫码打卡成功');
    } catch (error: any) {
        errorResponse(res, error.message, 403);
    }
});

// 3. 自助打卡 (遗留按钮接口 - 禁止终端账号)
router.post('/punch', requireRole(['admin', 'manager', 'hr', 'viewer']), async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user?.id },
            include: { employee: true }
        });

        if (!user?.employee) {
            return errorResponse(res, '尚未关联员工档案，无法打卡', 400);
        }

        const record = await attendanceService.createAttendance({
            employeeId: user.employee.employeeId,
            recorder: user.username,
            action: 'PUNCH'
        });

        successResponse(res, record, '打卡成功');
    } catch (error: any) {
        errorResponse(res, error.message, 403);
    }
});

// 4. 管理员手动创建记录 (需权限)
router.post('/', requireRole(['admin', 'hr', 'manager']), async (req: Request, res: Response) => {
    try {
        const record = await attendanceService.createAttendance({
            employeeId: req.body.employeeId,
            recorder: req.user?.username || 'admin',
            action: 'MANUAL',
            targetStatus: req.body.status,
            reason: req.body.reason
        });
        successResponse(res, record, 'Record created');
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 5. 修改记录
router.put('/:id', requireRole(['admin', 'hr']), async (req: Request, res: Response) => {
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

// 6. 统计数据 (管理层权限)
router.get('/dashboard/stats', requireRole(['admin', 'manager', 'hr']), async (req: Request, res: Response) => {
    try {
        const stats = await attendanceService.getDashboardStats();
        successResponse(res, stats);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 7. 详细记录列表
router.get('/list', requireRole(['admin', 'manager', 'hr']), async (req: Request, res: Response) => {
    try {
        const date = req.query.date as string;
        const filter = req.query.filter as string;
        const list = await attendanceService.getDailyRecords(date, filter);
        successResponse(res, list);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 7.5 今日流水日志 (日志流)
router.get('/logs/today', requireRole(['admin', 'manager', 'hr']), async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const result = await attendanceService.getAllLogsToday(page, limit);
        successResponse(res, result);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 8. 每日重置触发器 (Internal/Admin)
router.post('/reset', requireRole(['admin']), async (req: Request, res: Response) => {
    try {
        const result = await attendanceService.dailyReset();
        successResponse(res, result, 'System status reset for all active employees');
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 8.5 一键自动退勤触发器
router.post('/auto-checkout', requireRole(['admin']), async (req: Request, res: Response) => {
    try {
        const result = await attendanceService.autoCheckoutAll();
        successResponse(res, result, `Successfully processed auto-checkout for ${result.count} employees`);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 9. 个人历史
router.get('/history/:employeeId', async (req: Request, res: Response) => {
    try {
        const targetEmployeeId = req.params.employeeId;
        if (req.user?.role === 'viewer') {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: { employee: true }
            });
            if (user?.employee?.employeeId !== targetEmployeeId) {
                return errorResponse(res, '权限不足', 403);
            }
        }
        const history = await attendanceService.getEmployeeHistory(targetEmployeeId);
        successResponse(res, history);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 10. 获取单条记录的审计日志
router.get('/:id/audit', requireRole(['admin', 'hr', 'manager']), async (req: Request, res: Response) => {
    try {
        const logs = await attendanceService.getAuditLogs(req.params.id);
        successResponse(res, logs);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

export default router;
