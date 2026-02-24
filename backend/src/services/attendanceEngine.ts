import { AttendanceRule } from '@prisma/client';

export class AttendanceEngine {
    /**
     * 判断状态流转
     * @param currentStatus 员工当前最新的状态
     * @param now 判定发生的时间
     * @param rule 考勤规则 (包含 09:00, 18:00等关键点)
     * @param action 'PUNCH' (扫码/自助打卡) 或 'AUTO' (系统自动触发) 或 'MANUAL' (管理员)
     * @returns 目标状态
     */
    static determineNextStatus(
        currentStatus: string | null,
        now: Date,
        rule: AttendanceRule,
        action: 'PUNCH' | 'AUTO' | 'MANUAL' = 'PUNCH'
    ): string {
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        // 1. 如果是管理员手动操作，直接返回目标状态（这里假设外部已处理好具体字符串）
        if (action === 'MANUAL') return currentStatus || '未出勤-正常';

        // 2. 正常流转逻辑 (状态机)

        // --- 从 [未出勤] 开始的流转 ---
        if (!currentStatus || currentStatus.startsWith('未出勤')) {
            if (action === 'PUNCH') {
                if (timeStr <= rule.standardCheckIn) return '出勤-正常';
                if (timeStr > rule.standardCheckIn && timeStr <= rule.windowEnd) return '出勤-迟到';
                return '异常-缺勤'; // 超过 14:00 还打卡算缺勤
            }
            if (action === 'AUTO' && timeStr > rule.windowEnd) {
                return '异常-缺勤';
            }
        }

        // --- 从 [出勤] 开始的流转 (退勤判定) ---
        if (currentStatus?.startsWith('出勤')) {
            if (action === 'PUNCH') {
                if (timeStr < rule.standardCheckOut) return '退勤-早退';
                return '退勤-正常';
            }
            // 系统自动触发 (AUTO) 时，如果是管理员通过控制台触发，则直接判定为晚退/自动退勤
            if (action === 'AUTO') {
                return '退勤-晚退';
            }
        }

        // --- 非法状态拦截 ---
        if (currentStatus?.startsWith('退勤')) {
            // 已退勤状态下，打卡无反应（非法）
            return currentStatus;
        }

        return currentStatus || '未出勤-正常';
    }

    /**
     * 获取状态对应的分类卡片 (Dashboard 用)
     */
    static getStatusCategory(status: string): string {
        if (status.startsWith('未出勤')) return '未出勤';
        if (status.startsWith('出勤')) return '出勤';
        if (status.startsWith('退勤')) return '退勤';
        if (status.startsWith('异常')) return '异常';
        if (status.startsWith('休假')) return '休假';
        if (status.startsWith('公司外')) return '公司外';
        return '未出勤';
    }
}
