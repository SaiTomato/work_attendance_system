import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchEmployeeHistory, fetchAuditLogs } from '../services/attendance.api';
import { AttendanceRecord, AuditLog } from '../types';

export const EmployeeDetail: React.FC = () => {
    const { id: employeeId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLogs, setShowLogs] = useState(false);

    useEffect(() => {
        if (!employeeId) return;
        setLoading(true);
        fetchEmployeeHistory(employeeId).then(res => {
            if (res.success && res.data) {
                setHistory(res.data);
            }
            setLoading(false);
        });
    }, [employeeId]);

    const handleViewLogs = (record: AttendanceRecord) => {
        setSelectedRecord(record);
        setShowLogs(true);
        fetchAuditLogs(record.id).then(res => {
            if (res.success && res.data) {
                setLogs(res.data);
            }
        });
    };

    const getStatusBadge = (status: string) => {
        const base = "px-3 py-1 rounded text-[10px] font-black border uppercase tracking-widest";
        if (status.startsWith('未出勤')) return <span className={`${base} bg-slate-50 text-slate-400 border-slate-200`}>{status}</span>;
        if (status.startsWith('出勤')) return <span className={`${base} bg-emerald-50 text-emerald-600 border-emerald-100`}>{status}</span>;
        if (status.startsWith('退勤')) return <span className={`${base} bg-indigo-50 text-indigo-600 border-indigo-100`}>{status}</span>;
        if (status.startsWith('異常')) return <span className={`${base} bg-rose-50 text-rose-600 border-rose-100`}>{status}</span>;
        if (status.startsWith('休暇')) return <span className={`${base} bg-amber-50 text-amber-600 border-amber-100`}>{status}</span>;
        if (status.startsWith('外出')) return <span className={`${base} bg-purple-50 text-purple-600 border-purple-100`}>{status}</span>;
        return <span className={base}>{status}</span>;
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex items-center justify-between">
                <div>
                    <button onClick={() => navigate(-1)} className="text-xs font-bold text-slate-400 hover:text-slate-600 mb-2 flex items-center gap-1">
                        &larr; 一覧に戻る
                    </button>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">打刻履歴詳細</h1>
                    <p className="text-slate-500 font-mono text-xs mt-1 uppercase tracking-widest">従業員ID: {employeeId}</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left: History Table */}
                <div className="lg:col-span-2 glass-card overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">アクティビティ履歴</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-slate-50/30">
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">記録日時</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">状態</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">記録者</th>
                                    <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">監査</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.length === 0 ? (
                                    <tr><td colSpan={4} className="py-20 text-center text-slate-400 italic">該当する記録が見つかりません。</td></tr>
                                ) : (
                                    history.map(record => (
                                        <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-8 py-5 text-sm font-mono text-slate-600">
                                                {record.recordTime ? new Date(record.recordTime).toLocaleString() : '---'}
                                            </td>
                                            <td className="px-8 py-5">
                                                {getStatusBadge(record.status)}
                                            </td>
                                            <td className="px-8 py-5 text-xs font-bold text-slate-500">
                                                {record.recorder}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button
                                                    onClick={() => handleViewLogs(record)}
                                                    className="text-indigo-600 hover:text-indigo-900 font-black text-[10px] uppercase tracking-tighter transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    詳細を表示 &rarr;
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Audit Log Panel */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="glass-card p-8 border-2 border-indigo-50">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">監査トレース</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">監査ログ</p>

                        {!showLogs ? (
                            <div className="py-20 text-center space-y-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                </div>
                                <p className="text-xs text-slate-400 font-bold">左側のレコードを選択して、変更の履歴を確認してください。</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-xl shadow-indigo-100 mb-8">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">選択されたレコード</p>
                                    <p className="font-bold mt-1 tracking-tight">{selectedRecord?.status}</p>
                                    <p className="text-[10px] font-mono mt-2 opacity-80">{selectedRecord?.id}</p>
                                </div>

                                <div className="space-y-4">
                                    {logs.length === 0 ? (
                                        <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-bold border border-dashed border-slate-200">
                                            変更履歴はありません。
                                        </div>
                                    ) : (
                                        logs.map(log => (
                                            <div key={log.id} className="relative pl-6 border-l-2 border-indigo-100 pb-4">
                                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-indigo-600"></div>
                                                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded uppercase">{log.action === 'MANUAL_FIX' ? '手動修正' : log.action}</span>
                                                        <span className="text-[10px] font-mono text-slate-400">{new Date(log.operatedAt).toLocaleTimeString()}</span>
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-700">
                                                        操作者: <span className="text-indigo-600">{log.operatedBy}</span>
                                                    </div>
                                                    {log.reason && (
                                                        <div className="p-2 bg-amber-50 rounded-lg text-amber-700 text-[10px] font-bold italic">
                                                            "{log.reason}"
                                                        </div>
                                                    )}
                                                    <div className="space-y-2 pt-2 border-t border-slate-50 mt-2">
                                                        {log.before && (
                                                            <div className="text-[9px] text-rose-500 font-mono break-all line-through opacity-50">
                                                                - {typeof log.before === 'string' ? log.before : JSON.stringify(log.before)}
                                                            </div>
                                                        )}
                                                        {log.after && (
                                                            <div className="text-[9px] text-emerald-600 font-mono break-all font-bold">
                                                                + {typeof log.after === 'string' ? log.after : JSON.stringify(log.after)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetail;
