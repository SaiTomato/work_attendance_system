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
  userId: string,
  refreshToken: string
): Promise<boolean> {
  try {
    const tokenHash = hashToken(refreshToken);

    const result = await prisma.refreshToken.updateMany({
      where: {
        userId,
        tokenHash,
        revokedAt: null, // 仅撤销尚未撤销的
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count > 0;
  } catch (err) {
    console.error('revokeRefreshToken error:', err);
    return false;
  }
}