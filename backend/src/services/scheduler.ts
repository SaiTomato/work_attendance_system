import cron from 'node-cron';
import { attendanceService } from '../modules/attendance/attendance.service';

/**
 * 勤怠システム自動スケジューラ
 */
export const initScheduler = () => {
    console.log('[Scheduler] 勤怠自動スケジューラが起動しました');

    // 0. 起動時即時チェック (サーバー停止中にタスク時間が過ぎてしまった場合の補填)
    const runStartupCheck = async () => {
        console.log('[Scheduler] 起動時の勤怠補填チェックを実行中...');
        const now = new Date();
        const hour = now.getHours();

        try {
            // 必然的に実行 (今日の土台作成)
            const resetRes = await attendanceService.dailyReset();
            console.log(`[Scheduler] 起動時リセット完了。初期化人数: ${resetRes.count}`);

            // 14:00 を過ぎて起動した場合、欠勤判定を実行
            if (hour >= 14) {
                const absenceRes = await attendanceService.checkAbsence();
                console.log(`[Scheduler] 14:00 補填判定完了。欠勤フラグ人数: ${absenceRes.count}`);
            }

            // 20:00 を過ぎて起動した場合、自動退勤を実行
            if (hour >= 20) {
                const checkoutRes = await attendanceService.autoCheckoutAll();
                console.log(`[Scheduler] 20:00 補填判定完了。自動退勤人数: ${checkoutRes.count}`);
            }
        } catch (err) {
            console.error('[Scheduler] 起動時チェック失敗:', err);
        }
    };
    runStartupCheck();

    // 1. 毎日 07:00 全員初期化 (未出勤ステータスの追加)
    cron.schedule('0 7 * * *', async () => {
        console.log('[CRON] 07:00 全員ステータスの初期化を開始します...');
        try {
            const result = await attendanceService.dailyReset();
            console.log(`[CRON] 初期化完了。処理人数: ${result.count}`);
        } catch (error) {
            console.error('[CRON] 07:00 リセットタスク失敗:', error);
        }
    });

    // 2. 毎日 14:00 自動欠勤判定
    cron.schedule('0 14 * * *', async () => {
        console.log('[CRON] 14:00 自動欠勤判定を開始します...');
        try {
            const result = await attendanceService.checkAbsence();
            console.log(`[CRON] 欠勤判定完了。異常フラグ付与人数: ${result.count}`);
        } catch (error) {
            console.error('[CRON] 14:00 判定タスク失敗:', error);
        }
    });

    // 3. 毎日 20:00 自動退勤処理
    cron.schedule('0 20 * * *', async () => {
        console.log('[CRON] 20:00 自動退勤ロジックを実行中...');
        try {
            const result = await attendanceService.autoCheckoutAll();
            console.log(`[CRON] 自動退勤完了。処理人数: ${result.count}`);
        } catch (error) {
            console.error('[CRON] 20:00 退勤タスク失敗:', error);
        }
    });
};
