import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { leaveApi } from '../services/leave.api';
import { format } from 'date-fns';

export const LeaveManagement: React.FC = () => {
    const { user } = useAuth();
    const [myLeaves, setMyLeaves] = useState<any[]>([]);
    const [systemHistory, setSystemHistory] = useState<any[]>([]);
    const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);

    // Form state
    const [submitting, setSubmitting] = useState(false);
    const [type, setType] = useState<'ANNUAL' | 'SICK' | 'SPECIAL' | 'BUSINESS'>('ANNUAL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const isManager = ['admin', 'manager', 'hr'].includes(user?.role || '');
    const isViewer = user?.role === 'viewer';

    const fetchData = async () => {
        try {
            if (isManager) {
                // 管理层获取待审批 + 全系统历史
                const [pendingRes, historyRes] = await Promise.all([
                    leaveApi.getPendingLeaves(),
                    leaveApi.getAllProcessedHistory()
                ]);
                if (pendingRes.success) setPendingLeaves(pendingRes.data);
                if (historyRes.success) setSystemHistory(historyRes.data);
            } else if (isViewer) {
                // 员工获取个人历史
                const myRes = await leaveApi.getMyLeaves();
                if (myRes.success) {
                    setMyLeaves(myRes.data);
                    // 如果有未读项，标记已读并刷新 Header
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
                setMsg({ type: 'success', text: '申请已提交，等待审核。' });
                setStartDate('');
                setEndDate('');
                setReason('');
                fetchData();
                window.dispatchEvent(new CustomEvent('refreshNotifications'));
            }
        } catch (err: any) {
            setMsg({ type: 'error', text: err.response?.data?.message || '提交失败' });
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

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        {isManager ? '休暇审批' : '申请与'} <span className="text-indigo-600">{isManager ? '与管理' : '审批'}</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        {isManager ? '全システムの休暇申請の管理と审计' : '休暇・欠勤申請の管理とステータス确认'}
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
                                        <option value="ANNUAL">有給休暇 (Annual)</option>
                                        <option value="SICK">病欠 (Sick)</option>
                                        <option value="BUSINESS">公出 (Business)</option>
                                        <option value="SPECIAL">特別休暇 (Special)</option>
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
                                待审批申请列表
                                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-black">{pendingLeaves.length}</span>
                            </h2>

                            <div className="space-y-4 relative z-10">
                                {pendingLeaves.length === 0 ? (
                                    <div className="py-12 border-2 border-dashed border-white/20 rounded-3xl flex flex-col items-center justify-center opacity-50">
                                        <p className="font-bold">目前没有需要处理的申请</p>
                                    </div>
                                ) : (
                                    pendingLeaves.map(leave => (
                                        <div key={leave.id} className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/15 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-black">
                                                    {leave.employee.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-lg leading-tight text-white">{leave.employee.name}</p>
                                                    <p className="text-xs text-indigo-200 font-bold uppercase tracking-widest mt-1">
                                                        {leave.type} • {format(new Date(leave.startDate), 'MM/dd')} - {format(new Date(leave.endDate), 'MM/dd')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleApproval(leave.id, 'REJECTED')}
                                                    className="px-6 py-2 rounded-xl bg-rose-500/20 text-rose-200 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all font-bold text-sm"
                                                >
                                                    驳回
                                                </button>
                                                <button
                                                    onClick={() => handleApproval(leave.id, 'APPROVED')}
                                                    className="px-6 py-2 rounded-xl bg-emerald-500 text-slate-900 hover:bg-white transition-all font-black text-sm"
                                                >
                                                    批准
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
                            {isManager ? '全系统处理记录 (Audit Trail)' : '我的申请历史'}
                        </h2>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        {isManager && <th className="py-4 text-xs font-black uppercase tracking-widest text-slate-400">申请人</th>}
                                        <th className="py-4 text-xs font-black uppercase tracking-widest text-slate-400">类型</th>
                                        <th className="py-4 text-xs font-black uppercase tracking-widest text-slate-400">期间</th>
                                        {isManager && <th className="py-4 text-xs font-black uppercase tracking-widest text-slate-400">处理人</th>}
                                        <th className="py-4 text-xs font-black uppercase tracking-widest text-slate-400">状态</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(isManager ? systemHistory : myLeaves).length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400 font-medium italic">暂无记录</td>
                                        </tr>
                                    ) : (
                                        (isManager ? systemHistory : myLeaves).map(leave => (
                                            <tr key={leave.id} className={`border-b border-slate-50 group hover:bg-slate-50/50 transition-colors ${!isManager && !leave.isReadByEmployee && leave.status !== 'PENDING' ? 'bg-indigo-50/30' : ''}`}>
                                                {isManager && (
                                                    <td className="py-5">
                                                        <span className="font-bold text-slate-900">{leave.employee.name}</span>
                                                    </td>
                                                )}
                                                <td className="py-5">
                                                    <span className="font-bold text-slate-700">{leave.type}</span>
                                                </td>
                                                <td className="py-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">{format(new Date(leave.startDate), 'yyyy/MM/dd')}</span>
                                                        <span className="text-[10px] text-slate-400 font-black">至 {format(new Date(leave.endDate), 'yyyy/MM/dd')}</span>
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
                                                            {leave.status}
                                                        </div>
                                                        {!isManager && !leave.isReadByEmployee && leave.status !== 'PENDING' && (
                                                            <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" title="新结果"></span>
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
