import prisma from '../../db';
import { EmployeeStatus, Position, WorkLocation } from '@prisma/client';

export class EmployeeService {
    /**
     * 获取所有员工列表，支持根据部门、状态、搜索关键词过滤
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
     * 创建新员工档案 (含日志记录)
     */
    async createEmployee(data: any, operator: string) {
        // 1. 全局唯一性检查 (即便已软删除的员工 ID 也不能复用)
        const existing = await prisma.employee.findFirst({
            where: { employeeId: data.employeeId }
        });
        if (existing) {
            throw new Error(`员工ID [${data.employeeId}] 已被占用（含已离职/删除员工），不可复用。`);
        }

        return await prisma.$transaction(async (tx) => {
            // 1. 创建员工档案
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

            // 2. 自动创建登录账号 (User)
            // 默认用户名: 员工ID, 默认密码: pass123
            const bcrypt = require('bcryptjs');
            const defaultHashedPassword = await bcrypt.hash('pass123', 10);

            await tx.user.create({
                data: {
                    username: data.employeeId,
                    password: defaultHashedPassword,
                    role: 'viewer', // 默认普通员工角色
                    employeeId: newEmp.employeeId, // 关联逻辑工号，而非 UUID
                    departmentId: data.departmentId // 默认所属部门
                }
            });

            // 3. 记录审计日志
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
     * 修改员工情报 (增强防御性编程)
     */
    async updateEmployee(id: string, updateData: any, operator: string) {
        return await prisma.$transaction(async (tx) => {
            const before = await tx.employee.findUnique({ where: { id } });
            if (!before) throw new Error('Employee not found');

            // 1. 严格白名单过滤
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

            // 2. 健壮的日期处理函数
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

            // 3. 执行更新
            const updated = await tx.employee.update({
                where: { id },
                data: payload
            });

            // 自动账号同步逻辑：如果是修改为离职状态，自动注销其登录账号
            if (payload.status === 'RESIGNED') {
                console.log(`[EmployeeService] Status changed to RESIGNED for ${id}. Auto-removing user account.`);
                await tx.user.deleteMany({
                    where: { employeeId: updated.employeeId }
                });
            }

            // 4. 记录日志 (如果 auditLog 存在)
            // 4. 记录日志
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
     * 为员工指定特殊的考勤规则 (功能暂留)
     */
    async assignSpecialRule(employeeId: string, ruleId: string) {
        // 目前 Schema 中 Employee 没有直接关联 Rule，如需此功能需调整 Schema
        console.warn('assignSpecialRule is not implemented in current schema');
        return null;
    }

    /**
     * 删除员工情报 (软删除)
     * 同时删除其关联的登录账号
     */
    async deleteEmployee(id: string, operator: string) {
        return await prisma.$transaction(async (tx) => {
            const employee = await tx.employee.findUnique({ where: { id } });
            if (!employee) throw new Error('Employee not found');

            // 1. 删除关联的用户账号 (确保不再能登录)
            if (employee.employeeId) {
                await tx.user.deleteMany({
                    where: { employeeId: employee.employeeId }
                });
            }

            // 2. 执行软删除
            const deleted = await tx.employee.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            // 3. 记录审计日志
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
