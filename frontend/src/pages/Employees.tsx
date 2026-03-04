import React, { useEffect, useState } from 'react';
import { fetchEmployees, updateEmployee, createEmployee, deleteEmployee, downloadEmployeesCsv } from '../services/employee.api';
import { fetchDepartments, Department } from '../services/department.api';
import { EmployeeProfile, EmployeeStatus, Position } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/common/Pagination';

// Skill: frontend-admin-view
export const Employees: React.FC = () => {
    const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [sortField, setSortField] = useState<string>('employeeId');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingEmployee, setEditingEmployee] = useState<EmployeeProfile | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const { user } = useAuth();
    const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

    const loadData = async (page: number = currentPage, sortF: string = sortField, sortO: 'asc' | 'desc' = sortOrder) => {
        try {
            setLoading(true);
            const [empRes, deptRes] = await Promise.all([
                fetchEmployees({
                    search: searchTerm,
                    page,
                    limit: itemsPerPage,
                    sortField: sortF,
                    sortOrder: sortO
                }),
                fetchDepartments()
            ]);
            if (empRes.success && empRes.data) {
                setEmployees(empRes.data.employees);
                setTotalItems(empRes.data.total);
            }
            if (deptRes.success && deptRes.data) setDepartments(deptRes.data);
        } catch (error) {
            console.error('Failed to load employee data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(1);
        setCurrentPage(1);
    }, [searchTerm]);

    useEffect(() => {
        loadData();
    }, [currentPage, sortField, sortOrder]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
        setCurrentPage(1);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`従業員 [${name}] を削除してもよろしいですか？\n削除後、この従業員はシステムにログインできなくなりますが、過去の考勤記録は保持されます。`)) {
            return;
        }

        try {
            const res = await deleteEmployee(id);
            if (res.success) {
                alert('従業員を削除しました');
                loadData();
            } else {
                alert(res.message || '削除に失敗しました');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert('システムエラーにより削除に失敗しました');
        }
    };

    const getStatusBadge = (status: EmployeeStatus) => {
        const colors: Record<EmployeeStatus, string> = {
            PROSPECTIVE: 'bg-blue-100 text-blue-700 border-blue-200',
            ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            RESIGNED: 'bg-slate-100 text-slate-500 border-slate-200',
        };
        const labels: Record<EmployeeStatus, string> = {
            PROSPECTIVE: '内定 (Prospective)',
            ACTIVE: '在職 (Active)',
            RESIGNED: '退職 (Resigned)',
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
            NORMAL: '通常勤務',
            PAID_LEAVE: '有給休暇',
            UNPAID_LEAVE: '無給/欠勤',
        };
        return <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-tighter ${colors[status] || colors.NORMAL}`}>{labels[status] || status}</span>;
    };

    const getPositionLabel = (pos: Position) => {
        const labels: Record<Position, string> = {
            STAFF: '一般社員',
            SUB_MANAGER: '主任/係長',
            MANAGER: '課長/部長',
            GENERAL_AFFAIRS: '総務',
            CEO: '代表/社長'
        };
        return labels[pos] || pos;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">従業員情報センター</h1>
                    <p className="text-slate-500 mt-1 uppercase text-xs tracking-widest font-bold">Employee Intelligence OS</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => loadData()}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5"
                    >
                        <ArrowPathIcon />
                        データ更新
                    </button>
                    {isAdminOrHR && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="btn-premium btn-primary px-6 py-2.5 text-sm font-bold shadow-lg shadow-indigo-200"
                        >
                            + 従業員登録
                        </button>
                    )}
                </div>
            </header>

            <div className="glass-card overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-200/60 flex items-center justify-between bg-white/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50">
                            <UsersIcon />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">登録メンバー</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group/search">
                            <input
                                type="text"
                                placeholder="氏名・ID・部署・役職など..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-1.5 bg-slate-100/50 border border-transparent rounded-lg text-xs font-bold focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 outline-none w-40 md:w-64 transition-all"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-indigo-500 transition-colors">
                                <SearchIcon />
                            </div>
                        </div>
                        <button
                            onClick={() => downloadEmployeesCsv({ search: searchTerm })}
                            className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-indigo-600 rounded-lg transition-all"
                            title="CSVエクスポート"
                        >
                            <DocumentArrowDownIcon />
                        </button>
                        <span className="text-[10px] font-black text-slate-400 italic">総数: {totalItems}</span>
                    </div>
                </div>
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th
                                className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleSort('employeeId')}
                            >
                                <div className="flex items-center gap-1">
                                    社員ID
                                    {sortField === 'employeeId' && (sortOrder === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />)}
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center gap-1">
                                    氏名 / 状態
                                    {sortField === 'name' && (sortOrder === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />)}
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleSort('position')}
                            >
                                <div className="flex items-center gap-1">
                                    役職 / 部署
                                    {sortField === 'position' && (sortOrder === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />)}
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleSort('workLocation')}
                            >
                                <div className="flex items-center gap-1">
                                    勤務地
                                    {sortField === 'workLocation' && (sortOrder === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />)}
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleSort('status')}
                            >
                                <div className="flex items-center gap-1">
                                    ステータス
                                    {sortField === 'status' && (sortOrder === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />)}
                                </div>
                            </th>
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
                                            {emp.workLocation === 'OFFICE' ? 'オフィス' : emp.workLocation === 'REMOTE' ? 'リモート' : '現場'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{getStatusBadge(emp.status)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {isAdminOrHR && (
                                                <button
                                                    onClick={() => setEditingEmployee(emp)}
                                                    className="text-indigo-600 hover:text-indigo-900 font-bold text-xs bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    編集
                                                </button>
                                            )}
                                            {isAdminOrHR && (
                                                <button
                                                    onClick={() => handleDelete(emp.id, emp.name)}
                                                    className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
                                                    title="削除"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <Pagination
                    currentPage={currentPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
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
        try {
            const res = isEdit
                ? await updateEmployee(employee.id, formData)
                : await createEmployee(formData);

            if (res.success) {
                const msg = isEdit
                    ? '従業員情報を更新しました'
                    : `従業員を登録しました\n\n[ログインアカウント]\nユーザー名: ${formData.employeeId}\n初期パスワード: Pass123`;
                alert(msg);
                onSaved();
            } else {
                alert(res.message || '保存中にエラーが発生しました');
            }
        } catch (error: any) {
            console.error('Submit Error:', error);
            const errorMsg = error.response?.data?.message || error.message || 'システムエラーが発生しました';
            alert(`操作に失敗しました: ${errorMsg}`);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black uppercase tracking-widest">{isEdit ? 'プロフィール編集' : '新規登録'}</h2>
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
                        <span className="w-8 h-[1px] bg-indigo-600"></span> 基本情報
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">社員ID / 社員番号</label>
                            <input disabled={isEdit} type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 font-mono font-bold" value={formData.employeeId} onChange={e => setFormData({ ...formData, employeeId: e.target.value })} required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">氏名 (Full Name)</label>
                            <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">性別</label>
                            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} required>
                                <option value="MALE">男 (Male)</option>
                                <option value="FEMALE">女 (Female)</option>
                                <option value="OTHER">その他 (Other)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">年齢</label>
                            <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.age} onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })} required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">電話番号</label>
                            <input type="tel" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="090-0000-0000" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">メールアドレス</label>
                            <input type="email" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="example@company.com" required />
                        </div>
                    </div>
                </section>

                {/* Section: Organization */}
                <section>
                    <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-8 h-[1px] bg-indigo-600"></span> 組織・役職
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">部署</label>
                            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value })} required>
                                <option value="">部署を選択...</option>
                                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">役職</label>
                            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })}>
                                <option value="STAFF">一般社員 (Staff)</option>
                                <option value="SUB_MANAGER">主任/係長 (Sub Manager)</option>
                                <option value="MANAGER">部長 (Manager)</option>
                                <option value="GENERAL_AFFAIRS">総務 (General Affairs)</option>
                                <option value="CEO">代表/社長 (CEO)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">雇用状態 (Lifecycle)</label>
                            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                <option value="PROSPECTIVE">内定 (Prospective)</option>
                                <option value="ACTIVE">在職 (Active)</option>
                                <option value="RESIGNED">退職 (Resigned)</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Section: Duty & Location */}
                <section>
                    <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-8 h-[1px] bg-indigo-600"></span> 勤務形態・勤務地
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">勤務先 / 打刻モード</label>
                                <select className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-indigo-700" value={formData.workLocation} onChange={e => setFormData({ ...formData, workLocation: e.target.value })}>
                                    <option value="OFFICE">🏢 オフィス (Office)</option>
                                    <option value="REMOTE">🏠 リモート (Remote)</option>
                                    <option value="WORKSITE">🏗️ 現場 (Worksite)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">勤務ステータス</label>
                                <select className="w-full p-3 bg-amber-50 border border-amber-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-black text-amber-700" value={formData.dutyStatus} onChange={e => setFormData({ ...formData, dutyStatus: e.target.value })}>
                                    <option value="NORMAL">✅ 通常勤務</option>
                                    <option value="PAID_LEAVE">🏖️ 有給休暇 (Paid Leave)</option>
                                    <option value="UNPAID_LEAVE">🚫 無給/欠勤 (Unpaid Leave)</option>
                                </select>
                            </div>
                            {formData.dutyStatus !== 'NORMAL' && (
                                <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                                    <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest italic">終了予定日 / 自動復帰日</label>
                                    <input type="date" className="w-full p-3 bg-white border-2 border-amber-200 rounded-xl outline-none focus:border-amber-500 font-bold" value={formData.dutyStatusEndDate ? formData.dutyStatusEndDate.split('T')[0] : ''} onChange={e => setFormData({ ...formData, dutyStatusEndDate: e.target.value })} />
                                    <p className="text-[9px] text-amber-500 font-bold mt-1">※ 設定した期日の翌日07:00のシステム更新により、自動的に「通常勤務」に戻ります。</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <div className="pt-8 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white pb-4 mt-4">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-slate-400 font-black uppercase text-xs tracking-widest hover:bg-slate-50 rounded-xl transition-all">キャンセル</button>
                    <button type="submit" className="px-10 py-3 bg-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-xl shadow-slate-200 hover:bg-black active:scale-95 transition-all">
                        {isEdit ? '変更を保存' : '今すぐ登録'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const UsersIcon = () => (
    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
);
const SearchIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
);
const ArrowPathIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
);
const ArrowUpIcon = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
);
const ArrowDownIcon = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
);

const DocumentArrowDownIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);

export default Employees;
