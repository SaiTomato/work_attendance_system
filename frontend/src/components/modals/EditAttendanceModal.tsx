
import React, { useState } from 'react';
import { AttendanceRecord } from '../../types';

interface EditAttendanceModalProps {
    record: AttendanceRecord;
    onClose: () => void;
    onSave: (id: string, status: string, reason: string) => Promise<void>;
}

// Skill: frontend-admin-view - 所有修改必须二次确认 (这里体现在 Modal + 保存动作)
export const EditAttendanceModal: React.FC<EditAttendanceModalProps> = ({ record, onClose, onSave }) => {
    const [status, setStatus] = useState(record.status);
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            alert('修正理由を入力してください (監査要件)');
            return;
        }
        setIsSubmitting(true);
        await onSave(record.id, status, reason);
        setIsSubmitting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative w-full max-w-lg glass-card overflow-hidden animate-in zoom-in-95 duration-200">
                <header className="px-10 py-8 bg-gradient-to-br from-slate-900 to-indigo-950 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">State Mutation</p>
                    <h3 className="text-3xl font-black tracking-tight mb-2">勤怠記録の修正</h3>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-xs font-black">
                            {record.employeeName.charAt(0)}
                        </div>
                        <div>
                            <p className="text-xs font-bold leading-none">{record.employeeName}</p>
                            <p className="text-[10px] font-mono opacity-50 mt-1 uppercase">ID: {record.employeeId}</p>
                        </div>
                    </div>
                </header>

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Status / 目標ステータス</label>
                        <div className="relative">
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer"
                            >
                                <option value="出勤-正常">出勤-正常 (Present)</option>
                                <option value="出勤-迟到">出勤-迟到 (Late)</option>
                                <option value="退勤-正常">退勤-正常 (Checkout)</option>
                                <option value="异常-缺勤">异常-缺勤 (Absence)</option>
                                <option value="休假-有休">休假-有休 (Paid Leave)</option>
                                <option value="休假-无休">休假-无休 (Unpaid Leave)</option>
                                <option value="公司外-现场">公司外-现场 (Offsite/Worksite)</option>
                                <option value="公司外-远程">公司外-远程 (Remote/WFH)</option>
                                <option value="未出勤-正常">未出勤-正常 (Unattended)</option>
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mutation Reason / 修正理由 (必須)</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-300 resize-none font-mono text-sm leading-relaxed"
                            placeholder="例: 打刻忘れのため手動で修正..."
                            rows={4}
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 hover:text-slate-600 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 shadow-xl shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                "Apply Mutation &rarr;"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
