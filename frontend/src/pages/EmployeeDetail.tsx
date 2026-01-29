
import React, { useEffect, useState } from 'react';
import { fetchEmployeeHistory, fetchAuditLogs } from '../services/attendance.api';
import { AttendanceRecord, AuditLog } from '../types';

// Mock params (in real app, this would use useParams from react-router)
const MOCK_EMPLOYEE_ID = 'EMP-001';

export const EmployeeDetail: React.FC = () => {
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [showLogs, setShowLogs] = useState(false);

    useEffect(() => {
        fetchEmployeeHistory(MOCK_EMPLOYEE_ID).then(res => {
            if (res.success && res.data) {
                setHistory(res.data);
            }
        });
    }, []);

    const handleViewLogs = (record: AttendanceRecord) => {
        setSelectedRecord(record);
        setShowLogs(true);
        fetchAuditLogs(record.id).then(res => {
            if (res.success && res.data) {
                setLogs(res.data);
            }
        });
    };

    return (
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: History List */}
            <div className="md:col-span-2 bg-white shadow rounded p-4">
                <h2 className="text-xl font-bold mb-4">出席历史 (EMP-001)</h2>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left">日期</th>
                            <th className="px-4 py-2 text-left">状态</th>
                            <th className="px-4 py-2 text-left">打卡时间</th>
                            <th className="px-4 py-2">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map(record => (
                            <tr key={record.id} className="hover:bg-gray-50 border-b">
                                <td className="px-4 py-2">{record.date}</td>
                                <td className="px-4 py-2">
                                    <span className={`px-2 py-1 rounded text-sm ${record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                            record.status === 'absent' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                        }`}>
                                        {record.status}
                                    </span>
                                </td>
                                <td className="px-4 py-2">{record.checkInTime || '-'}</td>
                                <td className="px-4 py-2">
                                    <button
                                        onClick={() => handleViewLogs(record)}
                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                        审计记录
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Right: Audit Log Panel */}
            <div className="md:col-span-1 bg-gray-50 border rounded p-4">
                <h3 className="text-lg font-semibold mb-3">
                    {selectedRecord ? `审计日志: ${selectedRecord.date}` : '选择记录查看审计日志'}
                </h3>

                {showLogs && selectedRecord ? (
                    <div className="space-y-4">
                        {logs.length === 0 ? (
                            <div className="text-gray-500">无记录</div>
                        ) : (
                            logs.map(log => (
                                <div key={log.id} className="bg-white p-3 rounded shadow-sm text-sm">
                                    <div className="flex justify-between text-gray-500 mb-1">
                                        <span>{log.operatedBy}</span>
                                        <span>{log.operatedAt.split('T')[1].substring(0, 5)}</span>
                                    </div>
                                    <div className="font-medium text-gray-800">
                                        Action: {log.action.toUpperCase()}
                                    </div>
                                    {log.before && (
                                        <div className="text-red-600 truncate">Previous: {JSON.stringify(log.before)}</div>
                                    )}
                                    {log.after && (
                                        <div className="text-green-600 truncate">New: {JSON.stringify(log.after)}</div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="text-gray-400 text-center mt-10">
                        点击左侧“审计记录”查看变更详情
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeDetail;
