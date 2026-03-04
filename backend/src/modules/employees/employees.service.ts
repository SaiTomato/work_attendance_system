import prisma from '../../db';
import { EmployeeStatus, Position, WorkLocation } from '@prisma/client';
import { attendanceService } from '../attendance/attendance.service';

export class EmployeeService {
    /**
     * 従業員一覧を取得。部署、ステータス、検索キーワードによるフィルタリングに対応 - ページネーション・ソート対応
     */
    async listEmployees(filters: {
        departmentId?: string;
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
        sortField?: string;
        sortOrder?: 'asc' | 'desc';
    }) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const sortField = filters.sortField || 'employeeId';
        const sortOrder = filters.sortOrder || 'asc';

        const where: any = { deletedAt: null };

        if (filters.departmentId && filters.departmentId !== '') {
            where.departmentId = filters.departmentId;
        }

        if (filters.status && filters.status !== '') {
            where.status = filters.status;
        }

        if (filters.search && filters.search !== '') {
            const search = filters.search.toUpperCase();
            const searchLower = filters.search.toLowerCase();

            // Enumへのマッピング試行 (英語 & 日本語 & 中国語)
            const statusMatch = ['PROSPECTIVE', 'ACTIVE', 'RESIGNED'].find(s => s === search) ||
                (search === '内定' || search === '内定者' ? 'PROSPECTIVE' :
                    search === '在職' || search === '在职' ? 'ACTIVE' :
                        search === '退職' || search === '离职' ? 'RESIGNED' : undefined);

            const locationMatch = ['OFFICE', 'REMOTE', 'WORKSITE'].find(l => l === search) ||
                (search === 'オフィス' ? 'OFFICE' :
                    search === 'リモート' ? 'REMOTE' :
                        search === '現場' ? 'WORKSITE' : undefined);

            const positionMatch = ['STAFF', 'SUB_MANAGER', 'MANAGER', 'GENERAL_AFFAIRS', 'CEO'].find(p => p === search) ||
                (searchLower.includes('社員') || searchLower.includes('员工') ? 'STAFF' :
                    searchLower.includes('係長') || searchLower.includes('主任') ? 'SUB_MANAGER' :
                        searchLower.includes('部長') || searchLower.includes('经理') ? 'MANAGER' :
                            searchLower.includes('総務') || searchLower.includes('人事') ? 'GENERAL_AFFAIRS' :
                                searchLower.includes('代表') || searchLower.includes('社長') || searchLower.includes('总裁') ? 'CEO' : undefined);

            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { employeeId: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
                { department: { name: { contains: filters.search, mode: 'insensitive' } } }
            ];

            if (statusMatch) where.OR.push({ status: statusMatch });
            if (locationMatch) where.OR.push({ workLocation: locationMatch });
            if (positionMatch) where.OR.push({ position: positionMatch });
        }

        const total = await prisma.employee.count({ where });

        // ソート設定
        const orderBy: any = {};
        if (sortField === 'departmentName') {
            orderBy.department = { name: sortOrder };
        } else {
            orderBy[sortField] = sortOrder;
        }

        const employees = await prisma.employee.findMany({
            where,
            include: {
                department: { select: { name: true, code: true } },
                user: { select: { username: true, role: true } }
            },
            orderBy,
            skip: (page - 1) * limit,
            take: limit
        });

        return { employees, total };
    }

    /**
     * 従業員データをCSV形式で出力
     */
    async exportEmployeesCsv(filters: { departmentId?: string; status?: string; search?: string }) {
        // エクスポート時は全件取得するため大きなリミットを指定
        const { employees } = await this.listEmployees({ ...filters, page: 1, limit: 10000 });

        const header = ['社員ID', '氏名', '性別', '年齢', 'メール', '部署', '役職', '状態', '勤務地', '入社日'];
        const rows = employees.map((e: any) => [
            e.employeeId,
            e.name,
            e.gender === 'MALE' ? '男' : e.gender === 'FEMALE' ? '女' : '他',
            e.age,
            e.email,
            e.department?.name || '-',
            e.position,
            e.status,
            e.workLocation,
            e.hireDate ? (e.hireDate as Date).toISOString().split('T')[0] : '-'
        ]);

        const csvContent = [
            "\ufeff" + header.join(','), // BOM for Japanese Excel
            ...rows.map((row: any[]) => row.map((cell: any) => {
                const str = String(cell || '');
                return `"${str.replace(/"/g, '""')}"`;
            }).join(','))
        ].join('\n');

        return {
            filename: `従業員データ_${new Date().toISOString().split('T')[0]}.csv`,
            content: csvContent
        };
    }

    /**
     * 新規従業員プロファイルを作成 (監査ログを含む)
     */
    async createEmployee(data: any, operator: string) {
        // 1. グローバルな一意性チェック (退職・削除済み従業員のIDも再利用不可)
        const existing = await prisma.employee.findFirst({
            where: { employeeId: data.employeeId }
        });
        if (existing) {
            throw new Error(`従業員ID [${data.employeeId}] は既に使用されています（退職・削除済みを含む）。重複は許可されません。`);
        }

        return await prisma.$transaction(async (tx) => {
            // 1. 従業員プロファイルの作成
            const newEmp = await tx.employee.create({
                data: {
                    employeeId: data.employeeId,
                    name: data.name,
                    gender: data.gender as any,
                    age: parseInt(data.age) || 0,
                    phone: data.phone || '',
                    email: data.email || '',
                    position: data.position || 'STAFF',
                    status: data.status || 'PROSPECTIVE',
                    dutyStatus: data.dutyStatus || 'NORMAL',
                    dutyStatusEndDate: data.dutyStatusEndDate ? new Date(data.dutyStatusEndDate) : null,
                    departmentId: data.departmentId,
                    hireDate: data.hireDate ? new Date(data.hireDate) : null,
                    workLocation: data.workLocation || 'OFFICE',
                }
            });

            // 2. ログインアカウント (User) の自動生成
            // デフォルトユーザー名: 従業員ID, デフォルトパスワード: pass123
            const bcrypt = require('bcryptjs');
            const defaultHashedPassword = await bcrypt.hash('pass123', 10);

            await tx.user.create({
                data: {
                    username: data.employeeId,
                    password: defaultHashedPassword,
                    role: 'viewer', // デフォルトは一般従業員ロール
                    employeeId: newEmp.employeeId, // UUIDではなく論理IDで紐付け
                    departmentId: data.departmentId // 所属部署を同期
                }
            });

            // 3. 監査ログの記録
            try {
                await tx.auditLog.create({
                    data: {
                        targetId: newEmp.id,
                        action: 'CREATE',
                        after: newEmp as any,
                        operatedBy: operator,
                        reason: 'Manual employee registration'
                    }
                });
            } catch (e) {
                console.warn('[EmployeeService] Audit log creation failed:', e);
            }

            // 4. 初回の勤怠ステータスを同期 (本日分があれば)
            await attendanceService.syncProfileToAttendance(newEmp.employeeId);

            return newEmp;
        });
    }

    /**
     * 従業員情報を更新
     */
    async updateEmployee(id: string, updateData: any, operator: string) {
        return await prisma.$transaction(async (tx) => {
            const before = await tx.employee.findUnique({ where: { id } });
            if (!before) throw new Error('従業員が見つかりません');

            // 1. ホワイトリストによるフィルタリング
            const payload: any = {};
            const fields = [
                'name', 'gender', 'age', 'phone', 'email',
                'position', 'status', 'dutyStatus', 'departmentId', 'workLocation',
                'employeeId'
            ];

            fields.forEach(f => {
                if (updateData[f] !== undefined) {
                    if (f === 'age' && updateData[f] !== null) {
                        payload[f] = parseInt(updateData[f]);
                    } else {
                        payload[f] = updateData[f];
                    }
                }
            });

            // 2. 日付処理のヘルパー
            const parseDate = (val: any) => {
                if (!val || val === '') return null;
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : d;
            };

            const dateFields = [
                'hireDate', 'dutyStatusEndDate'
            ];

            dateFields.forEach(df => {
                if (updateData[df] !== undefined) {
                    payload[df] = parseDate(updateData[df]);
                }
            });

            // 3. 更新の実行
            const updated = await tx.employee.update({
                where: { id },
                data: payload
            });

            // ステータス同期ロジック: 退職（RESIGNED）に変更された場合、ログインアカウントを自動削除
            if (payload.status === 'RESIGNED') {
                console.log(`[EmployeeService] Status changed to RESIGNED for ${id}. Auto-removing user account.`);
                await tx.user.deleteMany({
                    where: { employeeId: updated.employeeId }
                });
            }

            // 4. 監査ログの記録
            try {
                await tx.auditLog.create({
                    data: {
                        targetId: id,
                        action: 'UPDATE',
                        before: JSON.parse(JSON.stringify(before)),
                        after: JSON.parse(JSON.stringify(updated)),
                        operatedBy: operator,
                        reason: updateData.reason || 'Manual profile update via OS'
                    }
                });
            } catch (e) {
                console.warn('[EmployeeService] Audit log update failed:', e);
            }

            // 5. 勤怠ステータスの自動同期 (勤務地や就業状態の変更を即座に反映)
            await attendanceService.syncProfileToAttendance(updated.employeeId);

            return updated;
        });
    }

    /**
     * 従業員への個別勤怠ルールの割り当て (将来用)
     */
    async assignSpecialRule(employeeId: string, ruleId: string) {
        // 現行のスキーマでは Employee と Rule の直接の紐付けがないため未実装
        console.warn('assignSpecialRule is not implemented in current schema');
        return null;
    }

    /**
     * 従業員情報を削除 (論理削除)
     * 同時に関連するログインアカウントも削除
     */
    async deleteEmployee(id: string, operator: string) {
        return await prisma.$transaction(async (tx) => {
            const employee = await tx.employee.findUnique({ where: { id } });
            if (!employee) throw new Error('従業員が見つかりません');

            // 1. 関連するユーザーアカウントを削除 (ログイン不可にする)
            if (employee.employeeId) {
                await tx.user.deleteMany({
                    where: { employeeId: employee.employeeId }
                });
            }

            // 2. 論理削除の実行
            const deleted = await tx.employee.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            // 3. 監査ログの記録
            try {
                await tx.auditLog.create({
                    data: {
                        targetId: id,
                        action: 'DELETE_EMPLOYEE',
                        before: JSON.parse(JSON.stringify(employee)),
                        after: { status: 'DELETED' },
                        operatedBy: operator,
                        reason: 'Administrative employee deletion'
                    }
                });
            } catch (e) {
                console.warn('[EmployeeService] Audit log deletion failed:', e);
            }

            return deleted;
        });
    }
}

export const employeeService = new EmployeeService();
