import React, { useEffect, useState } from 'react';
import { fetchEmployees, updateEmployee, createEmployee } from '../services/employee.api';
import { fetchDepartments, Department } from '../services/department.api';
import { EmployeeProfile, EmployeeStatus, Position, WorkLocation } from '../types';
import { useAuth } from '../contexts/AuthContext';

// Skill: frontend-admin-view
export const Employees: React.FC = () => {
    const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingEmployee, setEditingEmployee] = useState<EmployeeProfile | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const { user } = useAuth();
    const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

    const loadData = async () => {
        try {
            setLoading(true);
            const [empRes, deptRes] = await Promise.all([
                fetchEmployees({ search: searchTerm }),
                fetchDepartments()
            ]);
            if (empRes.success && empRes.data) setEmployees(empRes.data);
            if (deptRes.success && deptRes.data) setDepartments(deptRes.data);
        } catch (error) {
            console.error('Failed to load employee data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [searchTerm]);

    const getStatusBadge = (status: EmployeeStatus) => {
        const colors: Record<EmployeeStatus, string> = {
            PROSPECTIVE: 'bg-blue-100 text-blue-700 border-blue-200',
            ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            ON_LEAVE: 'bg-amber-100 text-amber-700 border-amber-200',
            RESIGNED: 'bg-slate-100 text-slate-500 border-slate-200',
            TERMINATED: 'bg-rose-100 text-rose-700 border-rose-200'
        };
        const labels: Record<EmployeeStatus, string> = {
            PROSPECTIVE: '内定 (Prospective)',
            ACTIVE: '在职 (Active)',
            ON_LEAVE: '休假 (Leave)',
            RESIGNED: '离职 (Resigned)',
            TERMINATED: '解雇 (Terminated)'
        };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${colors[status]}`}>{labels[status]}</span>;
    };

    const getPositionLabel = (pos: Position) => {
        const labels: Record<Position, string> = {
            STAFF: '员工',
            SUB_MANAGER: '次长',
            MANAGER: '部长',
            GENERAL_AFFAIRS: '总务',
            CEO: '社长'
        };
        return labels[pos] || pos;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">员工情报中心</h1>
                    <p className="text-slate-500 mt-1 uppercase text-xs tracking-widest font-bold">Employee Intelligence OS</p>
                </div>
                {isAdminOrHR && (
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-premium btn-primary px-6"
                    >
                        + 员工登记
                    </button>
                )}
            </header>

            <div className="glass-card p-4 flex gap-4">
                <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </span>
                    <input
                        type="text"
                        placeholder="氏名 or 社員IDで検索..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">社員ID</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">氏名</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">役職</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">部署</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">ステータス</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="py-20 text-center text-slate-400">読み込み中...</td></tr>
                        ) : employees.length === 0 ? (
                            <tr><td colSpan={6} className="py-20 text-center text-slate-400">データが見つかりません。</td></tr>
                        ) : (
                            employees.map(emp => (
                                <tr key={emp.id} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-6 py-4 text-sm font-mono text-slate-500">{emp.employeeId}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{emp.name}</div>
                                        <div className="text-[10px] text-slate-400">{emp.workLocation}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{getPositionLabel(emp.position)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{emp.department?.name || '--'}</td>
                                    <td className="px-6 py-4">{getStatusBadge(emp.status)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setEditingEmployee(emp)}
                                            className="text-indigo-600 hover:text-indigo-900 font-bold text-sm"
                                        >
                                            詳細/編集
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal placeholder (We will implement the actual modal next) */}
            {editingEmployee && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <EmployeeEditForm
                        employee={editingEmployee}
                        departments={departments}
                        onClose={() => setEditingEmployee(null)}
                        onSaved={() => { loadData(); setEditingEmployee(null); }}
                    />
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <EmployeeEditForm
                        departments={departments}
                        onClose={() => setIsAddModalOpen(false)}
                        onSaved={() => { loadData(); setIsAddModalOpen(false); }}
                    />
                </div>
            )}
        </div>
    );
};

// Internal Form Component for simplicity
const EmployeeEditForm = ({ employee, departments, onClose, onSaved }: any) => {
    const [formData, setFormData] = useState<any>(employee || {
        employeeId: '',
        name: '',
        position: 'STAFF',
        status: 'PROSPECTIVE',
        workLocation: 'OFFICE',
        departmentId: departments[0]?.id || ''
    });

    const isEdit = !!employee?.id;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = isEdit
            ? await updateEmployee(employee.id, formData)
            : await createEmployee(formData);

        if (res.success) {
            onSaved();
        } else {
            alert(res.message || 'Error saving employee');
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-indigo-600 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold">{isEdit ? '社員情報編集' : '新規社員登録'}</h2>
                <button onClick={onClose} className="hover:rotate-90 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">社員ID</label>
                    <input disabled={isEdit} type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" value={formData.employeeId} onChange={e => setFormData({ ...formData, employeeId: e.target.value })} required />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">氏名</label>
                    <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">部署</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value })}>
                        {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">役職等级</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })}>
                        <option value="STAFF">员工 (Staff)</option>
                        <option value="SUB_MANAGER">次长 (Sub Manager)</option>
                        <option value="MANAGER">部长 (Manager)</option>
                        <option value="GENERAL_AFFAIRS">总务 (General Affairs)</option>
                        <option value="CEO">社长 (CEO)</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">状态</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                        <option value="PROSPECTIVE">内定 (Prospective)</option>
                        <option value="ACTIVE">在职 (Active)</option>
                        <option value="ON_LEAVE">休假 (On Leave)</option>
                        <option value="RESIGNED">离职 (Resigned)</option>
                        <option value="TERMINATED">解雇 (Terminated)</option>
                    </select>
                </div>

                {formData.status === 'ON_LEAVE' && (
                    <div className="col-span-2 grid grid-cols-2 gap-4 bg-amber-50 p-4 rounded-2xl border border-amber-100">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-amber-600 uppercase">休假开始日</label>
                            <input type="date" className="w-full p-2 bg-white border border-amber-200 rounded-lg" value={formData.leaveStartDate ? formData.leaveStartDate.split('T')[0] : ''} onChange={e => setFormData({ ...formData, leaveStartDate: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-amber-600 uppercase">休假结束日 (可选)</label>
                            <input type="date" className="w-full p-2 bg-white border border-amber-200 rounded-lg" value={formData.leaveEndDate ? formData.leaveEndDate.split('T')[0] : ''} onChange={e => setFormData({ ...formData, leaveEndDate: e.target.value })} />
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">工作地点模式</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.workLocation} onChange={e => setFormData({ ...formData, workLocation: e.target.value })}>
                        <option value="OFFICE">Office (出勤)</option>
                        <option value="REMOTE">Remote (在宅)</option>
                        <option value="WORKSITE">Worksite (现场)</option>
                    </select>
                </div>

                {formData.workLocation !== 'OFFICE' && (
                    <div className="col-span-2 grid grid-cols-2 gap-4 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-indigo-600 uppercase">模式开始日</label>
                            <input type="date" className="w-full p-2 bg-white border border-indigo-200 rounded-lg" value={formData.locationStartDate ? formData.locationStartDate.split('T')[0] : ''} onChange={e => setFormData({ ...formData, locationStartDate: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-indigo-600 uppercase">模式结束日 (可选)</label>
                            <input type="date" className="w-full p-2 bg-white border border-indigo-200 rounded-lg" value={formData.locationEndDate ? formData.locationEndDate.split('T')[0] : ''} onChange={e => setFormData({ ...formData, locationEndDate: e.target.value })} />
                        </div>
                    </div>
                )}

                <div className="col-span-2 pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all">キャンセル</button>
                    <button type="submit" className="px-8 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">
                        {isEdit ? '更新保存' : '登録実行'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Employees;
