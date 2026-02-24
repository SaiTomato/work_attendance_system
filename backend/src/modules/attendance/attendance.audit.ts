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
        try {
            await prisma.auditLog.create({
                data: {
                    ...entry,
                    before: entry.before ? JSON.parse(JSON.stringify(entry.before)) : undefined,
                    after: entry.after ? JSON.parse(JSON.stringify(entry.after)) : undefined
                }
            });
        } catch (e) {
            console.warn('[Audit] Failed to persist log:', e);
        }
    }

    async getLogsByTargetId(targetId: string): Promise<any[]> {
        return await prisma.auditLog.findMany({
            where: { targetId },
            orderBy: { operatedAt: 'desc' }
        });
    }
}

export const attendanceAudit = new AttendanceAuditService();
