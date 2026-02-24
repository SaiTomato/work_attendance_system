import React, { useEffect, useState } from 'react';
import { fetchEmployees, updateEmployee, createEmployee } from '../services/employee.api';
import { fetchDepartments, Department } from '../services/department.api';
import { EmployeeProfile, EmployeeStatus, Position } from '../types';
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
            RESIGNED: 'bg-slate-100 text-slate-500 border-slate-200',
        };
        const labels: Record<EmployeeStatus, string> = {
            PROSPECTIVE: '内定 (Prospective)',
            ACTIVE: '在职 (Active)',
            RESIGNED: '离职 (Resigned)',
        };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${colors[status]}`}>{labels[status]}</span>;
    };

    const getDutyStatusBadge = (status: any) => {
        const colors: any = {
            NORMAL: 'bg-indigo-50 text-indigo-600 border-indigo-100',
            PAID_LEAVE: 'bg-amber-50 text-amber-600 border-amber-100',
            UNPAID_LEAVE: 'bg-rose-50 text-rose-600 border-rose-100',
        };
        const labels: any = {
            NORMAL: '通常上班',
            PAID_LEAVE: '有休',
            UNPAID_LEAVE: '无休',
        };
        return <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-tighter ${colors[status] || colors.NORMAL}`}>{labels[status] || status}</span>;
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
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">氏名 / 模式</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">役職 / 部署</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">工作地点</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">ステータ斯</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="py-20 text-center text-slate-400">読み込み中...</td></tr>
                        ) : employees.length === 0 ? (
                            <tr><td colSpan={6} className="py-20 text-center text-slate-400">数据が見つかりません。</td></tr>
                        ) : (
                            employees.map(emp => (
                                <tr key={emp.id} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-6 py-4 text-sm font-mono text-slate-500">{emp.employeeId}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{emp.name}</div>
                                        <div className="mt-1 flex items-center gap-1">
                                            {getDutyStatusBadge(emp.dutyStatus)}
                                            {emp.dutyStatusEndDate && (
                                                <span className="text-[9px] text-slate-400 font-bold">~ {new Date(emp.dutyStatusEndDate).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-slate-700">{getPositionLabel(emp.position)}</div>
                                        <div className="text-xs text-slate-400">{emp.department?.name || '--'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase
                                            ${emp.workLocation === 'OFFICE' ? 'text-blue-600 bg-blue-50' :
                                                emp.workLocation === 'REMOTE' ? 'text-purple-600 bg-purple-50' : 'text-orange-600 bg-orange-50'}`}>
                                            {emp.workLocation}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{getStatusBadge(emp.status)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setEditingEmployee(emp)}
                                            className="text-indigo-600 hover:text-indigo-900 font-bold text-sm bg-indigo-50 px-3 py-1 rounded-lg transition-colors"
                                        >
                                            編集
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {editingEmployee && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <EmployeeEditForm
                        employee={editingEmployee}
                        departments={departments}
                        onClose={() => setEditingEmployee(null)}
                        onSaved={() => { loadData(); setEditingEmployee(null); }}
                    />
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
        gender: 'MALE',
        age: 25,
        phone: '',
        email: '',
        position: 'STAFF',
        status: 'ACTIVE',
        dutyStatus: 'NORMAL',
        dutyStatusEndDate: '',
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
            <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black uppercase tracking-widest">{isEdit ? 'Profile Edit' : 'New Registration'}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Personnel Management System</p>
                </div>
                <button onClick={onClose} className="hover:rotate-90 transition-transform p-2 bg-white/10 rounded-full">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                {/* Section: Basic Info */}
                <section>
                    <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-8 h-[1px] bg-indigo-600"></span> Basic Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee ID / 社員番号</label>
                            <input disabled={isEdit} type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 font-mono font-bold" value={formData.employeeId} onChange={e => setFormData({ ...formData, employeeId: e.target.value })} required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name / 氏名</label>
                            <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gender / 性別</label>
                            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                <option value="MALE">男性</option>
                                <option value="FEMALE">女性</option>
                                <option value="OTHER">その他</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Age / 年齢</label>
                            <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />
                        </div>
                    </div>
                </section>

                {/* Section: Organization */}
                <section>
                    <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-8 h-[1px] bg-indigo-600"></span> Organization & Role
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department / 部署</label>
                            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value })}>
                                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Position / 役職</label>
                            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })}>
                                <option value="STAFF">员工 (Staff)</option>
                                <option value="SUB_MANAGER">次长 (Sub Manager)</option>
                                <option value="MANAGER">部长 (Manager)</option>
                                <option value="GENERAL_AFFAIRS">总务 (General Affairs)</option>
                                <option value="CEO">社长 (CEO)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lifecycle / 状态</label>
                            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                <option value="PROSPECTIVE">内定 (Prospective)</option>
                                <option value="ACTIVE">在职 (Active)</option>
                                <option value="RESIGNED">离职 (Resigned)</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Section: Duty & Location */}
                <section>
                    <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-8 h-[1px] bg-indigo-600"></span> Duty Mode & Location
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Work Location / 打卡模式</label>
                                <select className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-indigo-700" value={formData.workLocation} onChange={e => setFormData({ ...formData, workLocation: e.target.value })}>
                                    <option value="OFFICE">🏢 OFFICE (办公室)</option>
                                    <option value="REMOTE">🏠 REMOTE (在宅/远程)</option>
                                    <option value="WORKSITE">🏗️ WORKSITE (现场)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duty Status / 长期模式</label>
                                <select className="w-full p-3 bg-amber-50 border border-amber-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-black text-amber-700" value={formData.dutyStatus} onChange={e => setFormData({ ...formData, dutyStatus: e.target.value })}>
                                    <option value="NORMAL">✅ 通常上班</option>
                                    <option value="PAID_LEAVE">🏖️ 有休 (Paid Leave)</option>
                                    <option value="UNPAID_LEAVE">🚫 无休 (Unpaid Leave)</option>
                                </select>
                            </div>
                            {formData.dutyStatus !== 'NORMAL' && (
                                <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                                    <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest italic">Expiry Date / 自动恢复上班日期</label>
                                    <input type="date" className="w-full p-3 bg-white border-2 border-amber-200 rounded-xl outline-none focus:border-amber-500 font-bold" value={formData.dutyStatusEndDate ? formData.dutyStatusEndDate.split('T')[0] : ''} onChange={e => setFormData({ ...formData, dutyStatusEndDate: e.target.value })} />
                                    <p className="text-[9px] text-amber-500 font-bold mt-1">※ 到期后，每天07:00的CRON任务会自动将其转回“通常上班”。</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <div className="pt-8 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white pb-4 mt-4">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-slate-400 font-black uppercase text-xs tracking-widest hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                    <button type="submit" className="px-10 py-3 bg-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-xl shadow-slate-200 hover:bg-black active:scale-95 transition-all">
                        {isEdit ? 'Save Changes' : 'Register Now'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Employees;
