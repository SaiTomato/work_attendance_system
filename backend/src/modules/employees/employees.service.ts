import prisma from '../../db';
import { EmployeeStatus, Position, WorkLocation } from '@prisma/client';

export class EmployeeService {
    /**
     * 従業員一覧を取得。部署、ステータス、検索キーワードによるフィルタリングに対応
     */
    async listEmployees(filters: { departmentId?: string; status?: string; search?: string }) {
        const where: any = { deletedAt: null };

        if (filters.departmentId && filters.departmentId !== '') {
            where.departmentId = filters.departmentId;
        }

        if (filters.status && filters.status !== '') {
            where.status = filters.status;
        }

        if (filters.search && filters.search !== '') {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { employeeId: { contains: filters.search, mode: 'insensitive' } }
            ];
        }

        return await prisma.employee.findMany({
            where,
            include: {
                department: { select: { name: true, code: true } },
                user: { select: { username: true, role: true } }
            },
            orderBy: { employeeId: 'asc' }
        });
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
