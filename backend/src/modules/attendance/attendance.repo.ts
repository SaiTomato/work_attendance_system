import { DailyStats, AttendanceRecord } from '../../types';
import prisma from '../../db';

export class AttendanceRepo {
    /**
     * 指定日の全従業員最新ステータスを取得 (フィルタリング対応)
     */
    async getDailyRecords(date: Date, filterType: string = 'all'): Promise<AttendanceRecord[]> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // 1. 全ての有効な従業員を取得
        const totalEmployees = await prisma.employee.findMany({
            where: { status: 'ACTIVE', deletedAt: null }
        });

        const fullList: AttendanceRecord[] = [];

        // 2. 各従業員の当日最新レコードを取得
        for (const emp of totalEmployees) {
            const latestRecord = await prisma.attendance.findFirst({
                where: {
                    employeeId: emp.employeeId,
                    recordTime: { gte: startOfDay, lte: endOfDay }
                } as any,
                include: { employee: true } as any,
                orderBy: [
                    { recordTime: 'desc' },
                    { id: 'desc' }
                ] as any
            }) as any;

            const record: AttendanceRecord = {
                id: latestRecord?.id || `missing-${emp.employeeId}`,
                employeeId: emp.employeeId,
                employeeName: emp.name,
                status: latestRecord?.status || '未出勤-通常',
                recordTime: latestRecord?.recordTime?.toISOString() || null,
                recorder: latestRecord?.recorder || 'SYSTEM',
                reason: latestRecord?.reason || null
            };

            // 3. フィルタリングロジックの適用
            if (filterType === 'all') {
                fullList.push(record);
                continue;
            }

            const status = record.status;
            let match = false;

            switch (filterType) {
                case 'unattended':
                    match = status.startsWith('未出勤');
                    break;
                case 'present':
                    match = status.startsWith('出勤');
                    break;
                case 'checkout':
                    match = status.startsWith('退勤');
                    break;
                case 'exceptions':
                case 'exception':
                    match = status.startsWith('異常');
                    break;
                case 'leave':
                    match = status.startsWith('休暇');
                    break;
                case 'outside':
                    match = status.startsWith('外出');
                    break;
            }

            if (match) fullList.push(record);
        }

        return fullList.sort((a, b) => a.employeeId.localeCompare(b.employeeId));
    }

    /**
     * 本日の全従業員ログを取得 (ページネーション対応)
     */
    async getAllLogsToday(page: number = 1, limit: number = 10, search?: string): Promise<{ logs: AttendanceRecord[], total: number }> {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const where: any = {
            recordTime: { gte: startOfDay }
        };

        if (search) {
            where.OR = [
                { employeeId: { contains: search, mode: 'insensitive' } },
                { employee: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const total = await prisma.attendance.count({
            where
        });

        const logs = await prisma.attendance.findMany({
            where,
            include: { employee: true } as any,
            orderBy: [
                { recordTime: 'desc' },
                { id: 'desc' }
            ] as any,
            skip: (page - 1) * limit,
            take: limit
        }) as any[];

        const mappedLogs = logs.map(l => ({
            id: l.id,
            employeeId: l.employeeId,
            employeeName: (l as any).employee.name,
            status: l.status,
            recordTime: l.recordTime.toISOString(),
            recorder: (l as any).recorder,
            reason: (l as any).reason
        }));

        return { logs: mappedLogs, total };
    }

    /**
     * 従業員の最新レコードを取得 (打刻判定用)
     */
    async getLatestRecordToday(employeeId: string): Promise<any | null> {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));

        return await prisma.attendance.findFirst({
            where: {
                employeeId,
                recordTime: { gte: startOfDay }
            },
            orderBy: [
                { recordTime: 'desc' },
                { id: 'desc' }
            ]
        });
    }

    /**
     * 勤怠ログを作成 (追記モード)
     */
    async createAttendance(data: {
        employeeId: string;
        status: string;
        recorder: string;
        recordTime?: Date;
        reason?: string;
    }): Promise<any> {
        return await prisma.attendance.create({
            data: {
                employeeId: data.employeeId,
                status: data.status,
                recorder: data.recorder,
                recordTime: data.recordTime || new Date(),
                reason: data.reason
            }
        });
    }

    /**
     * ダッシュボード統計データを取得
     */
    async getDailyStats(date: Date): Promise<any> {
        const records = await this.getDailyRecords(date, 'all');
        const stats = {
            totalEmployees: records.length,
            unattended: 0,
            present: 0,
            checkout: 0,
            exception: 0,
            leave: 0,
            outside: 0
        };

        records.forEach(r => {
            const status = r.status;
            if (status.startsWith('未出勤')) stats.unattended++;
            else if (status.startsWith('出勤')) stats.present++;
            else if (status.startsWith('退勤')) stats.checkout++;
            else if (status.startsWith('異常')) stats.exception++;
            else if (status.startsWith('休暇')) stats.leave++;
            else if (status.startsWith('外出')) stats.outside++;
        });

        return stats;
    }

    /**
     * 履歴を取得 (全ログストリーム)
     */
    async getEmployeeHistory(employeeId: string): Promise<any[]> {
        return await prisma.attendance.findMany({
            where: { employeeId },
            orderBy: [
                { recordTime: 'desc' },
                { id: 'desc' }
            ]
        });
    }

    /**
     * 指定範囲内の全レコードを取得 (エクスポート用)
     */
    async getRecordsByRange(startDate: Date, endDate: Date, search?: string): Promise<any[]> {
        const where: any = {
            recordTime: {
                gte: startDate,
                lte: endDate
            }
        };

        if (search) {
            where.OR = [
                { employeeId: { contains: search, mode: 'insensitive' } },
                { employee: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        return await prisma.attendance.findMany({
            where,
            include: { employee: true },
            orderBy: [
                { recordTime: 'asc' },
                { employeeId: 'asc' }
            ]
        });
    }
}

export const attendanceRepo = new AttendanceRepo();
