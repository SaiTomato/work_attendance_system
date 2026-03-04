import { DailyStats, AttendanceRecord } from '../../types';
import prisma from '../../db';

export class AttendanceRepo {
    /**
     * 勤怠データを取得 (Snapshot: 今日全员 / Log: 期间流水) - ページネーション対応
     */
    async getDailyRecords(
        mode: 'snapshot' | 'log',
        startDate?: Date,
        endDate?: Date,
        filterType: string = 'all',
        search?: string,
        page: number = 1,
        limit: number = 10,
        sortField: string = 'recordTime',
        sortOrder: 'asc' | 'desc' = 'desc'
    ): Promise<{ records: AttendanceRecord[], total: number }> {
        if (mode === 'snapshot') {
            // 【快照模式】: 本日限定・全従業員の最新ステータスを表示
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));

            const employeeWhere: any = { status: 'ACTIVE', deletedAt: null };
            if (search) {
                employeeWhere.OR = [
                    { employeeId: { contains: search, mode: 'insensitive' } },
                    { name: { contains: search, mode: 'insensitive' } }
                ];
            }

            const totalEmployees = await prisma.employee.findMany({
                where: employeeWhere,
                orderBy: { employeeId: 'asc' }
            });

            const allSnapshotRecords: AttendanceRecord[] = [];
            for (const emp of totalEmployees) {
                const latestRecord = await prisma.attendance.findFirst({
                    where: {
                        employeeId: emp.employeeId,
                        recordTime: { gte: startOfDay, lte: endOfDay }
                    },
                    orderBy: [{ recordTime: 'desc' }, { id: 'desc' }]
                });

                const record: AttendanceRecord = {
                    id: latestRecord?.id || `missing-${emp.employeeId}`,
                    employeeId: emp.employeeId,
                    employeeName: emp.name,
                    status: latestRecord?.status || '未出勤-通常',
                    recordTime: latestRecord?.recordTime ? latestRecord.recordTime.toISOString() : null,
                    recorder: latestRecord?.recorder || 'SYSTEM',
                    reason: latestRecord?.reason || null
                };

                // カテゴリーフィルタリング
                if (filterType !== 'all') {
                    const status = record.status;
                    let match = false;
                    switch (filterType) {
                        case 'unattended': match = status.startsWith('未出勤'); break;
                        case 'present': match = status.startsWith('出勤'); break;
                        case 'checkout': match = status.startsWith('退勤'); break;
                        case 'exceptions': case 'exception': match = status.startsWith('異常'); break;
                        case 'leave': match = status.startsWith('休暇'); break;
                        case 'outside': match = status.startsWith('外出'); break;
                    }
                    if (!match) continue;
                }

                allSnapshotRecords.push(record);
            }

            // 【重要】手動で構築した全リストを、ソート指示に基づいて並び替え
            allSnapshotRecords.sort((a, b) => {
                let valA: any = (a as any)[sortField];
                let valB: any = (b as any)[sortField];

                // 数値変換が必要な場合や大文字小文字の区別を無くす場合の調整
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();

                // 記録時間 (null) の場合のハンドリング：一番下（または一番上）へ
                if (valA === null || valA === undefined) return sortOrder === 'asc' ? 1 : -1;
                if (valB === null || valB === undefined) return sortOrder === 'asc' ? -1 : 1;

                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });

            const total = allSnapshotRecords.length;
            const records = allSnapshotRecords.slice((page - 1) * limit, page * limit);

            return { records, total };
        } else {
            // 【流水模式】: 指定範囲内の全履歴を表示 (読み取り専用)
            const start = startDate ? new Date(startDate) : new Date();
            start.setHours(0, 0, 0, 0);
            const end = endDate ? new Date(endDate) : new Date();
            end.setHours(23, 59, 59, 999);

            const where: any = { recordTime: { gte: start, lte: end } };

            if (filterType !== 'all') {
                const statusPrefixMap: any = {
                    'present': '出勤', 'checkout': '退勤', 'exceptions': '異常', 'exception': '異常', 'leave': '休暇', 'outside': '外出', 'unattended': '未出勤'
                };
                where.status = { startsWith: statusPrefixMap[filterType] };
            }

            if (search) {
                where.OR = [
                    { employeeId: { contains: search, mode: 'insensitive' } },
                    { employee: { name: { contains: search, mode: 'insensitive' } } },
                    { status: { contains: search, mode: 'insensitive' } }
                ];
            }

            const total = await prisma.attendance.count({ where });

            const orderBy: any = {};
            if (sortField === 'employeeName') {
                orderBy.employee = { name: sortOrder };
            } else {
                orderBy[sortField] = sortOrder;
            }

            const list = await prisma.attendance.findMany({
                where,
                include: { employee: true },
                orderBy,
                skip: (page - 1) * limit,
                take: limit
            }) as any[];

            const records = list.map(r => ({
                id: r.id,
                employeeId: r.employeeId,
                employeeName: r.employee.name,
                status: r.status,
                recordTime: r.recordTime.toISOString(),
                recorder: r.recorder,
                reason: r.reason
            }));

            return { records, total };
        }
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
                { employee: { name: { contains: search, mode: 'insensitive' } } },
                { status: { contains: search, mode: 'insensitive' } }
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
        const { records } = await this.getDailyRecords('snapshot', date, date, 'all', undefined, 1, 1000);
        const stats = {
            totalEmployees: records.length,
            unattended: 0,
            present: 0,
            checkout: 0,
            exception: 0,
            leave: 0,
            outside: 0
        };

        records.forEach((r: any) => {
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
     * 履歴を取得 (全ログストリーム) - ページネーション対応
     */
    async getEmployeeHistory(employeeId: string, page: number = 1, limit: number = 10): Promise<{ records: any[], total: number }> {
        const total = await prisma.attendance.count({ where: { employeeId } });
        const records = await prisma.attendance.findMany({
            where: { employeeId },
            orderBy: [
                { recordTime: 'desc' },
                { id: 'desc' }
            ],
            skip: (page - 1) * limit,
            take: limit
        });
        return { records, total };
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
                { employee: { name: { contains: search, mode: 'insensitive' } } },
                { status: { contains: search, mode: 'insensitive' } }
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
