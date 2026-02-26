import prisma from '../../db';

export class AttendanceAuditService {
    async log(entry: {
        targetId: string;
        action: string;
        before?: any;
        after?: any;
        operatedBy: string;
        reason?: string;
    }): Promise<void> {
        // 循環参照や巨大なオブジェクトによる書き込みの失敗を防ぐため、シンプルなオブジェクトに整形
        const logData = {
            targetId: entry.targetId,
            action: entry.action,
            operatedBy: entry.operatedBy,
            reason: entry.reason || '',
            // 重要なフィールドのみを抽出して格納
            before: entry.before ? { status: entry.before.status, id: entry.before.id } : {},
            after: entry.after ? { status: entry.after.status, id: entry.after.id } : {},
            operatedAt: new Date()
        };

        // 非同期で実行し、メインのビジネスロジックをブロックしない
        prisma.auditLog.create({ data: logData })
            .then(res => console.log(`[Audit] Success: ${res.id}`))
            .catch(err => console.error(`[Audit] Error:`, err));

        console.log(`[Audit] Background task dispatched for target: ${entry.targetId}`);
    }

    async getLogsByTargetId(targetId: string): Promise<any[]> {
        return await prisma.auditLog.findMany({
            where: { targetId },
            orderBy: { operatedAt: 'desc' }
        });
    }
}

export const attendanceAudit = new AttendanceAuditService();
