import { api } from './api';
import { ApiResponse, EmployeeProfile } from '../types';

export const fetchEmployees = async (filters: { departmentId?: string; status?: string; search?: string } = {}): Promise<ApiResponse<EmployeeProfile[]>> => {
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
