import cron from 'node-cron';
import { attendanceService } from '../modules/attendance/attendance.service';

/**
 * 勤怠システム自動スケジューラ
 */
export const initScheduler = () => {
    console.log('[Scheduler] 勤怠自動スケジューラが起動しました');

    // 0. 起動時即時チェック (07:00のリセット時にサーバーが停止していた場合の補填)
    console.log('[Scheduler] 起動時の勤怠チェックを実行中...');
    attendanceService.dailyReset()
        .then(result => console.log(`[Scheduler] 起動時チェック完了。初期化人数: ${result.count}`))
        .catch(err => console.error('[Scheduler] 起動時チェック失敗:', err));

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
