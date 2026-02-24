import { Request } from 'express';

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}

export type UserRole = 'admin' | 'manager' | 'hr' | 'viewer' | 'terminal';

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
    totalEmployees: number;
    unattended: number; // 未出勤
    present: number;    // 出勤
    checkout: number;   // 退勤
    exception: number;  // 异常
    leave: number;      // 休假
    outside: number;    // 公司外
}

export interface AttendanceRecord {
    id: string;
    employeeId: string;
    employeeName: string;
    status: string;
    recordTime: string | null;
    recorder: string;
    reason: string | null;
}

export interface EmployeeProfile {
    id: string;
    employeeId: string;
    name: string;
    gender?: string;
    age?: number;
    phone?: string;
    email?: string;
    position: Position;
    status: EmployeeStatus;
    workLocation: WorkLocation;
    departmentName?: string;
    hireDate?: string;
}
