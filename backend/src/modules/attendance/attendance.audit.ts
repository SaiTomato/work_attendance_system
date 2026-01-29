
import { AuditLog } from '../../types';

export class AttendanceAuditService {
    // Mock storage
    private logs: AuditLog[] = [];

    async log(entry: Omit<AuditLog, 'id' | 'operatedAt'>): Promise<void> {
        const newLog: AuditLog = {
            ...entry,
            id: Math.random().toString(36).substr(2, 9),
            operatedAt: new Date().toISOString()
        };
        this.logs.push(newLog);
        console.log('[Audit] Recorded:', newLog);
    }

    async getLogsByTargetId(targetId: string): Promise<AuditLog[]> {
        // Mock fetch
        // Return some verification data for demo if empty
        if (this.logs.filter(l => l.targetId === targetId).length === 0) {
            return [
                {
                    id: 'log-1',
                    targetId: targetId,
                    action: 'create',
                    after: { status: 'present' },
                    operatedBy: 'system',
                    operatedAt: '2023-10-27T08:30:00Z'
                }
            ];
        }
        return this.logs.filter(l => l.targetId === targetId).sort((a, b) => b.operatedAt.localeCompare(a.operatedAt));
    }
}

export const attendanceAudit = new AttendanceAuditService();
