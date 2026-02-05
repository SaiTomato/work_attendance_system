import { DailyStats, AttendanceRecord } from '../../types';
import prisma from '../../db';

export class AttendanceRepo {
    /**
     * 获取今日异常列表 (late, absent)
     * 过滤掉已软删除的记录
     */
    async getExceptions(date: Date): Promise<AttendanceRecord[]> {
        const dateStr = date.toISOString().split('T')[0];

        const records = await prisma.attendance.findMany({
            where: {
                date: dateStr,
                status: {
                    in: ['late', 'absent']
                },
                deletedAt: null // 软删除过滤
            },
            orderBy: {
                checkInTime: 'desc'
            }
        });

        return records.map(r => ({
            ...r,
            checkInTime: r.checkInTime?.toISOString(),
            checkOutTime: r.checkOutTime?.toISOString()
        })) as AttendanceRecord[];
    }

    /**
     * 修改考勤状态 & 记录审计日志
     */
    async updateAttendance(id: string, newStatus: string, operator: string, reason: string): Promise<AttendanceRecord | null> {
        return await prisma.$transaction(async (tx) => {
            const before = await tx.attendance.findUnique({ where: { id } });
            if (!before) return null;

            const updated = await tx.attendance.update({
                where: { id },
                data: { status: newStatus }
            });

            await tx.auditLog.create({
                data: {
                    attendanceId: id,
                    action: 'UPDATE',
                    before: before as any,
                    after: updated as any,
                    operatedBy: operator,
                    reason: reason
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
     * 获取历史记录
     */
    async getEmployeeHistory(employeeId: string): Promise<AttendanceRecord[]> {
        const records = await prisma.attendance.findMany({
            where: {
                employeeId,
                deletedAt: null
            },
            orderBy: { date: 'desc' }
        });
        return records.map(r => ({
            ...r,
            checkInTime: r.checkInTime?.toISOString(),
            checkOutTime: r.checkOutTime?.toISOString()
        })) as AttendanceRecord[];
    }

    /**
     * 获取审计日志
     */
    async getAuditLogs(recordId: string) {
        return await prisma.auditLog.findMany({
            where: { attendanceId: recordId },
            orderBy: { operatedAt: 'desc' }
        });
    }

    /**
     * 创建记录 (含审计)
     */
    async createAttendance(data: any, operator: string): Promise<AttendanceRecord> {
        return await prisma.$transaction(async (tx) => {
            const record = await tx.attendance.create({
                data: {
                    employeeId: data.employeeId,
                    employeeName: data.employeeName,
                    date: data.date,
                    status: data.status,
                    checkInTime: data.checkInTime,
                    checkOutTime: data.checkOutTime,
                }
            });

            await tx.auditLog.create({
                data: {
                    attendanceId: record.id,
                    action: 'CREATE',
                    after: record as any,
                    operatedBy: operator,
                    reason: 'Initial creation'
                }
            });

            return {
                ...record,
                checkInTime: record.checkInTime?.toISOString(),
                checkOutTime: record.checkOutTime?.toISOString()
            } as AttendanceRecord;
        });
    }

    /**
     * 获取统计数据 (考虑软删除)
     */
    async getDailyStats(date: Date): Promise<DailyStats> {
        const dateStr = date.toISOString().split('T')[0];

        // 仅统计在职 (ACTIVE) 且未被软删除的员工
        const total = await prisma.employee.count({
            where: {
                status: 'ACTIVE',
                deletedAt: null
            }
        });

        // 统计各项状态数量 (已存在记录的)
        const [presentCount, lateCount, recordedAbsent, leaveCount, wfhCount, worksiteCount] = await Promise.all([
            prisma.attendance.count({ where: { date: dateStr, status: 'present', deletedAt: null } }),
            prisma.attendance.count({ where: { date: dateStr, status: 'late', deletedAt: null } }),
            prisma.attendance.count({ where: { date: dateStr, status: 'absent', deletedAt: null } }),
            prisma.attendance.count({ where: { date: dateStr, status: 'leave', deletedAt: null } }),
            prisma.attendance.count({ where: { date: dateStr, status: 'wfh', deletedAt: null } }),
            prisma.attendance.count({ where: { date: dateStr, status: 'worksite', deletedAt: null } }),
        ]);

        // 计算逻辑：
        // 1. 出勤人数 = 正常 + 居家 + 现场
        // 2. 缺勤人数 = 总人数 - (正常 + 迟到 + 居家 + 现场 + 请假)
        //    如果没有打卡且没有请假，默认视为缺勤
        const activePresent = presentCount + wfhCount + worksiteCount;
        const totalAccounted = activePresent + lateCount + leaveCount;
        const calculatedAbsent = Math.max(0, total - totalAccounted);

        return {
            date: dateStr,
            totalEmployees: total,
            present: activePresent,
            late: lateCount,
            absent: calculatedAbsent || recordedAbsent, // 优先使用计算值，如果没有则使用记录值
            leave: leaveCount,
            exceptions: lateCount + (calculatedAbsent || recordedAbsent)
        };
    }

    /**
     * 软删除 (Soft Delete)
     */
    async deleteAttendance(id: string, operator: string): Promise<boolean> {
        try {
            await prisma.$transaction(async (tx) => {
                const record = await tx.attendance.findUnique({ where: { id } });
                if (!record) throw new Error('Not found');

                await tx.auditLog.create({
                    data: {
                        attendanceId: id,
                        action: 'DELETE',
                        before: record as any,
                        operatedBy: operator,
                        reason: 'Record soft deleted'
                    }
                });

                await tx.attendance.update({
                    where: { id },
                    data: { deletedAt: new Date() }
                });
            });
            return true;
        } catch (e) {
            return false;
        }
    }
}

export const attendanceRepo = new AttendanceRepo();
