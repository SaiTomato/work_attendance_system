import { AttendanceRule, Employee, WorkLocation, EmployeeStatus } from '@prisma/client';

export class AttendanceEngine {
    /**
     * 将时间向上取整到15分钟间隔（用于上班打卡）
     * 例：09:01 → 09:15, 09:15 → 09:15, 09:16 → 09:30
     */
    static ceilTo15Min(time: Date): Date {
        const result = new Date(time);
        const minutes = result.getMinutes();
        const remainder = minutes % 15;

        if (remainder === 0) return result;

        const newMinutes = minutes + (15 - remainder);
        result.setMinutes(newMinutes, 0, 0);
        return result;
    }

    /**
     * 将时间向下取整到15分钟间隔（用于下班打卡）
     * 例：17:10 → 17:00, 17:17 → 17:15, 17:29 → 17:15
     */
    static floorTo15Min(time: Date): Date {
        const result = new Date(time);
        const minutes = result.getMinutes();
        const remainder = minutes % 15;

        result.setMinutes(minutes - remainder, 0, 0);
        return result;
    }

    /**
     * 计算工时（小时）
     * @param checkInTime 上班打卡时间（已取整）
     * @param checkOutTime 下班打卡时间（已取整）
     * @param status 考勤状态
     * @returns 工时（小时，保留2位小数）
     */
    static calculateWorkHours(checkInTime: Date | null, checkOutTime: Date | null, status: string): number {
        // 缺勤或忘记打卡 → 工时为0
        if (status === 'absent' || !checkInTime || !checkOutTime) {
            return 0;
        }

        // 计算时间差（毫秒）
        const diffMs = checkOutTime.getTime() - checkInTime.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // 扣除午休1小时
        const workHours = Math.max(0, diffHours - 1);

        return Math.round(workHours * 100) / 100; // 保留2位小数
    }

    /**
     * 根据打卡时间、规则以及员工当前状态计算状态
     * @param checkInTime 实际上班打卡时间
     * @param checkOutTime 实际下班打卡时间
     * @param rule 适用的考勤规则
     * @param employee 员工档案
     * @returns status: 'present' | 'late' | 'absent' | 'early_leave' | 'leave' | 'wfh' | 'worksite' | 'prospective' | 'inactive'
     */
    static calculateStatus(
        checkInTime: Date | null,
        checkOutTime: Date | null,
        rule: AttendanceRule,
        employee: Employee
    ): string {
        const today = new Date();
        const todayNoTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // ========================================
        // 第一步：处理不应生成考勤记录的员工
        // ========================================

        // 1.1 已离职或被辞退 → 不应有考勤记录
        if (employee.status === 'RESIGNED' || employee.status === 'TERMINATED') {
            return 'inactive';
        }

        // 1.2 内定员工且未到入职日 → 不应有考勤记录
        if (employee.status === 'PROSPECTIVE') {
            if (!employee.hireDate || todayNoTime < new Date(employee.hireDate.getFullYear(), employee.hireDate.getMonth(), employee.hireDate.getDate())) {
                return 'prospective';
            }
            // 如果今天是入职日或之后，视为 ACTIVE 继续处理
        }

        // ========================================
        // 第二步：处理免打卡状态（优先级最高）
        // ========================================

        // 2.1 休假中 → 免打卡，直接返回 'leave'
        if (employee.status === 'ON_LEAVE') {
            return 'leave';
        }

        // 2.2 远程办公 → 免打卡，直接返回 'wfh'
        if (employee.workLocation === 'REMOTE') {
            return 'wfh';
        }

        // 2.3 现场工作 → 免打卡，直接返回 'worksite'
        if (employee.workLocation === 'WORKSITE') {
            return 'worksite';
        }

        // ========================================
        // 第三步：OFFICE 员工必须打卡，根据打卡时间判定状态
        // ========================================

        // 3.1 未打上班卡 → 缺勤
        if (!checkInTime) {
            return 'absent';
        }

        // 3.2 解析规则时间
        const [stdInHour, stdInMin] = rule.standardCheckIn.split(':').map(Number); // 09:00
        const [stdOutHour, stdOutMin] = rule.standardCheckOut.split(':').map(Number); // 18:00

        // 3.3 计算关键时间点
        const standardCheckIn = new Date(today);
        standardCheckIn.setHours(stdInHour, stdInMin, 0, 0); // 09:00

        const standardCheckOut = new Date(today);
        standardCheckOut.setHours(stdOutHour, stdOutMin, 0, 0); // 18:00

        const lunchStart = new Date(today);
        lunchStart.setHours(12, 0, 0, 0); // 12:00

        const checkOutDeadline = new Date(today);
        checkOutDeadline.setHours(19, 0, 0, 0); // 19:00

        // 3.4 判定上班状态（迟到 vs 正常）
        let baseStatus = 'present';
        if (checkInTime > standardCheckIn) {
            baseStatus = 'late'; // 迟到
        }

        // 3.5 检查是否忘记打下班卡（严格处理：视为缺勤）
        if (!checkOutTime) {
            // 如果当前时间已经超过19:00，且没有下班打卡 → 缺勤
            if (today > checkOutDeadline) {
                return 'absent';
            }
            // 否则还在正常工作时间内，返回基础状态
            return baseStatus;
        }

        // 3.6 检查是否早退
        if (checkOutTime < standardCheckOut) {
            // 如果在午休时间段打卡离开 → 早退
            if (checkOutTime <= lunchStart) {
                return 'early_leave';
            }
            // 其他18:00之前打卡 → 早退
            return 'early_leave';
        }

        // 3.7 正常情况，返回基础状态（present 或 late）
        return baseStatus;
    }

    /**
     * 判断日期是否在某个期限内
     */
    private static isDateInPeriod(target: Date, start: Date | null, end: Date | null): boolean {
        const time = target.getTime();
        const startMatch = !start || time >= start.getTime();
        const endMatch = !end || time <= end.getTime();
        return startMatch && endMatch;
    }
}
