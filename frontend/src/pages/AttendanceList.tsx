import React, { useEffect, useState } from 'react';
import { fetchExceptions, updateAttendanceStatus, deleteAttendanceRecord } from '../services/attendance.api';
import { AttendanceRecord } from '../types';
import { EditAttendanceModal } from '../components/modals/EditAttendanceModal';
import { useAuth } from '../contexts/AuthContext';

// Skill: frontend-admin-view
// Rules: 
// 1. 展示“异常” (Exception List)
// 2. 表格优先于表单
// 3. 多种角色权限动态展示

export const AttendanceList: React.FC = () => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
    const { user } = useAuth();

    const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';
    const isViewer = user?.role === 'viewer';

    const loadData = () => {
        setLoading(true);
        fetchExceptions().then(res => {
            if (res.success && res.data) {
                setRecords(res.data);
            }
            setLoading(false);
        });
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleUpdate = async (id: string, status: string, reason: string) => {
        if (!window.confirm('この変更は監査ログに記録されます。よろしいですか？')) return;

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

    const getStatusBadge = (status: string) => {
        const base = "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2";
        switch (status) {
            case 'late':
                return <span className={`${base} bg-amber-50 text-amber-700 border-amber-100 shadow-sm shadow-amber-100/50`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    遅刻 (Late)
                </span>;
            case 'absent':
                return <span className={`${base} bg-rose-50 text-rose-700 border-rose-100 shadow-sm shadow-rose-100/50`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    欠勤 (Absent)
                </span>;
            case 'leave':
                return <span className={`${base} bg-sky-50 text-sky-700 border-sky-100 shadow-sm shadow-sky-100/50`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    休暇 (Leave)
                </span>;
            default:
                return <span className={`${base} bg-slate-50 text-slate-600 border-slate-100 shadow-sm`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    {status}
                </span>;
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 font-medium">データを読み込み中...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">出勤例外リスト</h1>
                    <p className="text-slate-500 mt-1 italic uppercase text-xs tracking-widest font-bold">Attendance Exceptions</p>
                </div>
                <div className="flex gap-3">
                    <button className="btn-premium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50">検索</button>
                    {!isViewer && <button className="btn-premium btn-primary px-6">エクスポート</button>}
                </div>
            </header>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">社員ID</th>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">氏名</th>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">日付</th>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">ステータス</th>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">打卡時間 (IN/OUT)</th>
                                <th className="px-8 py-5 text-right text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white/40">
                            {records.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-16 text-center text-slate-400 italic font-medium">該当する例外データはありません。</td>
                                </tr>
                            ) : (
                                records.map((record) => (
                                    <tr key={record.id} className="hover:bg-indigo-50/20 transition-all duration-150 group">
                                        <td className="px-8 py-5 text-sm font-mono text-slate-500">{record.employeeId}</td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 text-xs font-bold">
                                                    {record.employeeName.charAt(0)}
                                                </div>
                                                <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors tracking-tight">{record.employeeName}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 font-medium">{record.date}</td>
                                        <td className="px-8 py-5">{getStatusBadge(record.status)}</td>
                                        <td className="px-8 py-5 text-sm font-mono text-slate-400">
                                            {record.checkInTime ? `${new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ➔ ${record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}` : '—'}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2 items-center">
                                                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors tooltip" title="詳細を表示">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </button>

                                                {!isViewer && (
                                                    <>
                                                        <button
                                                            onClick={() => setEditingRecord(record)}
                                                            className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all scale-100 hover:scale-[1.05] border border-indigo-100/50 shadow-sm"
                                                        >
                                                            手動修正
                                                        </button>

                                                        {isAdminOrHR && (
                                                            <button
                                                                onClick={() => handleDelete(record.id)}
                                                                className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-600 hover:text-white transition-all scale-100 hover:scale-[1.05] border border-rose-100/50"
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
