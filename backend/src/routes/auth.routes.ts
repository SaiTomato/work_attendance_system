import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import prisma from '../db';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../services/tokenService';
import { revokeRefreshToken, storeRefreshToken } from '../services/refreshTokenService';

const router = express.Router();

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

            const ok = await storeRefreshToken(user.id, refreshToken);

            if (!ok) {
                return res.status(500).json({
                    success: false,
                    message: 'Token 存储失败',
                });
            }

            res
                .status(200)
                .cookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    secure: false, // 强制为 false 以支持 localhost/IP 的 HTTP 环境
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                })
                .json({
                    success: true,
                    data: {
                        accessToken,
                        user: {
                            id: user.id,
                            username: user.username,
                            role: user.role,
                        },
                    }
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
    const refreshToken = (req as any).cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
        return res.status(200).json({
            success: true,
            message: 'Already logged out',
        });
    }

    try {
        await revokeRefreshToken(refreshToken);
    } catch (err) {
        console.error('Logout revocation failed:', err);
    }

    return res
        .status(200)
        .clearCookie('refreshToken', {
            path: '/',
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
            .cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: false, // 强制为 false
                sameSite: 'lax',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            })
            .json({
                success: true,
                data: {
                    accessToken: newAccessToken,
                }
            });
    }
);

export default router;