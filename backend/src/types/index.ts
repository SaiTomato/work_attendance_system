
import { Request } from 'express';

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}

export interface UserPayload {
    id: string;
    username: string;
    role: 'admin' | 'manager' | 'hr' | 'viewer';
    departmentId?: string; // Critical for manager role (Skill: rbac-check)
}

export interface DailyStats {
    date: string;
    totalEmployees: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
    exceptions: number;
}

export interface AttendanceRecord {
    id: string;
    employeeId: string;
    employeeName: string;
    date: string;
    status: 'present' | 'late' | 'absent' | 'leave' | 'business_trip';
    checkInTime?: string;
    checkOutTime?: string;
}

export interface AuditLog {
    id: string;
    targetId: string;
    action: 'create' | 'update' | 'delete' | 'override';
    before?: any;
    after?: any;
    operatedBy: string;
    operatedAt: string;
}
