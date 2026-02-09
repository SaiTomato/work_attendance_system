import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import prisma from '../db';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../services/tokenService';
import { revokeRefreshToken, storeRefreshToken } from '../services/refreshTokenService';

const router = express.Router();

// Cookie Options Check
const COOKIE_OPTIONS: any = {
    httpOnly: true,
    secure: false, // Proxy 模式下后端认为是内网 HTTP，且 Same-Origin 不需要 Secure
    sameSite: 'lax', // Lax 完美支持同源
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

/**
 * Skill: attendance-api-create - 统一响应格式
 * Skill: rbac-check - 用户登入
 */
router.post(
    '/login',
    [
        body('username').notEmpty().withMessage('用户名不能为空'),
        body('password').notEmpty().withMessage('密码不能为空'),
    ],
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '验证失败',
                error: errors.array()
            });
        }

        const { username, password } = req.body;

        try {
            const user = await prisma.user.findUnique({
                where: { username }
            });

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: '用户名或密码错误'
                });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    message: '用户名或密码错误'
                });
            }

            // JWT トークン生成
            const accessToken = signAccessToken({
                id: user.id,
                username: user.username,
                role: user.role,
            });

            const refreshToken = signRefreshToken({
                id: user.id
            });

            console.log(`[Auth] User ${username} logged in successfully. Role: ${user.role}`);
            const ok = await storeRefreshToken(user.id, refreshToken);
            console.log(`[Auth] Refreshtoken store result: ${ok}`);

            if (!ok) {
                return res.status(500).json({
                    success: false,
                    message: 'Token 存储失败',
                });
            }

            res
                .status(200)
                .cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
                .json({
                    success: true,
                    data: {
                        accessToken,
                        user: {
                            id: user.id,
                            username: user.username,
                            role: user.role,
                        },
                    },
                });
        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({
                success: false,
                message: '服务器错误'
            });
        }
    }
);

router.post('/logout', async (req: Request, res: Response) => {
    // 调试日志：查看所有接收到的 Cookie
    console.log(`[Auth] Logout cookies received:`, req.cookies);

    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
        console.warn(`[Auth] Logout failed: No refresh token found in cookies or body.`);
        return res.status(200).json({
            success: true,
            message: 'Already logged out (no token found)',
        });
    }

    try {
        console.log(`[Auth] Revoke attempt for token: ${refreshToken.substring(0, 15)}...`);
        let userId: string | undefined;
        try {
            const decoded = verifyRefreshToken(refreshToken);
            userId = decoded.id;
        } catch (e) {
            console.log(`[Auth] Token verify failed during logout (may be expired), continuing revocation by hash...`);
        }

        const ok = await revokeRefreshToken(refreshToken, userId);
        console.log(`[Auth] Revoke database result: ${ok}`);
    } catch (err) {
        console.error('[Auth] Logout revocation error:', err);
    }

    // 无论数据库撤销是否成功，都尝试清除客户端 Cookie
    return res
        .status(200)
        .clearCookie('refreshToken', {
            ...COOKIE_OPTIONS,
            maxAge: 0
        })
        .json({
            success: true,
            message: 'Successfully logged out'
        });
});

// トークンリフレッシュ
router.post(
    '/refresh',
    async (req: Request, res: Response) => {
        const refreshToken = (req as any).cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Missing refresh token',
            });
        }

        let userId: string;
        try {
            const decoded = verifyRefreshToken(refreshToken);
            userId = decoded.id;
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token',
            });
        }

        const ok = await revokeRefreshToken(refreshToken, userId);
        if (!ok) {
            return res.status(401).json({
                success: false,
                message: 'Token revoked or expired',
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            });
        }

        const newAccessToken = signAccessToken({
            id: user.id,
            username: user.username,
            role: user.role,
        });

        const newRefreshToken = signRefreshToken({
            id: user.id
        });

        await storeRefreshToken(user.id, newRefreshToken);

        res
            .cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS)
            .json({
                success: true,
                data: {
                    accessToken: newAccessToken,
                }
            });
    }
);

export default router;