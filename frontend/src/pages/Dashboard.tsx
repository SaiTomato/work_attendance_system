import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchDashboardStats, punchAttendance, fetchDailyLogsToday, triggerDailyReset, triggerAutoCheckout, downloadAttendanceReport } from '../services/attendance.api';
import { DailyStats, AttendanceRecord } from '../types';
import { useAuth } from '../contexts/AuthContext';

// Skill: frontend-admin-view
export const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DailyStats | null>(null);
    const [mainLogs, setMainLogs] = useState<AttendanceRecord[]>([]);
    const [totalLogs, setTotalLogs] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [punchError, setPunchError] = useState<string | null>(null);
    const [isPunching, setIsPunching] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    const isViewer = user?.role === 'viewer';

    const [search, setSearch] = useState('');

    const loadData = (page: number = 1, searchQuery: string = '') => {
        if (page === 1) {
            fetchDashboardStats().then(res => {
                if (res.success && res.data) setStats(res.data);
            });
        }

        // 本日のリアルタイムログを表示 (ページネーション・検索対応)
        fetchDailyLogsToday(page, 10, searchQuery).then(res => {
            if (res.success && res.data) {
                setMainLogs(res.data.logs);
                setTotalLogs(res.data.total);
            }
        }).catch(err => {
            setError('バックエンドに接続できません。');
            console.error(err);
        });
    };

    useEffect(() => {
        loadData(currentPage, search);
        // 通常の更新タイマー (検索中は停止または同期)
        const timer = setInterval(() => loadData(currentPage, search), 30000);
        return () => clearInterval(timer);
    }, [currentPage, search]);

    const handlePunch = async () => {
        setIsPunching(true);
        setPunchError(null);
        try {
            const res = await punchAttendance();
            if (res.success) {
                alert('打刻に成功しました！');
                loadData(currentPage);
            } else {
                setPunchError(res.message || '打刻失敗');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || '打刻がシステムによって拒否されました';
            setPunchError(msg);
        } finally {
            setIsPunching(false);
        }
    };

    const selectCategory = (filter: string) => {
        // リストページへ遷移し、フィルターを適用
        navigate(`/attendance/list?filter=${filter}`);
    };

    const handleDailyReset = async () => {
        if (!window.confirm('全従業員の状態を「未出勤」にリセットしますか？（通常は翌朝に自動実行されます）')) return;
        try {
            const res = await triggerDailyReset();
            if (res.success) {
                alert(`リセット完了：${res.data?.count}名の状態を更新しました。`);
                loadData(currentPage);
            }
        } catch (err: any) {
            alert('リセットに失敗しました。');
        }
    };

    const handleAutoCheckout = async () => {
        if (!window.confirm('現在出勤中の全従業員を一括退勤処理しますか？（残業・自動退勤として記録されます）')) return;
        try {
            const res = await triggerAutoCheckout();
            if (res.success) {
                alert(`一括処理完了：${res.data?.count}名を退勤させました。`);
                loadData(currentPage);
            }
        } catch (err: any) {
            alert('一括退勤に失敗しました。');
        }
    };

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
            <p className="mt-4 text-slate-500 font-medium">データを読み込み中...</p>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">ホーム</h2>
                    <p className="text-slate-500 mt-1">本日の統計データ</p>
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
                    {!isViewer && (
                        <button
                            onClick={async () => {
                                try {
                                    await downloadAttendanceReport();
                                } catch (error) {
                                    alert('レポートの出力に失敗しました');
                                }
                            }}
                            className="btn-premium bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm"
                        >
                            レポート出力
                        </button>
                    )}
                    <button onClick={() => loadData(currentPage)} className="btn-premium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">データ更新</button>
                </div>
            </header>

            {/* 異常値のアラート */}
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

            {/* Admin Console Section */}
            {user?.role === 'admin' && (
                <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <BoltIcon />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-500 rounded-lg">
                                <UsersIcon />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-widest">システム管理</h3>
                        </div>
                        <p className="text-slate-400 mb-8 max-w-2xl font-medium">
                            管理者専用ツール：全従業員の状態を一括操作できます。テストや、業務終了後の強制退勤などに使用してください。
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={handleDailyReset}
                                className="px-6 py-3 bg-white text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-lg active:scale-95"
                            >
                                全員を[未出勤]にリセット
                            </button>
                            <button
                                onClick={handleAutoCheckout}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg active:scale-95"
                            >
                                出勤中を全員[自動退勤]
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <StatCard
                    label="全従業員 (Total)"
                    value={stats.totalEmployees}
                    icon={<UsersIcon />}
                    color="indigo"
                    onClick={() => selectCategory('all')}
                />
                <StatCard
                    label="未出勤 (Unattended)"
                    value={stats.unattended}
                    icon={<ClockIcon />}
                    color="slate"
                    onClick={() => selectCategory('unattended')}
                />
                <StatCard
                    label="出勤中 (Present)"
                    value={stats.present}
                    icon={<CheckCircleIcon />}
                    color="emerald"
                    onClick={() => selectCategory('present')}
                />
                <StatCard
                    label="退勤済 (Checked Out)"
                    value={stats.checkout}
                    icon={<ArrowRightOnRectangleIcon />}
                    color="cyan"
                    onClick={() => selectCategory('checkout')}
                />
                <StatCard
                    label="異常 (Exception)"
                    value={stats.exception}
                    icon={<ExclamationTriangleIcon />}
                    color="rose"
                    isCritical={stats.exception > 0}
                    onClick={() => selectCategory('exceptions')}
                />
                <StatCard
                    label="休暇 (Leave)"
                    value={stats.leave}
                    icon={<CalendarIcon />}
                    color="amber"
                    onClick={() => selectCategory('leave')}
                />
                <StatCard
                    label="外出 (Offsite)"
                    value={stats.outside}
                    icon={<BuildingOfficeIcon />}
                    color="purple"
                    onClick={() => selectCategory('outside')}
                />
            </div>

            {/* リアルタイム打刻ログ */}
            <div className="glass-card overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-200/60 flex items-center justify-between bg-white/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50">
                            <BoltIcon />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                            打刻ログ・リアルタイムフロー
                        </h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group/search">
                            <input
                                type="text"
                                placeholder="名前・IDで検索..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-10 pr-4 py-2 bg-slate-100/50 border border-transparent rounded-xl text-xs font-bold focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 outline-none w-40 md:w-64 transition-all"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-indigo-500 transition-colors">
                                <SearchIcon />
                            </div>
                        </div>
                        <span className="text-xs font-bold text-slate-400 italic">本日合計: {totalLogs}</span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors"
                            >
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <span className="flex items-center justify-center text-sm font-black w-10 h-8 bg-indigo-50 text-indigo-600 rounded-lg">{currentPage}</span>
                            <button
                                onClick={() => setCurrentPage(p => p + 1)}
                                disabled={currentPage * 10 >= totalLogs}
                                className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors"
                            >
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest leading-none">ID</th>
                                <th className="px-8 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest leading-none">氏名</th>
                                <th className="px-8 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest leading-none">ステータス</th>
                                <th className="px-8 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest leading-none">時刻</th>
                                <th className="px-8 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest leading-none">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {mainLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-16 text-center text-slate-400 italic font-medium tracking-tight">本日の打刻ログはまだありません。</td>
                                </tr>
                            ) : (
                                mainLogs.map((record: AttendanceRecord) => {
                                    const st = record.status;
                                    const isCritical = st.includes('異常') || st.includes('遅刻') || st.includes('早退') || st.includes('欠勤');
                                    const isNormal = st.includes('通常') && !st.startsWith('未出勤');
                                    const isUnattended = st.startsWith('未出勤');

                                    return (
                                        <tr key={record.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="px-8 py-5 text-sm font-mono text-slate-500">{record.employeeId}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-black uppercase">
                                                        {record.employeeName.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-900 tracking-tight">{record.employeeName}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-tight border shadow-sm
                                                    ${isCritical
                                                        ? 'bg-rose-50 text-rose-700 border-rose-100'
                                                        : isNormal ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                            : isUnattended ? 'bg-slate-50 text-slate-500 border-slate-200'
                                                                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${isCritical ? 'bg-rose-400 animate-pulse' : isNormal ? 'bg-emerald-400' : isUnattended ? 'bg-slate-300' : 'bg-indigo-400'}`}></span>
                                                    {st}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-sm text-slate-500 font-black font-mono">
                                                {record.recordTime ? new Date(record.recordTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '---'}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <Link to={`/attendance/history/${record.employeeId}`} className="text-indigo-600 hover:text-indigo-900 text-[10px] font-black transition-opacity opacity-0 group-hover:opacity-100 uppercase tracking-tighter">
                                                    履歴を表示 &rarr;
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-200/60 text-right">
                    <Link to="/attendance/list" className="inline-flex items-center text-indigo-600 font-bold hover:text-indigo-800 transition-colors gap-2 text-xs uppercase tracking-widest">
                        全ての詳細データ・リストへ
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
        cyan: 'bg-cyan-600 shadow-cyan-200',
        purple: 'bg-purple-600 shadow-purple-200',
    };

    return (
        <div
            onClick={onClick}
            className={`glass-card p-6 stat-card-glow cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.98] hover:shadow-xl ${isCritical ? 'border-rose-200/50 bg-rose-50/20' : ''}`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
                    <h3 className={`text-4xl font-black mt-2 tracking-tighter ${isCritical ? 'text-rose-600' : 'text-slate-900'}`}>
                        {value}
                    </h3>
                </div>
                <div className={`p-3 rounded-2xl text-white shadow-xl ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
            <div className="mt-4 flex items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-indigo-500">詳細を表示</span>
                <span className="text-slate-300 ml-1">➔</span>
            </div>
        </div>
    );
};

// Simple icon components
const UsersIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
);
const CheckCircleIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ExclamationTriangleIcon = ({ className }: any) => (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
);
const CalendarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const ClockIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ArrowRightOnRectangleIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
);
const BuildingOfficeIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
);
const BoltIcon = () => (
    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
);
const SearchIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
);

export default Dashboard;
