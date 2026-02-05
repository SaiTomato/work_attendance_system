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
                    position: data.position || 'STAFF',
                    status: data.status || 'PROSPECTIVE',
                    departmentId: data.departmentId,
                    hireDate: data.hireDate ? new Date(data.hireDate) : null,
                    workLocation: data.workLocation || 'OFFICE',
                }
            });

            // 记录日志
            await tx.auditLog.create({
                data: {
                    employeeId: newEmp.id,
                    action: 'CREATE',
                    after: newEmp as any,
                    operatedBy: operator,
                    reason: 'Manual employee registration'
                }
            });

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
                'name', 'position', 'status', 'departmentId', 'workLocation',
                'employeeId' // 允许修改工号
            ];

            fields.forEach(f => {
                if (updateData[f] !== undefined) payload[f] = updateData[f];
            });

            // 2. 健壮的日期处理函数
            const parseDate = (val: any) => {
                if (!val || val === '') return null;
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : d;
            };

            const dateFields = [
                'hireDate', 'terminationDate', 'leaveStartDate',
                'leaveEndDate', 'locationStartDate', 'locationEndDate'
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

            // 4. 记录日志 (确保序列化安全)
            await tx.auditLog.create({
                data: {
                    employeeId: id,
                    action: 'UPDATE',
                    before: JSON.parse(JSON.stringify(before)),
                    after: JSON.parse(JSON.stringify(updated)),
                    operatedBy: operator,
                    reason: updateData.reason || 'Manual profile update via OS'
                }
            });

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
