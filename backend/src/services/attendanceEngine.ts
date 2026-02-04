import { AttendanceRule } from '@prisma/client';

export class AttendanceEngine {
    /**
     * 根据打卡时间和规则计算状态
     * @param checkInTime 实际打卡时间
     * @param rule 适用的考勤规则
     * @returns status: 'present' | 'late' | 'absent'
     */
    static calculateStatus(checkInTime: Date | null, rule: AttendanceRule): string {
        if (!checkInTime) return 'absent';

        const [stdHour, stdMin] = rule.standardCheckIn.split(':').map(Number);

        // 构造当日的标准上班时间
        const deadline = new Date(checkInTime);
        deadline.setHours(stdHour, stdMin, 0, 0);

        // 加上宽限期 (Grace Period)
        const graceDeadline = new Date(deadline.getTime() + rule.lateGracePeriod * 60 * 1000);

        if (checkInTime <= graceDeadline) {
            return 'present';
        }

        // 超过缺勤阈值 (Absent Threshold)
        const absentDeadline = new Date(deadline.getTime() + rule.absentThreshold * 60 * 1000);
        if (checkInTime > absentDeadline) {
            return 'absent';
        }

        return 'late';
    }
}
