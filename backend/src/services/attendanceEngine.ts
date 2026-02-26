import { AttendanceRule } from '@prisma/client';

export class AttendanceEngine {
    /**
     * 勤怠ステータスの遷移を判定する
     * @param currentStatus 現在の最新ステータス
     * @param now 判定日時
     * @param rule 勤怠ルール (09:00, 18:00等の基準点)
     * @param action 'PUNCH' (打刻) または 'AUTO' (システム自動実行) または 'MANUAL' (管理者)
     * @returns 遷移先のステータス
     */
    static determineNextStatus(
        currentStatus: string | null,
        now: Date,
        rule: AttendanceRule,
        action: 'PUNCH' | 'AUTO' | 'MANUAL' = 'PUNCH'
    ): string {
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        // 1. 管理者による手動操作の場合、直接受け取ったステータスを優先する
        if (action === 'MANUAL') return currentStatus || '未出勤-通常';

        // 2. 通常の遷移ロジック (状態マシン)

        // --- [未出勤] からの遷移 ---
        if (!currentStatus || currentStatus.startsWith('未出勤')) {
            if (action === 'PUNCH') {
                if (timeStr <= rule.standardCheckIn) return '出勤-通常';
                if (timeStr > rule.standardCheckIn && timeStr <= rule.windowEnd) return '出勤-遅刻';
                return '異常-欠勤'; // 14:00以降の打刻は欠勤扱い
            }
            if (action === 'AUTO' && timeStr > rule.windowEnd) {
                return '異常-欠勤';
            }
        }

        // --- [出勤] からの遷移 (退勤判定) ---
        if (currentStatus?.startsWith('出勤')) {
            if (action === 'PUNCH') {
                if (timeStr < rule.standardCheckOut) return '退勤-早退';
                return '退勤-通常';
            }
            // システムによる自動退勤 (AUTO) の場合、残業または自動退勤として記録
            if (action === 'AUTO') {
                return '退勤-残業';
            }
        }

        // --- 無効な遷移のブロック ---
        if (currentStatus?.startsWith('退勤')) {
            // 退勤済みの場合は打刻を無視（現在の状態を維持）
            return currentStatus;
        }

        return currentStatus || '未出勤-通常';
    }

    /**
     * ステータスに対応するカテゴリを取得 (Dashboard用)
     */
    static getStatusCategory(status: string): string {
        if (status.startsWith('未出勤')) return '未出勤';
        if (status.startsWith('出勤')) return '出勤';
        if (status.startsWith('退勤')) return '退勤';
        if (status.startsWith('異常')) return '異常';
        if (status.startsWith('休暇')) return '休暇';
        if (status.startsWith('外出')) return '外出';
        return '未出勤';
    }
}
