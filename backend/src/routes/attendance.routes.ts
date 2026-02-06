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
            return errorResponse(res, '打卡码已过期，请重新生成 (Code expired)', 403);
        }

        // 查找员工并执行打卡逻辑 (复用 createAttendance 包含 Anomaly 拦截)
        const employee = await prisma.employee.findUnique({ where: { employeeId } });
        if (!employee) return errorResponse(res, 'Employee not found', 404);

        const record = await attendanceService.createAttendance({
            employeeId,
            employeeName: employee.name,
            date: new Date().toISOString().split('T')[0],
            operator: 'QR_SCANNER'
        });

        successResponse(res, record, '扫码打卡成功');
    } catch (error: any) {
        // 如果触发了 Anomaly 拦截，error.message 会通过这里返回给扫码设备
        errorResponse(res, error.message, 403);
    }
});

// 3. 自助打卡 (遗留按钮接口 - 禁止终端账号)
router.post('/punch', requireRole(['admin', 'manager', 'hr', 'viewer']), async (req: Request, res: Response) => {
    try {
        // 通过关联的 User 找到对应的 EmployeeID
        const user = await prisma.user.findUnique({
            where: { id: req.user?.id },
            include: { employee: true }
        });

        if (!user?.employee) {
            return errorResponse(res, '尚未关联员工档案，无法打卡', 400);
        }

        const record = await attendanceService.createAttendance({
            employeeId: user.employee.employeeId,
            employeeName: user.employee.name,
            date: new Date().toISOString().split('T')[0],
            checkInTime: new Date().toISOString(),
            operator: req.user?.username
        });

        successResponse(res, record, '打卡成功');
    } catch (error: any) {
        // 如果后端 throw 了 anomaly.message，这里会捕获并返回给前端
        errorResponse(res, error.message, 403);
    }
});

// 2. 管理员手动创建记录 (需权限)
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

// 3. 修改记录
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

// 4. 统计数据 (管理层权限)
router.get('/dashboard/stats', requireRole(['admin', 'manager', 'hr']), async (req: Request, res: Response) => {
    try {
        const stats = await attendanceService.getDashboardStats();
        successResponse(res, stats);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 5. 异常列表 (管理层权限)
router.get('/exceptions', requireRole(['admin', 'manager', 'hr']), async (req: Request, res: Response) => {
    try {
        const date = req.query.date as string;
        const list = await attendanceService.getExceptionList(date);
        successResponse(res, list);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 6. 个人历史 (本人或管理层)
router.get('/history/:employeeId', async (req: Request, res: Response) => {
    try {
        const targetEmployeeId = req.params.employeeId;

        // 如果是普通员工，校验是否是看自己的
        if (req.user?.role === 'viewer') {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: { employee: true }
            });
            if (user?.employee?.employeeId !== targetEmployeeId) {
                return errorResponse(res, '权限不足：无法查看他人考勤记录', 403);
            }
        }

        // 禁止终端账号查看任何历史
        if (req.user?.role === 'terminal') {
            return errorResponse(res, '权限不足：终端账号无法查看历史', 403);
        }

        const history = await attendanceService.getEmployeeHistory(targetEmployeeId);
        successResponse(res, history);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 7. 审计日志 (Admin/HR 权限)
router.get('/audit/:recordId', requireRole(['admin', 'hr']), async (req: Request, res: Response) => {
    try {
        const logs = await attendanceService.getAuditLogs(req.params.recordId);
        successResponse(res, logs);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 8. 软删除记录
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
