import { api } from './api';

export const authService = {
    login: async (username: string, password: string) => {
        const res = await api.post(
            '/auth/login',
            { username, password }
        );

        // バックエンドのレスポンス形式: { success: true, data: { accessToken, user } }
        const { accessToken, user } = res.data.data;

        // Access Tokenの保存
        localStorage.setItem('accessToken', accessToken);

        return { accessToken, user };
    },

    logout: async () => {
        const res = await api.post('/auth/logout');
        return res.data;
    },
};