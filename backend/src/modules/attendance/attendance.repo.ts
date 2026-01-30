import { DailyStats, AttendanceRecord } from '../../types';
import prisma from '../../db';

export class AttendanceRepo {
    /**
     * 获取今日异常列表 (late, absent)
     * 现在的逻辑：从数据库中查询指定日期，且状态不是 present 的记录
     */
    async getExceptions(date: Date): Promise<AttendanceRecord[]> {
        const dateStr = date.toISOString().split('T')[0];

        const records = await prisma.attendance.findMany({
            where: {
                date: dateStr,
                status: {
                    in: ['late', 'absent'] // 只查异常状态
                }
            },
            orderBy: {
                checkInTime: 'desc'
            }
        });

        // 转换成前端需要的格式
        return records.map(r => ({
            ...r,
            checkInTime: r.checkInTime?.toISOString(),
            checkOutTime: r.checkOutTime?.toISOString()
        })) as AttendanceRecord[];
    }

    /**
     * 修改考勤状态 & 记录审计日志
     * 注意：这里用到了事务 (Transaction)，保证“改状态”和“记账”要么都成功，要么都失败。
     */
    async updateAttendance(id: string, newStatus: string, operator: string, reason: string): Promise<AttendanceRecord | null> {
        return await prisma.$transaction(async (tx) => {
            // 1. 获取改之前的数据快照（用于审计）
            const before = await tx.attendance.findUnique({ where: { id } });
            if (!before) return null;

            // 2. 执行更新
            const updated = await tx.attendance.update({
                where: { id },
                data: { status: newStatus }
            });

            // 3. 记一笔审计日志 (Skill: audit-log-required)
            await tx.auditLog.create({
                data: {
                    attendanceId: id,
                    action: 'UPDATE',
                    before: before as any,
                    after: updated as any,
                    operatedBy: operator,
                    reason: reason // 使用前端传过来的真实原因
                }
            });

            return {
                ...updated,
                checkInTime: updated.checkInTime?.toISOString(),
                checkOutTime: updated.checkOutTime?.toISOString()
            } as AttendanceRecord;
        });
    }

    /**
     * 获取今日统计数据
     */
    async getDailyStats(date: Date): Promise<DailyStats> {
        const dateStr = date.toISOString().split('T')[0];

        // 并行执行多项统计，提升性能
        const [total, present, late, absent, leave] = await Promise.all([
            prisma.employee.count(),
            prisma.attendance.count({ where: { date: dateStr, status: 'present' } }),
            prisma.attendance.count({ where: { date: dateStr, status: 'late' } }),
            prisma.attendance.count({ where: { date: dateStr, status: 'absent' } }),
            prisma.attendance.count({ where: { date: dateStr, status: 'leave' } }),
        ]);

        return {
            date: dateStr,
            totalEmployees: total,
            present,
            late,
            absent,
            leave,
            exceptions: late + absent
        };
    }

    /**
     * 删除记录 (物理删除 + 审计记录)
     */
    async deleteAttendance(id: string, operator: string): Promise<boolean> {
        try {
            await prisma.$transaction(async (tx) => {
                const record = await tx.attendance.findUnique({ where: { id } });
                if (!record) throw new Error('Not found');

                // 记一笔删除审计
                await tx.auditLog.create({
                    data: {
                        attendanceId: id,
                        action: 'DELETE',
                        before: record as any,
                        after: undefined, // Or just omit it
                        operatedBy: operator,
                        reason: 'Administrative Removal'
                    }
                });

                // 真正的删除
                await tx.attendance.delete({ where: { id } });
            });
            return true;
        } catch (e) {
            return false;
        }
    }
}

export const attendanceRepo = new AttendanceRepo();
