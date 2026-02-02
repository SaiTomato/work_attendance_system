
import { Request, Response, NextFunction } from 'express';
import { UserPayload } from '../types';

import { verifyAccessToken } from '../services/tokenService';

// Skill: rbac-check - 所有关键接口必须校验 JWT
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication token missing' });
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
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

export const requireRole = (roles: UserPayload['role'][]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        next();
    };
};

// Skill: rbac-check - manager 访问数据时必须校验 department_id
// 需要结合具体业务逻辑，这里提供一个基础校验器
export const checkDepartmentAccess = (targetDepId: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.user?.role === 'admin') return next(); // Admin has all access

        if (req.user?.role === 'manager' && req.user.departmentId !== targetDepId) {
            return res.status(403).json({ success: false, error: 'Access denied for this department' });
        }
        next();
    };
};
