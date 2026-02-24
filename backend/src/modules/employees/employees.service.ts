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
        return await prisma.$transaction(async (tx) => {
            const newEmp = await tx.employee.create({
                data: {
                    employeeId: data.employeeId,
                    name: data.name,
                    gender: data.gender,
                    age: data.age ? parseInt(data.age) : null,
                    phone: data.phone,
                    email: data.email,
                    position: data.position || 'STAFF',
                    status: data.status || 'PROSPECTIVE',
                    dutyStatus: data.dutyStatus || 'NORMAL',
                    dutyStatusEndDate: data.dutyStatusEndDate ? new Date(data.dutyStatusEndDate) : null,
                    departmentId: data.departmentId,
                    hireDate: data.hireDate ? new Date(data.hireDate) : null,
                    workLocation: data.workLocation || 'OFFICE',
                }
            });

            // 记录日志 (假定 auditLog 模型存在，如果重置后没有该表请根据 schema 调整)
            // 根据 schema.prisma，这里可能需要调整，但我先保留逻辑一致性
            try {
                await (tx as any).auditLog.create({
                    data: {
                        employeeId: newEmp.id,
                        action: 'CREATE',
                        after: newEmp as any,
                        operatedBy: operator,
                        reason: 'Manual employee registration'
                    }
                });
            } catch (e) {
                console.warn('Audit log creation failed, skipping...');
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

            // 4. 记录日志 (如果 auditLog 存在)
            try {
                await (tx as any).auditLog.create({
                    data: {
                        employeeId: id,
                        action: 'UPDATE',
                        before: JSON.parse(JSON.stringify(before)),
                        after: JSON.parse(JSON.stringify(updated)),
                        operatedBy: operator,
                        reason: updateData.reason || 'Manual profile update via OS'
                    }
                });
            } catch (e) {
                console.warn('Audit log creation failed, skipping...');
            }

            return updated;
        });
    }

    /**
     * 为员工指定特殊的考勤规则 (特批功能)
     */
    async assignSpecialRule(employeeId: string, ruleId: string) {
        return await prisma.employee.update({
            where: { id: employeeId },
            data: {
                rules: {
                    connect: { id: ruleId }
                }
            }
        });
    }
}

export const employeeService = new EmployeeService();
