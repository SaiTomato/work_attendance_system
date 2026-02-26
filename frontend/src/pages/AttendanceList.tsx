import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchAttendanceList, updateAttendanceStatus, downloadAttendanceReport } from '../services/attendance.api';
import { AttendanceRecord } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const AttendanceList: React.FC = () => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const filterType = searchParams.get('filter') || 'all';
    const { user } = useAuth();

    const [searchTerm, setSearchTerm] = useState('');
    const isViewer = user?.role === 'viewer';

    const loadRecords = async () => {
        setLoading(true);
        const res = await fetchAttendanceList(undefined, filterType);
        if (res.success && res.data) setRecords(res.data);
        setLoading(false);
    };

    useEffect(() => {
        loadRecords();
    }, [filterType]);

    // 管理者による手動修正
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
    const [newStatus, setNewStatus] = useState('');
    const [reason, setReason] = useState('');

    const handleUpdate = async () => {
        if (!editingRecord || !newStatus || !reason) return;
        try {
            const res = await updateAttendanceStatus(editingRecord.id, newStatus, reason);
            if (res.success) {
                alert('ステータスを更新しました');
                setEditingRecord(null);
                setReason('');
                loadRecords();
            }
        } catch (err: any) {
            alert(err.response?.data?.message || '更新に失敗しました');
        }
    };

    const filteredRecords = records.filter(r =>
        r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const [reportStart, setReportStart] = useState(new Date().toISOString().split('T')[0]);
    const [reportEnd, setReportEnd] = useState(new Date().toISOString().split('T')[0]);

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">従業員勤怠一覧</h2>
                    <p className="text-slate-500">本日の全従業員の最新ステータス</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group/search">
                        <input
                            type="text"
                            placeholder="氏名・IDで検索..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-slate-100/50 border border-transparent rounded-xl text-xs font-bold focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 outline-none w-48 md:w-56 transition-all"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-indigo-500 transition-colors">
                            <SearchIcon />
                        </div>
                    </div>

                    {!isViewer && (
                        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                            <input
                                type="date"
                                value={reportStart}
                                onChange={(e) => setReportStart(e.target.value)}
                                className="bg-transparent border-none text-[10px] font-bold text-slate-600 outline-none p-1"
                            />
                            <span className="text-slate-300">~</span>
                            <input
                                type="date"
                                value={reportEnd}
                                onChange={(e) => setReportEnd(e.target.value)}
                                className="bg-transparent border-none text-[10px] font-bold text-slate-600 outline-none p-1"
                            />
                            <button
                                onClick={async () => {
                                    try {
                                        await downloadAttendanceReport(reportStart, reportEnd, searchTerm);
                                    } catch (error) {
                                        alert('レポートの出力に失敗しました');
                                    }
                                }}
                                className="ml-2 bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm"
                            >
                                レポート出力
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                {[
                    { id: 'all', label: '全て' },
                    { id: 'unattended', label: '未出勤' },
                    { id: 'present', label: '出勤中' },
                    { id: 'checkout', label: '退勤済' },
                    { id: 'exceptions', label: '異常' },
                    { id: 'leave', label: '休暇' },
                    { id: 'outside', label: '外出' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSearchParams({ filter: tab.id })}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="glass-card overflow-hidden">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-slate-50">
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">従業員番号</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">氏名</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">最新ステータス</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">最終更新時刻</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">読み込み中...</td></tr>
                        ) : filteredRecords.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium">該当する記録が見つかりません。</td></tr>
                        ) : (
                            filteredRecords.map(record => (
                                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-sm font-mono text-slate-500">{record.employeeId}</td>
                                    <td className="px-6 py-4 font-bold text-slate-700">
                                        <div className="flex flex-col">
                                            {record.employeeName}
                                            <Link to={`/attendance/history/${record.employeeId}`} className="text-[10px] text-indigo-500 hover:underline font-bold mt-0.5">
                                                履歴を表示 &rarr;
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={record.status} />
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {record.recordTime ? new Date(record.recordTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {!isViewer && (
                                                <button
                                                    onClick={() => {
                                                        setEditingRecord(record);
                                                        setNewStatus(record.status);
                                                    }}
                                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    手動修正
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Manual Edit Modal */}
            {editingRecord && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-slate-50 px-8 py-6 border-b border-slate-100">
                            <h3 className="text-xl font-bold text-slate-800">ステータスの手動修正</h3>
                            <p className="text-sm text-slate-500 mt-1">{editingRecord.employeeName} ({editingRecord.employeeId})</p>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">新しいステータス</label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-colors font-bold text-slate-700"
                                >
                                    <optgroup label="出勤・退勤">
                                        <option value="出勤-通常">出勤-通常</option>
                                        <option value="出勤-遅刻">出勤-遅刻</option>
                                        <option value="退勤-通常">退勤-通常</option>
                                        <option value="退勤-早退">退勤-早退</option>
                                        <option value="退勤-残業">退勤-残業</option>
                                    </optgroup>
                                    <optgroup label="休暇・外出">
                                        <option value="休暇-有給">休暇-有給</option>
                                        <option value="休暇-無給">休暇-無給</option>
                                        <option value="外出-リモート">外出-リモート</option>
                                        <option value="外出-現場">外出-現場</option>
                                    </optgroup>
                                    <optgroup label="異常・未出勤">
                                        <option value="異常-欠勤">異常-欠勤</option>
                                        <option value="未出勤-通常">未出勤-通常</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">修正理由</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="管理者による手動修正の理由を入力してください..."
                                    className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-colors font-medium text-slate-600 h-32 resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setEditingRecord(null)}
                                    className="flex-1 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleUpdate}
                                    className="flex-2 px-8 h-12 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                                >
                                    修正を保存
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const getColors = () => {
        if (status.includes('通常') && !status.startsWith('未出勤')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        if (status.includes('異常') || status.includes('遅刻') || status.includes('早退') || status.includes('欠勤')) return 'bg-rose-50 text-rose-700 border-rose-100';
        if (status.startsWith('未出勤')) return 'bg-slate-50 text-slate-400 border-slate-200';
        if (status.startsWith('休暇')) return 'bg-amber-50 text-amber-700 border-amber-100';
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    };

    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tight border shadow-sm ${getColors()}`}>
            {status}
        </span>
    );
};

const SearchIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
);

export default AttendanceList;
