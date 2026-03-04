import { api } from './api';
import { ApiResponse, EmployeeProfile } from '../types';

export const fetchEmployees = async (filters: {
    departmentId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
} = {}): Promise<ApiResponse<{ employees: EmployeeProfile[], total: number }>> => {
    const res = await api.get('/employees', { params: filters });
    return res.data;
};

export const createEmployee = async (data: Partial<EmployeeProfile>): Promise<ApiResponse<EmployeeProfile>> => {
    const res = await api.post('/employees', data);
    return res.data;
};

export const updateEmployee = async (id: string, data: Partial<EmployeeProfile>): Promise<ApiResponse<EmployeeProfile>> => {
    const res = await api.put(`/employees/${id}`, data);
    return res.data;
};

export const assignEmployeeRule = async (id: string, ruleId: string): Promise<ApiResponse<void>> => {
    const res = await api.post(`/employees/${id}/assign-rule`, { ruleId });
    return res.data;
};

export const deleteEmployee = async (id: string): Promise<ApiResponse<void>> => {
    const res = await api.delete(`/employees/${id}`);
    return res.data;
};

export const downloadEmployeesCsv = async (filters: { departmentId?: string; status?: string; search?: string } = {}) => {
    const res = await api.get('/employees/export', {
        params: filters,
        responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `employees_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
};
