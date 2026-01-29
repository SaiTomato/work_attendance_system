
import React, { useEffect, useState } from 'react';
import { fetchExceptions, updateAttendanceStatus } from '../services/attendance.api';
import { AttendanceRecord } from '../types';
import { EditAttendanceModal } from '../components/modals/EditAttendanceModal';

// Skill: frontend-admin-view
// Rules: 
// 1. 默认只展示“异常” (页面本身就是 Exception List)
// 2. 表格优先于表单
// 3. 状态由后端 status 字段决定，前端不计算

export const AttendanceList: React.FC = () => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

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
        const res = await updateAttendanceStatus(id, status, reason);
        if (res.success) {
            // Skill: audit-log-required - modifications must be traceable
            loadData();
        }
    };

    const getStatusBadge = (status: string) => {
        const base = "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2";
        switch (status) {
            case 'late':
                return <span className={`${base} bg-amber-50 text-amber-700 border-amber-100 shadow-sm shadow-amber-100/50`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Late
                </span>;
            case 'absent':
                return <span className={`${base} bg-rose-50 text-rose-700 border-rose-100 shadow-sm shadow-rose-100/50`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    Absent
                </span>;
            case 'leave':
                return <span className={`${base} bg-sky-50 text-sky-700 border-sky-100 shadow-sm shadow-sky-100/50`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    Leave
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
            <p className="mt-4 text-slate-500 font-medium">Fetching exceptions...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Attendance Exceptions</h1>
                    <p className="text-slate-500 mt-1">Reviewing inconsistencies and manual adjustments</p>
                </div>
                <div className="flex gap-3">
                    <button className="btn-premium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50">Filter</button>
                    <button className="btn-premium btn-primary px-6">Export All</button>
                </div>
            </header>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">ID</th>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Full Name</th>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Incident Date</th>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Status Flag</th>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Registration Time</th>
                                <th className="px-8 py-5 text-right text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white/40">
                            {records.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-16 text-center text-slate-400 italic">No exceptions found for this period.</td>
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
                                                <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors uppercase tracking-tight">{record.employeeName}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 font-medium">{record.date}</td>
                                        <td className="px-8 py-5">{getStatusBadge(record.status)}</td>
                                        <td className="px-8 py-5 text-sm font-mono text-slate-400">
                                            {record.checkInTime ? `${record.checkInTime} ➔ ${record.checkOutTime || 'N/A'}` : '—'}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2 items-center">
                                                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors tooltip" title="View History">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </button>
                                                {/* Skill: audit-log-required (Override trigger) */}
                                                <button
                                                    onClick={() => setEditingRecord(record)}
                                                    className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all scale-100 hover:scale-[1.05] active:scale-95 border border-indigo-100/50 shadow-sm"
                                                >
                                                    Override Status
                                                </button>
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
