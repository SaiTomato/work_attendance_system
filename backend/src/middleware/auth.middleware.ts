
import { Request, Response, NextFunction } from 'express';
import { UserPayload } from '../types';

// Mock Auth Middleware
// Skill: rbac-check (所有非只读接口必须校验 JWT - 这里 Mock 注入一个 admin 用户)
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    // In real app, verify JWT here
    const mockUser: UserPayload = {
        id: 'ADMIN-001',
        username: 'admin',
        role: 'admin'
    };

    req.user = mockUser;
    next();
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
