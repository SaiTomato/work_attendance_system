import { DailyStats, AttendanceRecord } from '../../types';
import prisma from '../../db';

export class AttendanceRepo {
    /**
     * 获取指定日期的员工最新出勤状态列表 (支持过滤)
     */
    async getDailyRecords(date: Date, filterType: string = 'all'): Promise<AttendanceRecord[]> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // 1. 获取所有在职员工
        const totalEmployees = await prisma.employee.findMany({
            where: { status: 'ACTIVE', deletedAt: null }
        });

        const fullList: AttendanceRecord[] = [];

        // 2. 遍历每个员工，获取当日最新的记录
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
                status: latestRecord?.status || '未出勤-正常',
                recordTime: latestRecord?.recordTime?.toISOString() || null,
                recorder: latestRecord?.recorder || 'SYSTEM',
                reason: latestRecord?.reason || null
            };

            // 3. 应用过滤业务逻辑 (根据 PRD 归类)
            if (filterType === 'all') {
                fullList.push(record);
                continue;
            }

            //映射前端分类到后端匹配逻辑
            const status = record.status;
            let match = false;

            switch (filterType) {
                case 'unattended':
                    match = status.startsWith('未出勤');
                    break;
                case 'present':
                    match = status.startsWith('出勤'); // 包含出勤-正常, 出勤-迟到
                    break;
                case 'checkout':
                    match = status.startsWith('退勤'); // 包含退勤-正常, 退勤-早退, 退勤-晚退
                    break;
                case 'exceptions':
                case 'exception':
                    match = status.startsWith('异常'); // 仅限异常-缺勤
                    break;
                case 'leave':
                    match = status.startsWith('休假'); // 休假-有休, 休假-无休
                    break;
                case 'outside':
                    match = status.startsWith('公司外'); // 公司外-现场, 公司外-远程
                    break;
            }

            if (match) fullList.push(record);
        }

        return fullList.sort((a, b) => a.employeeId.localeCompare(b.employeeId));
    }

    /**
     * 获取今日全员流水日志 (支持分页)
     */
    async getAllLogsToday(page: number = 1, limit: number = 10): Promise<{ logs: AttendanceRecord[], total: number }> {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const total = await prisma.attendance.count({
            where: { recordTime: { gte: startOfDay } } as any
        });

        const logs = await prisma.attendance.findMany({
            where: { recordTime: { gte: startOfDay } } as any,
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
     * 获取员工最新的状态记录 (用于打卡判定)
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
     * 创建出勤日志 (追加模式)
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
     * 获取 Dashboard 统计数据
     */
    async getDailyStats(date: Date): Promise<any> {
        const records = await this.getDailyRecords(date, 'all');
        const stats = {
            totalEmployees: records.length,
            unattended: 0, // 未出勤
            present: 0,    // 出勤
            checkout: 0,   // 退勤
            exception: 0,  // 异常 (缺勤)
            leave: 0,      // 休假
            outside: 0     // 公司外
        };

        records.forEach(r => {
            const status = r.status;
            if (status.startsWith('未出勤')) stats.unattended++;
            else if (status.startsWith('出勤')) stats.present++;   // 包含出勤-正常, 出勤-迟到
            else if (status.startsWith('退勤')) stats.checkout++;  // 包含退勤-正常, 退勤-早退, 退勤-晚退
            else if (status.startsWith('异常')) stats.exception++; // 异常-缺勤
            else if (status.startsWith('休假')) stats.leave++;     // 休假-有休, 休假-无休
            else if (status.startsWith('公司外')) stats.outside++; // 公司外-现场, 公司外-远程
        });

        return stats;
    }

    /**
     * 获取历史记录 (所有日志流)
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
}

export const attendanceRepo = new AttendanceRepo();
