import prisma from '../db';
import { hashToken } from '../utils/tokenHash';

export async function storeRefreshToken(
  userId: string,
  refreshToken: string
): Promise<boolean> {
  try {
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return true;
  } catch (err) {
    console.error('storeRefreshToken error:', err);
    return false;
  }
}

export async function revokeRefreshToken(
  refreshToken: string,
  _userId?: string
): Promise<boolean> {
  try {
    const tokenHash = hashToken(refreshToken);
    console.log(`[TokenService] Attempting to revoke Hash: ${tokenHash.substring(0, 8)}...`);

    // 1. 先查
    const existing = await prisma.refreshToken.findUnique({
      where: { tokenHash }
    });

    if (!existing) {
      console.log(`[TokenService] Revoke FAILED: Hash NOT FOUND in DB.`);
      return false;
    }

    if (existing.revokedAt) {
      console.log(`[TokenService] Revoke SKIPPED: Already revoked at ${existing.revokedAt}`);
      return true;
    }

    // 2. 更新
    const result = await prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    console.log(`[TokenService] Revoke SUCCESS: result.count: ${result.count}`);
    return result.count > 0;
  } catch (err) {
    console.error('revokeRefreshToken error:', err);
    return false;
  }
}