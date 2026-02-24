import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated && user) {
            if (user.role === 'terminal') {
                navigate('/scanner');
            } else if (user.role === 'viewer') {
                navigate('/punch-qr');
            } else {
                navigate('/');
            }
        }
    }, [isAuthenticated, user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const loggedInUser = await login(username, password);
            if (loggedInUser.user.role === 'terminal') {
                navigate('/scanner');
            } else if (loggedInUser.user.role === 'viewer') {
                navigate('/punch-qr');
            } else {
                navigate('/');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.response?.data?.error || 'ログインに失敗しました。ユーザー名またはパスワードを確認してください。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen flex items-center justify-center p-4 premium-gradient-bg overflow-hidden">
            <div className="w-full max-w-md animate-in fade-in zoom-in duration-500 scale-95 md:scale-100">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">出勤管理システム</h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm italic">Work Attendance System</p>
                </div>

                <div className="glass-card p-8">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 text-center uppercase tracking-widest">Portal Login</h2>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Username / ユーザー名</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium text-slate-900"
                                placeholder="ユーザー名"
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Password / パスワード</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium text-slate-900"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full btn-premium btn-primary py-4 text-lg font-bold shadow-indigo-200 hover:shadow-indigo-300"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Verifying...</span>
                                </div>
                            ) : 'ログイン'}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                        <p className="text-xs text-slate-400 font-medium">
                            Demo Admin: <span className="text-slate-900 font-bold">admin / admin</span>
                        </p>
                    </div>
                </div>

                <p className="text-center text-slate-400 mt-6 text-[10px] font-bold uppercase tracking-[0.2em]">
                    &copy; 2026 Work Attendance System Professional
                </p>
            </div>
        </div>
    );
};

export default Login;
