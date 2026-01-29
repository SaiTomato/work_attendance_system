
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
            alert('请输入修改原因 (审计要求)');
            return;
        }
        setIsSubmitting(true);
        await onSave(record.id, status, reason);
        setIsSubmitting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
            <div className="bg-white p-5 rounded-lg shadow-xl w-96">
                <h3 className="text-lg font-bold mb-4">调整考勤状态</h3>
                <p className="text-sm text-gray-500 mb-4">正在修改: {record.employeeName} ({record.date})</p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">新的状态</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        >
                            <option value="present">正常 (Present)</option>
                            <option value="late">迟到 (Late)</option>
                            <option value="absent">缺勤 (Absent)</option>
                            <option value="leave">请假 (Leave)</option>
                            <option value="business_trip">公出 (Business Trip)</option>
                        </select>
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">修改原因 (必填)</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 mb-2 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="请输入人工调整的原因..."
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSubmitting ? '保存中...' : '确认修改'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
