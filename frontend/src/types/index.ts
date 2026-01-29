
export interface DashboardStats {
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

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
