import { Router, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { attendanceService } from '../modules/attendance/attendance.service';
import { createAttendanceValidator, updateAttendanceValidator } from '../modules/attendance/attendance.validator';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import prisma from '../db';

const router = Router();

// すべてのインターフェースで認証が必要
router.use(authenticate);

// 標準レスポンスフォーマットのヘルパー
const successResponse = (res: Response, data: any = null, message: string = 'Success') => {
    res.json({ success: true, data, message });
};

const errorResponse = (res: Response, error: any, code: number = 500) => {
    res.status(code).json({
        success: false,
        error: typeof error === 'string' ? error : undefined,
        message: typeof error === 'string' ? error : '操作に失敗しました',
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

// 1. 打刻トークンの生成 (従業員モバイル端用 - 端末用アカウントは利用不可)
router.get('/token', requireRole(['admin', 'manager', 'hr', 'viewer']), async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user?.id },
            include: { employee: true }
        });

        if (!user?.employee) return errorResponse(res, '従業員データに関連付けられていません', 400);

        // タイムスタンプを含むトークンの生成 (簡易的な暗号化)
        const timestamp = Date.now();
        const rawToken = `${user.employee.employeeId}|${timestamp}`;
        const encodedToken = Buffer.from(rawToken).toString('base64');

        successResponse(res, { token: encodedToken, expiresAt: timestamp + 30000 }, 'トークンを生成しました');
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 2. トークンの読取と打刻 (端末デバイスまたは管理者のみ)
router.post('/scan', requireRole(['terminal', 'admin']), async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        if (!token) return errorResponse(res, 'トークンが見つかりません', 400);

        // デコードと有効期限のチェック
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [employeeId, timestampStr] = decoded.split('|');
        const timestamp = parseInt(timestampStr);

        if (Date.now() - timestamp > 30000) {
            return errorResponse(res, '打刻コードの有効期限が切れています。再生成してください', 403);
        }

        const record = await attendanceService.createAttendance({
            employeeId,
            recorder: 'QR_SCANNER',
            action: 'PUNCH'
        });

        successResponse(res, record, 'ＱＲ読取による打刻が完了しました');
    } catch (error: any) {
        errorResponse(res, error.message, 403);
    }
});

// 3. セルフ打刻 (従来ボタン用 - 端末用アカウントは利用不可)
router.post('/punch', requireRole(['admin', 'manager', 'hr', 'viewer']), async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user?.id },
            include: { employee: true }
        });

        if (!user?.employee) {
            return errorResponse(res, '従業員データに関連付けられていないため、打刻できません', 400);
        }

        const record = await attendanceService.createAttendance({
            employeeId: user.employee.employeeId,
            recorder: user.username,
            action: 'PUNCH'
        });

        successResponse(res, record, '打刻が完了しました');
    } catch (error: any) {
        errorResponse(res, error.message, 403);
    }
});

// 4. 管理者による手動作成 (権限が必要)
router.post('/', requireRole(['admin', 'hr', 'manager']), async (req: Request, res: Response) => {
    try {
        const record = await attendanceService.createAttendance({
            employeeId: req.body.employeeId,
            recorder: req.user?.username || 'admin',
            action: 'MANUAL',
            targetStatus: req.body.status,
            reason: req.body.reason
        });
        successResponse(res, record, '記録を作成しました');
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 5. 記録の修正
router.put('/:id', requireRole(['admin', 'hr']), async (req: Request, res: Response) => {
    try {
        await attendanceService.updateAttendance(
            req.params.id,
            req.body.status,
            req.user?.username || 'unknown',
            req.body.reason
        );
        successResponse(res, null, '記録を更新しました');
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 6. 統計データ (管理職権限)
router.get('/dashboard/stats', requireRole(['admin', 'manager', 'hr']), async (req: Request, res: Response) => {
    try {
        const stats = await attendanceService.getDashboardStats();
        successResponse(res, stats);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 7. 詳細記録リスト
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

// 7.5 本日のログストリーム
router.get('/logs/today', requireRole(['admin', 'manager', 'hr']), async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;
        const result = await attendanceService.getAllLogsToday(page, limit, search);
        successResponse(res, result);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 8. 毎日リセットの手動トリガー (Internal/Admin)
router.post('/reset', requireRole(['admin']), async (req: Request, res: Response) => {
    try {
        const result = await attendanceService.dailyReset();
        successResponse(res, result, '全従業員のシステムステータスをリセットしました');
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 8.5 一括自動退勤トリガー
router.post('/auto-checkout', requireRole(['admin']), async (req: Request, res: Response) => {
    try {
        const result = await attendanceService.autoCheckoutAll();
        successResponse(res, result, `${result.count} 名の従業員の自動退勤を処理しました`);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 9. 個人履歴
router.get('/history/:employeeId', async (req: Request, res: Response) => {
    try {
        const targetEmployeeId = req.params.employeeId;
        if (req.user?.role === 'viewer') {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: { employee: true }
            });
            if (user?.employee?.employeeId !== targetEmployeeId) {
                return errorResponse(res, '権限が不足しています', 403);
            }
        }
        const history = await attendanceService.getEmployeeHistory(targetEmployeeId);
        successResponse(res, history);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 10. 特定記録の監査ログ取得
router.get('/:id/audit', requireRole(['admin', 'hr', 'manager']), async (req: Request, res: Response) => {
    try {
        const logs = await attendanceService.getAuditLogs(req.params.id);
        successResponse(res, logs);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

// 11. 勤怠データの出力 (CSV)
router.get('/export', requireRole(['admin', 'manager', 'hr']), async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, search } = req.query;
        const result = await attendanceService.exportAttendanceData(startDate as string, endDate as string, search as string);

        const encodedFilename = encodeURIComponent(result.filename);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        // RFC 5987 形式でエンコードされたファイル名を指定
        res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);

        res.status(200).send('\uFEFF' + result.content);
    } catch (error: any) {
        errorResponse(res, error.message);
    }
});

export default router;
