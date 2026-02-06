import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchPunchToken } from '../services/attendance.api';
import { useAuth } from '../contexts/AuthContext';

export const PunchQR: React.FC = () => {
    const [tokenData, setTokenData] = useState<{ token: string, expiresAt: number } | null>(null);
    const [timeLeft, setTimeLeft] = useState(30);
    const [error, setError] = useState<string | null>(null);
    const { user, logout } = useAuth();

    const getToken = async () => {
        try {
            const res = await fetchPunchToken();
            if (res.success && res.data) {
                setTokenData(res.data);
                const seconds = Math.max(0, Math.floor((res.data.expiresAt - Date.now()) / 1000));
                setTimeLeft(seconds);
            } else {
                setError(res.message || '令牌获取失败');
            }
        } catch (err) {
            setError('网络请求失败');
        }
    };

    useEffect(() => {
        getToken();
        const refreshInterval = setInterval(getToken, 25000); // 25秒刷新一次
        return () => clearInterval(refreshInterval);
    }, []);

    useEffect(() => {
        if (!tokenData) return;
        const timer = setInterval(() => {
            const seconds = Math.max(0, Math.floor((tokenData.expiresAt - Date.now()) / 1000));
            setTimeLeft(seconds);
        }, 1000);
        return () => clearInterval(timer);
    }, [tokenData]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-sm glass-card p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">打卡二维码</h1>
                <p className="text-slate-500 text-sm mb-8">请将此码展示给扫码终端</p>

                <div className="bg-white p-6 rounded-3xl shadow-inner border border-slate-100 mb-8 relative group">
                    {tokenData ? (
                        <QRCodeSVG
                            value={tokenData.token}
                            size={220}
                            level="H"
                            includeMargin={false}
                            className="transition-opacity duration-300"
                        />
                    ) : (
                        <div className="w-[220px] h-[220px] flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        </div>
                    )}

                    {timeLeft <= 5 && timeLeft > 0 && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-3xl backdrop-blur-sm animate-pulse">
                            <span className="text-rose-500 font-bold text-lg">即将更新...</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-slate-400">
                        <svg className="w-4 h-4 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        <span className="text-xs font-medium uppercase tracking-widest">{timeLeft}秒后自动更新</span>
                    </div>
                </div>

                {error && (
                    <div className="mt-6 p-3 bg-rose-50 text-rose-600 text-xs rounded-lg border border-rose-100">
                        {error}
                    </div>
                )}

                <div className="mt-10 pt-6 border-t border-slate-100 w-full">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                                {user?.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-slate-900">{user?.username}</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{user?.role} Mode</p>
                            </div>
                        </div>
                        <button
                            onClick={() => logout()}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all group"
                            title="退出登录"
                        >
                            <span className="text-[10px] font-bold uppercase tracking-widest hidden group-hover:inline">Sign Out</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <p className="mt-8 text-slate-400 text-xs text-center leading-relaxed">
                安全提示：打卡码每 30 秒自动失效，<br />
                请勿截图发送给他人，防止代打卡行为。
            </p>
        </div>
    );
};
