import { api } from './api';
import { ApiResponse } from '../types';

export interface Department {
    id: string;
    name: string;
    code: string;
}

export const fetchDepartments = async (): Promise<ApiResponse<Department[]>> => {
    const res = await api.get('/departments');
    return res.data;
};
