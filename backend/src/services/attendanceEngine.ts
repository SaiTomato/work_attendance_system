import { AttendanceRule, Employee, WorkLocation, EmployeeStatus } from '@prisma/client';

export class AttendanceEngine {
    /**
     * 根据打卡时间、规则以及员工当前状态计算状态
     * @param checkInTime 实际打卡时间
     * @param rule 适用的考勤规则
     * @param employee 员工档案
     * @returns status: 'present' | 'late' | 'absent' | 'leave' | 'wfh' | 'worksite' | 'prospective'
     */
    static calculateStatus(checkInTime: Date | null, rule: AttendanceRule, employee: Employee): string {
        const today = new Date();
        const todayNoTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // 1. 处理状态自动转换 (Smart Status)
        let currentStatus = employee.status;

        // 如果是内定人员，且今天是入职日期或之后，自动视为“在职”进行考勤计算
        if (currentStatus === 'PROSPECTIVE' && employee.hireDate) {
            const hireDateNoTime = new Date(employee.hireDate.getFullYear(), employee.hireDate.getMonth(), employee.hireDate.getDate());
            if (todayNoTime >= hireDateNoTime) {
                currentStatus = 'ACTIVE';
            } else {
                return 'prospective';
            }
        }

        // 2. 处理休假 (ON_LEAVE)
        if (currentStatus === 'ON_LEAVE') {
            // 如果设定了期限，检查今天是否在期限内
            const onLeave = this.isDateInPeriod(today, employee.leaveStartDate, employee.leaveEndDate);
            if (onLeave) return 'leave';
        }

        // 3. 处理已离职
        if (employee.status === 'RESIGNED' || employee.status === 'TERMINATED') {
            return 'inactive';
        }

        // 4. 处理打卡地点模式 (Remote / Worksite)
        let baseStatus = 'present';
        if (employee.workLocation !== 'OFFICE') {
            const inPeriod = this.isDateInPeriod(today, employee.locationStartDate, employee.locationEndDate);
            if (inPeriod) {
                baseStatus = employee.workLocation === 'REMOTE' ? 'wfh' : 'worksite';
            }
        }

        // --- 开始计算打卡时间逻辑 ---
        if (!checkInTime) return 'absent';

        const [stdHour, stdMin] = rule.standardCheckIn.split(':').map(Number);
        const deadline = new Date(checkInTime);
        deadline.setHours(stdHour, stdMin, 0, 0);

        const graceDeadline = new Date(deadline.getTime() + rule.lateGracePeriod * 60 * 1000);

        if (checkInTime <= graceDeadline) {
            return baseStatus; // 返回 present, wfh 或 worksite
        }

        const absentDeadline = new Date(deadline.getTime() + rule.absentThreshold * 60 * 1000);
        if (checkInTime > absentDeadline) {
            return 'absent';
        }

        return 'late';
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
