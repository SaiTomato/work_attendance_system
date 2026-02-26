export interface DailyStats {
    totalEmployees: number;
    unattended: number; // 未出勤
    present: number;    // 出勤
    checkout: number;   // 退勤
    exception: number;  // 異常
    leave: number;      // 休暇
    outside: number;    // 外出
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

export interface AuditLog {
    id: string;
    targetId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'OVERRIDE' | 'MANUAL_FIX';
    before?: any;
    after?: any;
    operatedBy: string;
    operatedAt: string;
    reason?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export type UserRole = 'admin' | 'manager' | 'hr' | 'viewer';

export interface User {
    id: string;
    username: string;
    role: UserRole;
    departmentId?: string;
}

export type Position = 'STAFF' | 'SUB_MANAGER' | 'MANAGER' | 'GENERAL_AFFAIRS' | 'CEO';
export type EmployeeStatus = 'PROSPECTIVE' | 'ACTIVE' | 'RESIGNED';
export type DutyStatus = 'NORMAL' | 'PAID_LEAVE' | 'UNPAID_LEAVE';
export type WorkLocation = 'OFFICE' | 'REMOTE' | 'WORKSITE';

export interface EmployeeProfile {
    id: string;
    employeeId: string;
    name: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    age: number;
    phone: string;
    email: string;
    position: Position;
    status: EmployeeStatus;
    dutyStatus: DutyStatus; // 勤務形態
    dutyStatusEndDate?: string; // 勤務形態終了日
    workLocation: WorkLocation;
    departmentId: string;
    department?: {
        name: string;
        code: string;
    };
    hireDate?: string;
}
