import { Request, Response, NextFunction } from 'express';
import { UserPayload } from '../types';
import { verifyAccessToken } from '../services/tokenService';

/**
 * 認証ミドルウェア - すべての重要インターフェースで JWT 認証を検証
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: '認証トークンが見つかりません' });
    }

    try {
        const decoded = verifyAccessToken(token);
        req.user = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role as any
        };
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'トークンが無効または期限切れです' });
    }
};

/**
 * ロール制御ミドルウェア
 */
export const requireRole = (roles: UserPayload['role'][]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: '未認証' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: '権限がありません (アクセス拒否)' });
        }

        next();
    };
};

/**
 * 部署アクセス制御ミドルウェア - マネージャー（課長/部長）権限時の部署チェック
 */
export const checkDepartmentAccess = (targetDepId: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.user?.role === 'admin') return next(); // 管理者は全権限

        if (req.user?.role === 'manager' && req.user.departmentId !== targetDepId) {
            return res.status(403).json({ success: false, error: 'この部署へのアクセス権限がありません' });
        }
        next();
    };
};
