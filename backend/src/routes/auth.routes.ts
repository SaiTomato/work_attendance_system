import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import prisma from '../db';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../services/tokenService';
import { revokeRefreshToken, storeRefreshToken } from '../services/refreshTokenService';

const router = express.Router();

// Cookie オプションの設定
const COOKIE_OPTIONS: any = {
    httpOnly: true,
    secure: false, // プロキシ環境下のHTTP通信、かつ Same-Origin のため Secure はオフ
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7日間
};

/**
 * ログイン処理
 */
router.post(
    '/login',
    [
        body('username').notEmpty().withMessage('ユーザー名は必須です'),
        body('password').notEmpty().withMessage('パスワードは必須です'),
    ],
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '入力内容の検証に失敗しました',
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
                    message: 'ユーザー名またはパスワードが正しくありません'
                });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'ユーザー名またはパスワードが正しくありません'
                });
            }

            // JWTトークンの生成
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
                    message: 'トークンの保存に失敗しました',
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
                message: 'サーバーエラーが発生しました'
            });
        }
    }
);

/**
 * ログアウト処理
 */
router.post('/logout', async (req: Request, res: Response) => {
    console.log(`[Auth] Logout cookies received:`, req.cookies);

    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
        console.warn(`[Auth] Logout failed: No refresh token found.`);
        return res.status(200).json({
            success: true,
            message: '既にログアウトされています',
        });
    }

    try {
        console.log(`[Auth] Revoke attempt for token: ${refreshToken.substring(0, 15)}...`);
        let userId: string | undefined;
        try {
            const decoded = verifyRefreshToken(refreshToken);
            userId = decoded.id;
        } catch (e) {
            console.log(`[Auth] Token verify failed during logout (may be expired), continuing revocation...`);
        }

        const ok = await revokeRefreshToken(refreshToken, userId);
        console.log(`[Auth] Revoke database result: ${ok}`);
    } catch (err) {
        console.error('[Auth] Logout revocation error:', err);
    }

    return res
        .status(200)
        .clearCookie('refreshToken', {
            ...COOKIE_OPTIONS,
            maxAge: 0
        })
        .json({
            success: true,
            message: 'ログアウトしました'
        });
});

/**
 * トークンリフレッシュ
 */
router.post(
    '/refresh',
    async (req: Request, res: Response) => {
        const refreshToken = (req as any).cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'リフレッシュトークンが見つかりません',
            });
        }

        let userId: string;
        try {
            const decoded = verifyRefreshToken(refreshToken);
            userId = decoded.id;
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: 'トークンが無効です',
            });
        }

        const ok = await revokeRefreshToken(refreshToken, userId);
        if (!ok) {
            return res.status(401).json({
                success: false,
                message: 'トークンの期限が切れているか、既に無効化されています',
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'ユーザーが見つかりません',
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