export interface DailyStats {
    date: string;
    totalEmployees: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
    wfh: number; // 远程办公
    worksite: number; // 现场工作
    earlyLeave: number; // 早退人数
    unattended: number;
    successOut: number;
    exceptions: number;
}

export interface AttendanceRecord {
    id: string;
    employeeId: string;
    employeeName: string;
    date: string;
    status: string;
    checkInTime?: string;
    checkOutTime?: string;
    workHours?: number; // 实绩工时
    isModified?: boolean;
}

export interface AuditLog {
    id: string;
    targetId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'OVERRIDE';
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
export type EmployeeStatus = 'PROSPECTIVE' | 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED';
export type WorkLocation = 'OFFICE' | 'REMOTE' | 'WORKSITE';

export interface EmployeeProfile {
    id: string;
    employeeId: string;
    name: string;
    position: Position;
    status: EmployeeStatus;
    workLocation: WorkLocation;
    departmentId: string;
    department?: {
        name: string;
        code: string;
    };
    hireDate?: string;
    terminationDate?: string;
    leaveStartDate?: string;
    leaveEndDate?: string;
    locationStartDate?: string;
    locationEndDate?: string;
}
