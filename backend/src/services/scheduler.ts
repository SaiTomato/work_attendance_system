import cron from 'node-cron';
import { attendanceService } from '../modules/attendance/attendance.service';

/**
 * 考勤系统自动调度任务
 */
export const initScheduler = () => {
    console.log('[Scheduler] 考勤自动执行器已挂载');

    // 1. 每天 07:00 全员初始化 (未出勤状态追加)
    // 0 7 * * * 表示 每天的 7点0分0秒
    cron.schedule('0 7 * * *', async () => {
        console.log('[CRON] 07:00 全员状态初始化执行中...');
        try {
            const result = await attendanceService.dailyReset();
            console.log(`[CRON] 初始化完成，处理人数: ${result.count}`);
        } catch (error) {
            console.error('[CRON] 07:00 重置任务失败:', error);
        }
    });

    // 2. 每天 14:00 自动判定缺勤
    cron.schedule('0 14 * * *', async () => {
        console.log('[CRON] 14:00 自动判定缺勤执行中...');
        try {
            const result = await attendanceService.checkAbsence();
            console.log(`[CRON] 缺勤判定完成，异常标记人数: ${result.count}`);
        } catch (error) {
            console.error('[CRON] 14:00 判定任务失败:', error);
        }
    });

    // 3. 每天 20:00 自动退勤 (晚退/自动退勤判定)
    cron.schedule('0 20 * * *', async () => {
        console.log('[CRON] 20:00 自动退勤逻辑执行中...');
        try {
            const result = await attendanceService.autoCheckoutAll();
            console.log(`[CRON] 自动退勤完成，处理人数: ${result.count}`);
        } catch (error) {
            console.error('[CRON] 20:00 退勤任务失败:', error);
        }
    });
};
