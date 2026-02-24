import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchAttendanceList, updateAttendanceStatus, deleteAttendanceRecord } from '../services/attendance.api';
import { AttendanceRecord } from '../types';
import { EditAttendanceModal } from '../components/modals/EditAttendanceModal';
import { useAuth } from '../contexts/AuthContext';

// Skill: frontend-admin-view
export const AttendanceList: React.FC = () => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // 从 URL 获取 filter 参数
    const searchParams = new URLSearchParams(location.search);
    const currentFilter = searchParams.get('filter') || 'exceptions';

    const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';
    const isViewer = user?.role === 'viewer';

    const loadData = () => {
        setLoading(true);
        fetchAttendanceList(undefined, currentFilter).then(res => {
            if (res.success && res.data) {
                setRecords(res.data);
            }
            setLoading(false);
        });
    };

    useEffect(() => {
        loadData();
    }, [currentFilter]);

    const handleUpdate = async (id: string, status: string, reason: string) => {
        if (!window.confirm('この変更は監査ログに记录されます。よろしいですか？')) return;

        const res = await updateAttendanceStatus(id, status, reason);
        if (res.success) {
            loadData();
            setEditingRecord(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('このレコードを削除しますか？この操作は取り消せません。')) {
            const res = await deleteAttendanceRecord(id);
            if (res.success) {
                loadData();
            }
        }
    };

    const getStatusBadge = (record: AttendanceRecord) => {
        const base = "px-3 py-1 rounded-full text-[10px] font-black tracking-tight border shadow-sm flex items-center gap-2 uppercase";
        const status = record.status;

        if (status.startsWith('未出勤')) {
            return <span className={`${base} bg-slate-50 text-slate-400 border-slate-200`}>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>{status}
            </span>;
        } else if (status.startsWith('出勤')) {
            return <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-100`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{status}
            </span>;
        } else if (status.startsWith('退勤')) {
            return <span className={`${base} bg-indigo-50 text-indigo-700 border-indigo-100`}>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>{status}
            </span>;
        } else if (status.startsWith('异常')) {
            return <span className={`${base} bg-rose-50 text-rose-700 border-rose-100 shadow-rose-100`}>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>{status}
            </span>;
        } else if (status.startsWith('休假')) {
            return <span className={`${base} bg-amber-50 text-amber-700 border-amber-100`}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>{status}
            </span>;
        } else if (status.startsWith('公司外')) {
            return <span className={`${base} bg-purple-50 text-purple-700 border-purple-100`}>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>{status}
            </span>;
        }

        return <span className={`${base} bg-slate-50 text-slate-600 border-slate-100`}>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>{status}
        </span>;
    };

    const getPageTitle = () => {
        switch (currentFilter) {
            case 'all': return '全従業員詳細ビュー';
            case 'exceptions': return '勤怠反映・異常一覧';
            case 'present': return '出勤者一覧';
            case 'checkout': return '退勤者一覧';
            case 'leave': return '休暇・欠勤履歴';
            case 'unattended': return '未出勤者リスト';
            case 'outside': return '現場・リモート勤務';
            default: return '勤怠詳細リスト';
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{getPageTitle()}</h1>
                    <p className="text-slate-500 mt-3 font-mono text-[10px] uppercase tracking-[0.3em] font-bold">Attendance Real-time Monitor</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-6 py-3 bg-white text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest border border-slate-100 hover:bg-slate-50 transition-colors shadow-sm">Export Data</button>
                </div>
            </header>

            <div className="glass-card overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: 'all', label: 'ALL' },
                            { id: 'exceptions', label: 'EXCEPTION (异常)' },
                            { id: 'present', label: 'PRESENT (出勤)' },
                            { id: 'checkout', label: 'CHECKOUT (退勤)' },
                            { id: 'leave', label: 'LEAVE (休假)' },
                            { id: 'unattended', label: 'UNATTENDED (未出勤)' },
                            { id: 'outside', label: 'OFFSITE (公司外)' }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => navigate(`?filter=${f.id}`)}
                                className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all tracking-widest uppercase ${currentFilter === f.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105' : 'bg-white text-slate-400 hover:bg-slate-100'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-slate-50/20">
                                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Employee ID</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Name</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Status</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Last Event</th>
                                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Operational Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white/40">
                            {records.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic font-bold uppercase tracking-widest text-xs">No records found for the selected criteria.</td>
                                </tr>
                            ) : (
                                records.map((record) => (
                                    <tr key={record.id} className="hover:bg-indigo-50/10 transition-all duration-150 group">
                                        <td className="px-8 py-6 text-sm font-mono text-slate-500">{record.employeeId}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center text-slate-900 text-xs font-black rotate-3 group-hover:rotate-0 transition-transform">
                                                    {record.employeeName.charAt(0)}
                                                </div>
                                                <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">{record.employeeName}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">{getStatusBadge(record)}</td>
                                        <td className="px-8 py-6 text-sm font-mono text-slate-400 font-bold">
                                            {record.recordTime ? new Date(record.recordTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-3 items-center">
                                                <Link
                                                    to={`/attendance/history/${record.employeeId}`}
                                                    className="p-2.5 bg-white hover:bg-slate-900 hover:text-white rounded-xl text-slate-400 transition-all shadow-sm border border-slate-100"
                                                    title="履歴トレース"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </Link>

                                                {!isViewer && (
                                                    <>
                                                        <button
                                                            onClick={() => setEditingRecord(record)}
                                                            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
                                                        >
                                                            修正
                                                        </button>

                                                        {isAdminOrHR && (
                                                            <button
                                                                onClick={() => handleDelete(record.id)}
                                                                className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100/50"
                                                                title="削除"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingRecord && (
                <EditAttendanceModal
                    record={editingRecord}
                    onClose={() => setEditingRecord(null)}
                    onSave={handleUpdate}
                />
            )}
        </div>
    );
};

export default AttendanceList;
