import { DailyStats, AttendanceRecord } from '../../types';
import prisma from '../../db';

export class AttendanceRepo {
    /**
     * 获取今日异常列表 (动态侦测缺勤、迟到、早退、漏打卡)
     */
    async getExceptions(date: Date): Promise<AttendanceRecord[]> {
        const dateStr = date.toISOString().split('T')[0];
        const now = new Date();

        // 1. 获取所有在职且应出席的员工
        const totalEmployees = await prisma.employee.findMany({
            where: {
                OR: [
                    { status: 'ACTIVE' },
                    {
                        AND: [
                            { status: 'PROSPECTIVE' },
                            { hireDate: { lte: now } }
                        ]
                    }
                ],
                deletedAt: null
            }
        });

        // 2. 获取今日已有记录
        const records = await prisma.attendance.findMany({
            where: { date: dateStr, deletedAt: null }
        });

        const recordMap = new Map();
        records.forEach(r => recordMap.set(r.employeeId, r));

        // 3. 获取通用规则与节假日信息
        const [rule, holiday] = await Promise.all([
            (prisma as any).attendanceRule.findFirst({ where: { isDefault: true } }),
            (prisma as any).holiday.findUnique({ where: { date: dateStr } })
        ]);

        // 如果是节假日且不是补班日，全员默认不产生“缺勤”异常
        const isNonWorkingDay = (holiday && !holiday.isWorkday) || (!holiday && (now.getDay() === 0 || now.getDay() === 6));

        const [stdH, stdM] = (rule?.standardCheckIn || '09:00').split(':').map(Number);
        const [outH, outM] = (rule?.standardCheckOut || '18:00').split(':').map(Number);

        const inDeadline = new Date(now);
        inDeadline.setHours(stdH, stdM, 0, 0);

        const outTime = new Date(now);
        outTime.setHours(outH, outM, 0, 0);

        const maxOvertime = rule?.maxOvertimeHours || 3;
        const outGraceDeadline = new Date(outTime.getTime() + maxOvertime * 60 * 60 * 1000);

        // 获取今日所有已审批的请假申请
        const approvedLeaves = await (prisma as any).leaveRequest.findMany({
            where: {
                status: 'APPROVED',
                startDate: { lte: now },
                endDate: { gte: now }
            }
        });
        const leaveMap = new Set(approvedLeaves.map((l: any) => l.employeeId));

        const exceptionList: AttendanceRecord[] = [];

        // 4. 动态侦测
        totalEmployees.forEach(emp => {
            const r = recordMap.get(emp.employeeId);

            if (!r) {
                // 情况：今天还没来打过卡
                // 如果是工作日且过了上班点，且没有请假 -> 判定为缺勤异常
                if (!isNonWorkingDay && now > inDeadline && !leaveMap.has(emp.employeeId)) {
                    exceptionList.push({
                        id: `missing-${emp.employeeId}`,
                        employeeId: emp.employeeId,
                        employeeName: emp.name,
                        date: dateStr,
                        status: 'absent',
                    } as any);
                }
            } else {
                // 情况：已经有记录，查状态是否异常
                let isAnomaly = false;
                if (r.status === 'late' || r.status === 'absent') isAnomaly = true;

                // 检查下班维度
                if (r.checkOutTime) {
                    const checkout = new Date(r.checkOutTime);
                    if (checkout < outTime) isAnomaly = true; // 早退
                } else if (now > outGraceDeadline && r.checkInTime) {
                    isAnomaly = true; // 忘记下班打卡
                }

                if (isAnomaly) {
                    exceptionList.push({
                        ...r,
                        checkInTime: r.checkInTime?.toISOString(),
                        checkOutTime: r.checkOutTime?.toISOString()
                    } as any);
                }
            }
        });

        return exceptionList.sort((a, b) => b.employeeId.localeCompare(a.employeeId));
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
        const now = new Date();

        // 1. 统计分母：在职 (ACTIVE) + 休假 (ON_LEAVE) + 已过期内定 (PROSPECTIVE with hireDate <= today)
        const totalEmployees = await prisma.employee.findMany({
            where: {
                OR: [
                    { status: 'ACTIVE' },
                    { status: 'ON_LEAVE' },
                    {
                        AND: [
                            { status: 'PROSPECTIVE' },
                            { hireDate: { lte: now } }
                        ]
                    }
                ],
                deletedAt: null
            },
            select: { employeeId: true, status: true }
        });

        const totalCount = totalEmployees.length;

        // 2. 获取今日所有考勤记录进行精细化分析
        const records = await prisma.attendance.findMany({
            where: { date: dateStr, deletedAt: null }
        });

        // 3. 获取规则时间线 (动态获取，不再死读 3 小时)
        const defaultRule = await prisma.attendanceRule.findFirst({ where: { isDefault: true } });
        const [inH, inM] = (defaultRule?.standardCheckIn || '09:00').split(':').map(Number);
        const [outH, outM] = (defaultRule?.standardCheckOut || '18:00').split(':').map(Number);
        const [startH, startM] = '05:00'.split(':').map(Number);
        const maxOvertime = defaultRule?.maxOvertimeHours || 3;

        const allowedStart = new Date(now);
        allowedStart.setHours(startH, startM, 0, 0);

        const inDeadline = new Date(now);
        inDeadline.setHours(inH, inM, 0, 0);

        const outTime = new Date(now);
        outTime.setHours(outH, outM, 0, 0);

        const outGraceDeadline = new Date(outTime.getTime() + maxOvertime * 60 * 60 * 1000);

        // 4. 开始分类统计
        let present = 0;
        let late = 0;
        let leaveRecordsCnt = 0;
        let successOut = 0;
        let exceptions = 0;

        const processedIds = new Set();

        records.forEach(r => {
            processedIds.add(r.employeeId);

            // 基础状态判定
            if (r.status === 'present' || r.status === 'wfh' || r.status === 'worksite') present++;
            if (r.status === 'late') { late++; exceptions++; }
            if (r.status === 'leave') leaveRecordsCnt++;

            // --- 下班/早退 逻辑监控 ---
            if (r.checkOutTime) {
                const checkout = new Date(r.checkOutTime);
                if (checkout >= outTime && checkout <= outGraceDeadline) {
                    // 正常时间范围内下班
                    successOut++;
                } else if (checkout < outTime) {
                    // 早退判定 -> 计入异常
                    exceptions++;
                } else if (checkout > outGraceDeadline) {
                    // 超过加班宽限期才打卡 -> 计入异常 (虽然打到了卡，但属于异常行为)
                    exceptions++;
                }
            } else if (now > outGraceDeadline && r.checkInTime) {
                // 忘记打下班卡 (超过规定加班时间依然无记录) -> 计入异常
                exceptions++;
            }
        });

        // 5. 计算尚未出现在考勤表中的员工 (排除请假和节假日)
        const [holiday, approvedLeaves] = await Promise.all([
            (prisma as any).holiday.findUnique({ where: { date: dateStr } }),
            (prisma as any).leaveRequest.findMany({
                where: {
                    status: 'APPROVED',
                    startDate: { lte: now },
                    endDate: { gte: now }
                }
            })
        ]);

        const isNonWorkingDay = (holiday && !holiday.isWorkday) || (!holiday && (now.getDay() === 0 || now.getDay() === 6));
        const leaveMap = new Set(approvedLeaves.map((l: any) => l.employeeId));

        // 真正应出席但没打卡的人 (且没请假，不是休息日)
        let missingExceptions = 0;
        if (!isNonWorkingDay && now > inDeadline) {
            totalEmployees.forEach(emp => {
                if (!processedIds.has(emp.employeeId) && !leaveMap.has(emp.employeeId)) {
                    missingExceptions++;
                }
            });
        }

        return {
            date: dateStr,
            totalEmployees: totalCount,
            present,
            late,
            absent: missingExceptions,
            leave: leaveMap.size,
            unattended: now < inDeadline ? (totalCount - processedIds.size - leaveMap.size) : 0,
            successOut,
            exceptions: exceptions + missingExceptions
        } as any;
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
    /**
     * 检测员工当前是否存在未处理的异常状态
     * 逻辑：检查是否有记录处于非正常状态，或者是否由于时间原因（如迟到、忘记下班）导致当前被判定为异常
     */
    async getEmployeeAnomaly(employeeId: string): Promise<any | null> {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        // 1. 获取规则与节假日信息
        const [holiday, approvedLeave] = await Promise.all([
            (prisma as any).holiday.findUnique({ where: { date: dateStr } }),
            (prisma as any).leaveRequest.findFirst({
                where: {
                    employeeId,
                    status: 'APPROVED',
                    startDate: { lte: now },
                    endDate: { gte: now }
                }
            })
        ]);

        // 如果是休息日且没补班，或者已经请假获批 -> 不存在异常（放行）
        const isNonWorkingDay = (holiday && !holiday.isWorkday) || (!holiday && (now.getDay() === 0 || now.getDay() === 6));
        if (isNonWorkingDay || approvedLeave) return null;

        const employee = await prisma.employee.findUnique({
            where: { employeeId },
            include: {
                rules: { where: { isDefault: false }, take: 1 },
                department: {
                    include: { rules: { where: { isDefault: false }, take: 1 } }
                }
            }
        });
        if (!employee) return null;

        const rule = employee.rules?.[0] || employee.department?.rules?.[0] || await prisma.attendanceRule.findFirst({ where: { isDefault: true } });
        if (!rule) return null;

        const [inH, inM] = rule.standardCheckIn.split(':').map(Number);
        const [outH, outM] = rule.standardCheckOut.split(':').map(Number);
        const inDeadline = new Date(now);
        inDeadline.setHours(inH, inM, 0, 0);
        const outTime = new Date(now);
        outTime.setHours(outH, outM, 0, 0);
        const outGraceDeadline = new Date(outTime.getTime() + (rule.maxOvertimeHours || 3) * 60 * 60 * 1000);

        // 2. 检查今天的记录
        const todayRecord = await prisma.attendance.findFirst({
            where: { employeeId, date: dateStr, deletedAt: null }
        });

        if (!todayRecord) {
            // 如果还没打卡，且已经过了上班时间 -> 算异常 (缺勤)
            if (now > inDeadline) {
                return { type: 'ABSENT', message: '您今天尚未打卡且已过上班时间，请联系管理员处理异常。' };
            }
            return null; // 还没上班或者还没到时间，正常
        }

        // 3. 检查已有记录的状态
        if (todayRecord.status === 'late') {
            return { type: 'LATE', message: '您今天上班迟到，请联系管理员处理异常后方可继续打卡。' };
        }
        if (todayRecord.status === 'absent') {
            return { type: 'ABSENT', message: '您已被系统判定为缺勤，请联系管理员核实。' };
        }

        // 4. 检查下班记录
        if (todayRecord.checkInTime && !todayRecord.checkOutTime) {
            // 如果过了加班截止时间还没下班打卡 -> 异常
            if (now > outGraceDeadline) {
                return { type: 'MISSING_OUT', message: '您已超过规定加班时间且未打下班卡，请联系管理员补录。' };
            }
        }

        if (todayRecord.checkOutTime) {
            const checkout = new Date(todayRecord.checkOutTime);
            if (checkout < outTime) {
                return { type: 'EARLY_OUT', message: '您属于早退打卡，状态异常，请联系管理员处理。' };
            }
        }

        return null;
    }
}

export const attendanceRepo = new AttendanceRepo();
