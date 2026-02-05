import { Request } from 'express';

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}

export type UserRole = 'admin' | 'manager' | 'hr' | 'viewer';

export interface UserPayload {
    id: string;
    username: string;
    role: UserRole;
    departmentId?: string;
}

// 对应 Prisma Schema 的职位枚举
export type Position = 'STAFF' | 'SUB_MANAGER' | 'MANAGER' | 'GENERAL_AFFAIRS' | 'CEO';

// 对应 Prisma Schema 的状态枚举
export type EmployeeStatus = 'PROSPECTIVE' | 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED';

export type WorkLocation = 'OFFICE' | 'REMOTE' | 'WORKSITE';

export interface DailyStats {
    date: string;
    totalEmployees: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
    unattended: number;
    successOut: number; // 新增：正常下班的人数
    exceptions: number;
}

export interface AttendanceRecord {
    id: string;
    employeeId: string;
    employeeName: string;
    date: string;
    status: string; // 'present', 'late', 'absent', 'leave', 'wfh', 'worksite'
    checkInTime?: string;
    checkOutTime?: string;
}

export interface EmployeeProfile {
    id: string;
    employeeId: string;
    name: string;
    position: Position;
    status: EmployeeStatus;
    workLocation: WorkLocation;
    departmentName?: string;
    hireDate?: string;
    leaveEndDate?: string;
    locationEndDate?: string;
}
