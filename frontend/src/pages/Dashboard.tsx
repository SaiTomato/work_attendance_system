import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchDashboardStats, fetchAttendanceList, punchAttendance } from '../services/attendance.api';
import { DailyStats, AttendanceRecord } from '../types';
import { useAuth } from '../contexts/AuthContext';

// Skill: frontend-admin-view
// Rules: 默认只展示“异常”，表格优先
export const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DailyStats | null>(null);
    const [exceptions, setExceptions] = useState<AttendanceRecord[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [punchError, setPunchError] = useState<string | null>(null);
    const [isPunching, setIsPunching] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    const isViewer = user?.role === 'viewer';

    const loadData = () => {
        Promise.all([
            fetchDashboardStats(),
            fetchAttendanceList() // 默认仍然只取异常作为 Dashboard 里的简表展示
        ]).then(([statsRes, exceptionsRes]) => {
            if (statsRes.success && statsRes.data) {
                setStats(statsRes.data);
            } else if (statsRes.success === false) {
                setError(statsRes.message || '統計データの取得に失敗しました');
            }

            if (exceptionsRes.success && exceptionsRes.data) {
                setExceptions(exceptionsRes.data);
            }
        }).catch(err => {
            setError('バックエンドに接続できません。ポート4000が动作しているか确认してください。');
            console.error(err);
        });
    };

    const handlePunch = async () => {
        setIsPunching(true);
        setPunchError(null);
        try {
            const res = await punchAttendance();
            if (res.success) {
                alert('打卡成功！');
                loadData();
            } else {
                setPunchError(res.message || '打卡失败');
            }
        } catch (err: any) {
            // 后端拦截触发后的 403 错误会在这里显示消息
            const msg = err.response?.data?.message || '打卡被系统拒绝';
            setPunchError(msg);
        } finally {
            setIsPunching(false);
        }
    };

    const navigateToFilter = (filter: string) => {
        navigate(`/attendance/list?filter=${filter}`);
    };

    useEffect(() => {
        loadData();
    }, []);

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800">接続エラー</h3>
            <p className="text-slate-500 mt-2">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-6 btn-premium btn-primary px-8">再試行</button>
        </div>
    );

    if (!stats) return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 font-medium">分析データを読み込み中...</p>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">ホームページ</h2>
                    <p className="text-slate-500 mt-1">{stats.date} の統計データ</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePunch}
                        disabled={isPunching}
                        className={`btn-premium px-8 py-3 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 ${isPunching ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-200'}`}
                    >
                        {isPunching ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : <ClockIcon />}
                        {isPunching ? '処理中...' : '出勤/退勤打刻'}
                    </button>
                    {!isViewer && <button className="btn-premium bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm">レポート出力</button>}
                    <button onClick={loadData} className="btn-premium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">データ更新</button>
                </div>
            </header>

            {/* 醒目的异常拦截警告 */}
            {punchError && (
                <div className="animate-in fade-in zoom-in duration-300 bg-rose-50 border-2 border-rose-200 rounded-2xl p-6 flex items-start gap-4 shadow-xl shadow-rose-100">
                    <div className="bg-rose-500 text-white p-3 rounded-xl">
                        <ExclamationTriangleIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-rose-900">打刻バリデーション失敗 (勤怠異常)</h4>
                        <p className="text-rose-700 mt-1 font-medium">{punchError}</p>
                        <p className="text-rose-500 text-sm mt-3 flex items-center gap-1 italic">
                            管理者に連絡して異常状態を解消してください。管理者の承認後に打刻が可能になります。
                        </p>
                    </div>
                    <button onClick={() => setPunchError(null)} className="ml-auto text-rose-400 hover:text-rose-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            {/* Premium Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <StatCard
                    label="全従業員"
                    value={stats.totalEmployees}
                    icon={<UsersIcon />}
                    color="indigo"
                    onClick={() => navigateToFilter('all')}
                />
                <StatCard
                    label="正常出勤"
                    value={stats.present}
                    icon={<CheckCircleIcon />}
                    color="emerald"
                    onClick={() => navigateToFilter('present')}
                />
                <StatCard
                    label="退勤完了"
                    value={stats.successOut}
                    icon={<ArrowRightOnRectangleIcon />}
                    color="cyan"
                    onClick={() => navigateToFilter('successOut')}
                />
                <StatCard
                    label="未出勤 (待機)"
                    value={stats.unattended}
                    icon={<ClockIcon />}
                    color="slate"
                    onClick={() => navigateToFilter('unattended')}
                />
                <StatCard
                    label="勤怠異常"
                    value={stats.exceptions}
                    icon={<ExclamationTriangleIcon />}
                    color="rose"
                    isCritical={stats.exceptions > 0}
                    onClick={() => navigateToFilter('exceptions')}
                />
                <StatCard
                    label="休暇"
                    value={stats.leave}
                    icon={<CalendarIcon />}
                    color="amber"
                    onClick={() => navigateToFilter('leave')}
                />
            </div>

            {/* Exception Table Section */}
            <div className="glass-card overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-200/60 flex items-center justify-between bg-white/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-50 rounded-lg">
                            <ExclamationTriangleIcon className="w-5 h-5 text-rose-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">要注意スタッフレコード</h3>
                    </div>
                    <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold uppercase tracking-wider">
                        {exceptions.length} 件の異常を検知
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">ID</th>
                                <th className="px-8 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">氏名</th>
                                <th className="px-8 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">例外タイプ</th>
                                <th className="px-8 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">記録時間</th>
                                <th className="px-8 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {exceptions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">本日の異常は記録されていません。</td>
                                </tr>
                            ) : (
                                exceptions.map((record) => (
                                    <tr key={record.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-8 py-5 text-sm font-mono text-slate-500">{record.employeeId}</td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                                                    {record.employeeName.charAt(0)}
                                                </div>
                                                <span className="text-sm font-semibold text-slate-900">{record.employeeName}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                                ${record.status === 'late'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                    : 'bg-rose-50 text-rose-700 border-rose-100'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${record.status === 'late' ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
                                                {record.status === 'late' ? '遅刻' : '欠勤'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500">
                                            {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '未記録'}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <Link to="/attendance/list" className="text-indigo-600 hover:text-indigo-900 text-sm font-bold transition-opacity opacity-0 group-hover:opacity-100">
                                                詳細を表示 &rarr;
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-200/60 text-right">
                    <Link to="/attendance/list" className="inline-flex items-center text-indigo-600 font-bold hover:text-indigo-800 transition-colors gap-2">
                        詳細なログを閲覧
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </Link>
                </div>
            </div>
        </div>
    );
};

// Sub-components for better organization
const StatCard = ({ label, value, icon, color, isCritical, onClick }: any) => {
    const colorClasses: any = {
        indigo: 'bg-indigo-600 shadow-indigo-200',
        emerald: 'bg-emerald-600 shadow-emerald-200',
        rose: 'bg-rose-600 shadow-rose-200',
        amber: 'bg-amber-600 shadow-amber-200',
        slate: 'bg-slate-500 shadow-slate-200',
        cyan: 'bg-cyan-600 shadow-cyan-200', // 新增 Cyan 颜色支持
    };

    return (
        <div
            onClick={onClick}
            className={`glass-card p-6 stat-card-glow cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.98] hover:shadow-xl ${isCritical ? 'border-rose-200/50 bg-rose-50/20' : ''}`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                    <h3 className={`text-4xl font-extrabold mt-2 tracking-tight ${isCritical ? 'text-rose-600' : 'text-slate-900'}`}>
                        {value}
                    </h3>
                </div>
                <div className={`p-3 rounded-2xl text-white shadow-xl ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-medium">
                <span className="text-emerald-500 font-bold">查看详情</span>
                <span className="text-slate-300 ml-1">➔</span>
            </div>
        </div>
    );
};

// Simple icon components
const UsersIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
);
const CheckCircleIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ExclamationTriangleIcon = ({ className }: any) => (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
);
const CalendarIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const ClockIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ArrowRightOnRectangleIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
);

export default Dashboard;
