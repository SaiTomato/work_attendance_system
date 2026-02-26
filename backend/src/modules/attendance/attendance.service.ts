import { attendanceRepo } from './attendance.repo';
import { AttendanceEngine } from '../../services/attendanceEngine';
import { attendanceAudit } from './attendance.audit';
import prisma from '../../db';

export class AttendanceService {
    async getDailyRecords(dateStr?: string, filter?: string) {
        const date = dateStr ? new Date(dateStr) : new Date();
        return await attendanceRepo.getDailyRecords(date, filter);
    }

    async getAllLogsToday(page: number = 1, limit: number = 10, search?: string) {
        return await attendanceRepo.getAllLogsToday(page, limit, search);
    }

    async getDashboardStats() {
        const today = new Date();
        return await attendanceRepo.getDailyStats(today);
    }

    async getEmployeeHistory(employeeId: string) {
        return await attendanceRepo.getEmployeeHistory(employeeId);
    }

    async getAuditLogs(targetId: string) {
        return await attendanceAudit.getLogsByTargetId(targetId);
    }

    async createAttendance(data: {
        employeeId: string;
        recorder: string;
        action?: 'PUNCH' | 'AUTO' | 'MANUAL';
        targetStatus?: string; // 管理者による手動指定時のみ使用
        reason?: string;
    }) {
        // 1. 従業員情報の取得
        const employee = await prisma.employee.findUnique({
            where: { employeeId: data.employeeId }
        });
        if (!employee) throw new Error('従業員が見つかりません');

        // 2. 現在のルールの取得
        const rule = await prisma.attendanceRule.findFirst({ where: { isDefault: true } });
        if (!rule) throw new Error('システムルールが設定されていません');

        // 3. 当日の最新ステータスを取得
        const latest = await attendanceRepo.getLatestRecordToday(data.employeeId);
        const currentStatus = latest?.status || null;

        // 4. 次のステータスを判定
        let nextStatus: string;
        if (data.action === 'MANUAL' && data.targetStatus) {
            nextStatus = data.targetStatus;
        } else {
            nextStatus = AttendanceEngine.determineNextStatus(
                currentStatus,
                new Date(),
                rule,
                data.action || 'PUNCH'
            );
        }

        // 5. 重複または不正な遷移のチェック
        if (nextStatus === currentStatus && data.action === 'PUNCH') {
            throw new Error(`現在のステータスは既に [${currentStatus}] です。再操作の必要はありません`);
        }

        // 6. レコードの追加
        const newRecord = await attendanceRepo.createAttendance({
            employeeId: data.employeeId,
            status: nextStatus,
            recorder: data.recorder,
            reason: data.reason
        });

        // 7. 管理者による手動修正の場合、監査ログを記録
        if (data.action === 'MANUAL') {
            await attendanceAudit.log({
                targetId: newRecord.id,
                action: 'MANUAL_FIX',
                before: latest,
                after: newRecord,
                operatedBy: data.recorder,
                reason: data.reason
            });
        }

        return newRecord;
    }

    /**
     * 【毎日全員リセット】 07:00 ロジック
     */
    async dailyReset() {
        // 1. 全ての有効な従業員を取得
        const activeEmployees = await prisma.employee.findMany({
            where: { status: 'ACTIVE', deletedAt: null }
        });

        const now = new Date();
        const day = now.getDay();
        if (day === 0 || day === 6) {
            console.log('[CRON] 週末のため、リセットをスキップします。');
            return { count: 0, skipped: true };
        }

        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        let updatedCount = 0;
        for (const emp of activeEmployees) {
            // 2. 冪等性チェックとステータス補正
            const existingToday = await attendanceRepo.getLatestRecordToday(emp.employeeId);

            // 3. 有効な休暇申請があるか確認 (タイムゾーン考慮)
            const activeLeave = await prisma.leaveRequest.findFirst({
                where: {
                    employeeId: emp.employeeId,
                    status: 'APPROVED',
                    startDate: { lte: endOfToday },
                    endDate: { gte: startOfToday }
                }
            });

            if (activeLeave) {
                console.log(`[dailyReset] Found active leave for ${emp.employeeId}: ${activeLeave.type}`);
            }

            // 既に「実質的な」操作記録（出勤・退勤・外出等）がある場合は自動上書きしない
            if (existingToday && !existingToday.status.startsWith('未出勤')) {
                continue;
            }

            // 既に「未出勤」が記録されており、休暇申請もない場合はスキップ
            if (existingToday && existingToday.status.startsWith('未出勤') && !activeLeave) {
                continue;
            }

            let currentDutyStatus = emp.dutyStatus;
            let currentWorkLocation = emp.workLocation;

            // 4. 有効な休暇がある場合、従業員ステータスを更新し勤怠を設定
            if (activeLeave) {
                const mappedStatus = activeLeave.type === 'PAID' ? 'PAID_LEAVE' : 'UNPAID_LEAVE';
                if (emp.dutyStatus !== mappedStatus) {
                    await prisma.employee.update({
                        where: { id: emp.id },
                        data: { dutyStatus: mappedStatus, dutyStatusEndDate: activeLeave.endDate }
                    });
                }
                currentDutyStatus = mappedStatus;
            } else if (emp.dutyStatusEndDate && emp.dutyStatusEndDate < startOfToday) {
                // 休暇期間終了または適用外の場合、通常勤務にリセット
                await prisma.employee.update({
                    where: { id: emp.id },
                    data: { dutyStatus: 'NORMAL', dutyStatusEndDate: null }
                });
                currentDutyStatus = 'NORMAL';
            }

            // 5. ステータスに基づき初期値を決定
            let targetStatus = '未出勤-通常';
            const recorder = 'SYSTEM';

            if (currentDutyStatus === 'PAID_LEAVE') {
                targetStatus = '休暇-有給';
            } else if (currentDutyStatus === 'UNPAID_LEAVE') {
                targetStatus = '休暇-無給';
            } else {
                // 通常勤務の場合、勤務場所を確認
                if (currentWorkLocation === 'REMOTE') {
                    targetStatus = '外出-リモート';
                } else if (currentWorkLocation === 'WORKSITE') {
                    targetStatus = '外出-現場';
                } else {
                    targetStatus = '未出勤-通常';
                }
            }

            await attendanceRepo.createAttendance({
                employeeId: emp.employeeId,
                status: targetStatus,
                recorder: recorder,
                recordTime: now,
                reason: 'Daily System Reset'
            });
            updatedCount++;
        }

        return { count: updatedCount };
    }

    /**
     * 【自動欠勤判定】 14:00 ロジック
     */
    async checkAbsence() {
        const now = new Date();
        // [通常勤務] かつ [オフィス出社] の従業員のみを対象に判定
        const targetEmployees = await prisma.employee.findMany({
            where: {
                status: 'ACTIVE',
                dutyStatus: 'NORMAL',
                workLocation: 'OFFICE',
                deletedAt: null
            }
        });

        let count = 0;
        for (const emp of targetEmployees) {
            const latest = await attendanceRepo.getLatestRecordToday(emp.employeeId);
            // 14:00時点で「未出勤」状態の場合、欠勤と判定
            if (!latest || latest.status.startsWith('未出勤')) {
                await attendanceRepo.createAttendance({
                    employeeId: emp.employeeId,
                    status: '異常-欠勤',
                    recorder: 'SYSTEM_ABSENCE_CHECK',
                    recordTime: now,
                    reason: '14:00を過ぎても打刻がないため、システムにより欠勤と判定'
                });
                count++;
            }
        }
        return { count };
    }

    /**
     * 【一括自動退勤】現在出勤中の全員を退勤処理
     */
    async autoCheckoutAll() {
        // [通常勤務] かつ [オフィス出社] の従業員のみを対象に判定
        const targetEmployees = await prisma.employee.findMany({
            where: {
                status: 'ACTIVE',
                dutyStatus: 'NORMAL',
                workLocation: 'OFFICE',
                deletedAt: null
            }
        });

        let count = 0;
        const now = new Date();
        for (const emp of targetEmployees) {
            const latest = await attendanceRepo.getLatestRecordToday(emp.employeeId);
            // 「出勤」状態の人だけを退勤させる
            if (latest?.status.startsWith('出勤')) {
                await this.createAttendance({
                    employeeId: emp.employeeId,
                    recorder: 'SYSTEM_AUTO_CHECKOUT',
                    action: 'AUTO'
                });
                count++;
            }
        }
        return { count };
    }

    async updateAttendance(id: string, status: string, operator: string, reason: string) {
        // 新システムでは、「更新」は「管理者指定ステータスの追加」を意味します。

        // 1. 仮想ID (まだ今日一度も打刻がない人) の処理
        if (id.startsWith('missing-')) {
            const employeeId = id.replace('missing-', '');
            console.log(`[Service] Handling virtual ID fix for employee: ${employeeId}`);
            return await this.createAttendance({
                employeeId: employeeId,
                recorder: operator,
                action: 'MANUAL',
                targetStatus: status,
                reason: reason
            });
        }

        // 2. 実レコードIDの処理
        const oldRecord = await prisma.attendance.findUnique({ where: { id } });
        if (!oldRecord) throw new Error('データベース上にレコードが見つかりません');

        return await this.createAttendance({
            employeeId: oldRecord.employeeId,
            recorder: operator,
            action: 'MANUAL',
            targetStatus: status,
            reason: reason
        });
    }

    async deleteAttendance(id: string, operator: string): Promise<boolean> {
        try {
            await prisma.attendance.update({
                where: { id },
                data: { status: 'DELETED-' + operator }
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 承認された休暇を従業員ステータスおよび本日の勤怠レコードに同期
     */
    async syncLeaveToAttendance(leaveRequestId: string) {
        const leave = await prisma.leaveRequest.findUnique({
            where: { id: leaveRequestId },
            include: { employee: true }
        });

        if (!leave || leave.status !== 'APPROVED') return;

        // 1. 従業員の長期ステータスを更新
        const dutyStatusMap: any = {
            'PAID': 'PAID_LEAVE',
            'UNPAID': 'UNPAID_LEAVE'
        };

        await prisma.employee.update({
            where: { employeeId: leave.employeeId },
            data: {
                dutyStatus: dutyStatusMap[leave.type] || 'NORMAL',
                dutyStatusEndDate: leave.endDate
            }
        });

        // 2. 休暇期間に本日が含まれる場合、即座に勤怠レコードを反映 (明日のリセットを待たずに)
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        if (leave.startDate <= endOfToday && leave.endDate >= startOfToday) {
            const statusLabel = leave.type === 'PAID' ? '休暇-有給' : '休暇-無給';
            await attendanceRepo.createAttendance({
                employeeId: leave.employeeId,
                status: statusLabel,
                recorder: 'SYSTEM_LEAVE_SYNC',
                reason: `休暇承認による同期: ${leave.reason || ''}`
            });
        }
    }

    /**
     * 勤怠データを CSV 形式で出力
     */
    async exportAttendanceData(startDateStr?: string, endDateStr?: string, search?: string) {
        const now = new Date();
        const start = startDateStr ? new Date(startDateStr) : new Date();
        start.setHours(0, 0, 0, 0);

        const end = endDateStr ? new Date(endDateStr) : new Date();
        end.setHours(23, 59, 59, 999);

        const records = await attendanceRepo.getRecordsByRange(start, end, search);

        // CSV 行の生成
        const header = ['従業員番号', '氏名', '打刻日時', '状態', '記録者', '備考/理由'];
        const rows = records.map(r => [
            r.employeeId,
            r.employee.name,
            r.recordTime.toLocaleString('ja-JP', { hour12: false }),
            r.status,
            r.recorder,
            (r.reason || '').replace(/\n/g, ' ')
        ]);

        const csvContent = [
            header.join(','),
            ...rows.map(row => row.map(cell => {
                const str = String(cell || '');
                return `"${str.replace(/"/g, '""')}"`;
            }).join(','))
        ].join('\n');

        return {
            filename: `勤怠データ出力_${start.toISOString().split('T')[0]}.csv`,
            content: csvContent
        };
    }
}

export const attendanceService = new AttendanceService();
