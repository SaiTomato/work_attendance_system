import { api } from './api';

export const authService = {
    login: async (username: string, password: string) => {
        const res = await api.post(
            '/auth/login',
            { username, password }
        );

        // 注意：后端返回格式是 { success: true, data: { accessToken, user } }
        const { accessToken, user } = res.data.data;

        // 存储 Access Token
        localStorage.setItem('accessToken', accessToken);

        return { accessToken, user };
    },

    logout: async () => {
        const res = await api.post('/auth/logout');
        return res.data;
    },
};