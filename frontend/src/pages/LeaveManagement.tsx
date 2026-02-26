import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { leaveApi } from '../services/leave.api';
import { format } from 'date-fns';

export const LeaveManagement: React.FC = () => {
    const { user } = useAuth();
    const [myLeaves, setMyLeaves] = useState<any[]>([]);
    const [systemHistory, setSystemHistory] = useState<any[]>([]);
    const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [submitting, setSubmitting] = useState(false);
    const [type, setType] = useState<'PAID' | 'UNPAID'>('PAID');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const isManager = ['admin', 'manager', 'hr'].includes(user?.role || '');
    const isViewer = user?.role === 'viewer';

    const fetchData = async () => {
        try {
            if (isManager) {
                const [pendingRes, historyRes] = await Promise.all([
                    leaveApi.getPendingLeaves(),
                    leaveApi.getAllProcessedHistory()
                ]);
                if (pendingRes.success) setPendingLeaves(pendingRes.data);
                if (historyRes.success) setSystemHistory(historyRes.data);
            } else if (isViewer) {
                const myRes = await leaveApi.getMyLeaves();
                if (myRes.success) {
                    setMyLeaves(myRes.data);
                    if (myRes.data.some((l: any) => !l.isReadByEmployee && l.status !== 'PENDING')) {
                        await leaveApi.markAsRead();
                        window.dispatchEvent(new CustomEvent('refreshNotifications'));
                    }
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [isManager, isViewer]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setMsg(null);
        try {
            const res = await leaveApi.submitRequest({ type, startDate, endDate, reason });
            if (res.success) {
                setMsg({ type: 'success', text: '申請が提出されました。承認をお待ちください。' });
                setStartDate('');
                setEndDate('');
                setReason('');
                fetchData();
                window.dispatchEvent(new CustomEvent('refreshNotifications'));
            }
        } catch (err: any) {
            setMsg({ type: 'error', text: err.response?.data?.message || '提出に失敗しました' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleApproval = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            const res = await leaveApi.updateLeaveStatus(id, status);
            if (res.success) {
                fetchData();
                window.dispatchEvent(new CustomEvent('refreshNotifications'));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const filteredHistory = (isManager ? systemHistory : myLeaves).filter(leave => {
        const searchStr = searchTerm.toLowerCase();
        return (
            (leave.employee?.name || '').toLowerCase().includes(searchStr) ||
            (leave.employee?.employeeId || '').toLowerCase().includes(searchStr) ||
            (leave.reason || '').toLowerCase().includes(searchStr) ||
            (leave.approvedBy || '').toLowerCase().includes(searchStr)
        );
    });

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        {isManager ? '休暇承認 ' : '休暇申請と '} <span className="text-indigo-600">{isManager ? '管理' : '状況確認'}</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        {isManager ? '全システムの休暇申請の管理と監査を行います' : '休暇・欠勤申請の提出とステータス確認が可能です'}
                    </p>
                </div>
            </div>

            <div className={`grid grid-cols-1 ${isViewer ? 'lg:grid-cols-3' : ''} gap-8`}>
                {/* Left Column: Form (ONLY for employees) */}
                {isViewer && (
                    <div className="lg:col-span-1">
                        <div className="glass-card p-8 sticky top-24">
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
                                休暇申請
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">休暇カテゴリー</label>
                                    <select
                                        value={type}
                                        onChange={(e: any) => setType(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all"
                                    >
                                        <option value="PAID">有給休暇 (Paid Leave)</option>
                                        <option value="UNPAID">無給休暇/欠勤 (Unpaid Leave)</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">開始日</label>
                                        <input
                                            type="date"
                                            required
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">終了日</label>
                                        <input
                                            type="date"
                                            required
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">理由 / 備考</label>
                                    <textarea
                                        rows={3}
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 placeholder:font-normal"
                                        placeholder="具体的な理由を記入してください..."
                                    />
                                </div>

                                {msg && (
                                    <div className={`p-4 rounded-xl text-sm font-bold ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                        {msg.text}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-slate-200 disabled:opacity-50"
                                >
                                    {submitting ? '送信中...' : '申請を送信'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Main Content Column: Dashboards */}
                <div className={`${isViewer ? 'lg:col-span-2' : 'w-full'} space-y-8`}>
                    {/* Manager's Pending Board */}
                    {isManager && (
                        <div className="bg-indigo-900 rounded-[2.5rem] p-8 shadow-2xl text-white relative overflow-hidden">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>

                            <h2 className="text-2xl font-black mb-6 relative z-10 flex items-center gap-3">
                                <span className="w-2 h-8 bg-white rounded-full"></span>
                                承認待ち申請一覧
                                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-black">{pendingLeaves.length}</span>
                            </h2>

                            <div className="space-y-4 relative z-10">
                                {pendingLeaves.length === 0 ? (
                                    <div className="py-12 border-2 border-dashed border-white/20 rounded-3xl flex flex-col items-center justify-center opacity-50">
                                        <p className="font-bold">現在、未処理の申請はありません</p>
                                    </div>
                                ) : (
                                    pendingLeaves.map(leave => (
                                        <div key={leave.id} className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/15 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-black">
                                                    {(leave.employee.name || 'E').charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-lg leading-tight text-white">{leave.employee.name}</p>
                                                    <p className="text-xs text-indigo-200 font-bold uppercase tracking-widest mt-1">
                                                        {leave.type === 'PAID' ? '有給休暇' : '無給休暇'} • {format(new Date(leave.startDate), 'MM/dd')} - {format(new Date(leave.endDate), 'MM/dd')}
                                                    </p>
                                                    {leave.reason && (
                                                        <p className="text-sm text-indigo-100/70 mt-2 italic bg-black/10 px-3 py-1 rounded-lg border-l-2 border-indigo-400">
                                                            “{leave.reason}”
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleApproval(leave.id, 'REJECTED')}
                                                    className="px-6 py-2 rounded-xl bg-rose-500/20 text-rose-200 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all font-bold text-sm"
                                                >
                                                    却下
                                                </button>
                                                <button
                                                    onClick={() => handleApproval(leave.id, 'APPROVED')}
                                                    className="px-6 py-2 rounded-xl bg-emerald-500 text-slate-900 hover:bg-white transition-all font-black text-sm"
                                                >
                                                    承認
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* History Board: Manager View (System) or Employee View (Personal) */}
                    <div className="glass-card p-8">
                        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <span className="w-2 h-6 bg-slate-200 rounded-full"></span>
                            {isManager ? '全システム処理記録 (監査ログ)' : '個人申請履歴'}
                        </h2>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                                            <div className="flex items-center justify-between gap-4">
                                                <span>{isManager ? '申請者' : 'タイプ'}</span>
                                                <div className="relative group/search inline-block font-normal normal-case">
                                                    <input
                                                        type="text"
                                                        placeholder="検索..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="pl-8 pr-3 py-1 bg-slate-100/50 border border-transparent rounded-lg text-[10px] font-bold focus:bg-white focus:border-indigo-100 outline-none w-32 transition-all"
                                                    />
                                                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </th>
                                        {isManager && <th className="py-4 text-xs font-black uppercase tracking-widest text-slate-400">タイプ</th>}
                                        <th className="py-4 text-xs font-black uppercase tracking-widest text-slate-400">期間</th>
                                        {isManager && <th className="py-4 text-xs font-black uppercase tracking-widest text-slate-400">承認者</th>}
                                        <th className="py-4 text-xs font-black uppercase tracking-widest text-slate-400">ステータス</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400 font-medium italic">記録なし</td>
                                        </tr>
                                    ) : (
                                        filteredHistory.map(leave => (
                                            <tr key={leave.id} className={`border-b border-slate-50 group hover:bg-slate-50/50 transition-colors ${!isManager && !leave.isReadByEmployee && leave.status !== 'PENDING' ? 'bg-indigo-50/30' : ''}`}>
                                                <td className="py-5">
                                                    <span className="font-bold text-slate-900">{isManager ? leave.employee.name : (leave.type === 'PAID' ? '有給休暇' : '無給休暇')}</span>
                                                </td>
                                                {isManager && (
                                                    <td className="py-5">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-700">
                                                                {leave.type === 'PAID' ? '有給休暇' : '無給休暇'}
                                                            </span>
                                                            {leave.reason && (
                                                                <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]" title={leave.reason}>
                                                                    {leave.reason}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                                {!isManager && (
                                                    <td className="py-5">
                                                        {leave.reason && (
                                                            <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]" title={leave.reason}>
                                                                {leave.reason}
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="py-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">{format(new Date(leave.startDate), 'yyyy/MM/dd')}</span>
                                                        <span className="text-[10px] text-slate-400 font-black">〜 {format(new Date(leave.endDate), 'yyyy/MM/dd')}</span>
                                                    </div>
                                                </td>
                                                {isManager && (
                                                    <td className="py-5 text-sm font-bold text-slate-500">
                                                        {leave.approvedBy || '-'}
                                                    </td>
                                                )}
                                                <td className="py-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${leave.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                            leave.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                                                                'bg-amber-100 text-amber-700'
                                                            }`}>
                                                            {leave.status === 'APPROVED' ? '承認済' : leave.status === 'REJECTED' ? '却下済' : '申請中'}
                                                        </div>
                                                        {!isManager && !leave.isReadByEmployee && leave.status !== 'PENDING' && (
                                                            <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" title="新規結果"></span>
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
                </div>
            </div>
        </div>
    );
};

export default LeaveManagement;
