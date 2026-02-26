import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import { AttendanceList } from './pages/AttendanceList';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import { LeaveManagement } from './pages/LeaveManagement';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
    const { isAuthenticated, user } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // ロールが不一致の場合、それぞれの専用ページへリダイレクト
        if (user.role === 'terminal') return <Navigate to="/scanner" replace />;
        if (user.role === 'viewer') return <Navigate to="/punch-qr" replace />;
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
};

import { leaveApi } from './services/leave.api';

const Header = () => {
    const { logout, user } = useAuth();
    const [badgeCount, setBadgeCount] = React.useState(0);
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const checkNotifications = async () => {
        if (!user || user.role === 'terminal') return;
        try {
            const res = await leaveApi.getNotificationCount();
            if (res.success) {
                setBadgeCount(res.data.count);
            }
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        }
    };

    React.useEffect(() => {
        checkNotifications();
        const timer = setInterval(checkNotifications, 60000); // 60秒おきに通知を確認

        // カスタムイベントの待機 (LeaveManagement 等からの通知トリガー)
        window.addEventListener('refreshNotifications', checkNotifications);

        return () => {
            clearInterval(timer);
            window.removeEventListener('refreshNotifications', checkNotifications);
        };
    }, [user?.id]);

    return (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 transition-all">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 rotate-3 transition-transform hover:rotate-0">
                        <span className="text-white font-bold text-xl">A</span>
                    </div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-violet-700 tracking-tight">
                        Attendance Hub
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    {/* モバイルメニューボタン */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors relative"
                    >
                        {isMenuOpen ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        ) : (
                            <>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                                {badgeCount > 0 && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
                                )}
                            </>
                        )}
                    </button>

                    <nav className="hidden md:flex items-center gap-8">
                        {['admin', 'manager', 'hr'].includes(user?.role || '') && (
                            <>
                                <Link to="/" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">ホームページ</Link>
                                <Link to="/attendance/list" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">状態リスト</Link>
                            </>
                        )}
                        {user?.role !== 'terminal' && (
                            <Link to="/leave" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors relative">
                                休暇申請/承認
                                {badgeCount > 0 && (
                                    <span className="absolute -top-2 -right-3 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-rose-200 animate-bounce">
                                        {badgeCount > 99 ? '99+' : badgeCount}
                                    </span>
                                )}
                            </Link>
                        )}
                        {(user?.role === 'admin' || user?.role === 'hr') && (
                            <Link to="/employees" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors border-l border-slate-200 pl-8">社員情報管理</Link>
                        )}
                        {/* ターミナルと管理者の場合に Terminal Mode を表示 */}
                        {(user?.role === 'admin' || user?.role === 'terminal') && (
                            <Link to="/scanner" className="ml-4 px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors">Terminal Mode</Link>
                        )}
                        <div className="flex items-center gap-3 border-l border-slate-200 pl-8">
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">{user?.username}</p>
                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                                    {user?.role === 'admin' ? '管理者' : user?.role === 'hr' ? '人事' : user?.role === 'manager' ? 'マネージャー' : '一般'}
                                </p>
                            </div>
                            <button
                                onClick={() => logout()}
                                className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 cursor-pointer hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all"
                                title="ログアウト"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            </button>
                        </div>
                    </nav>
                </div>
            </div>

            {/* モバイルナビゲーションオーバーレイ */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-slate-100 bg-white animate-in slide-in-from-top duration-300">
                    <div className="px-4 py-6 space-y-4">
                        {['admin', 'manager', 'hr'].includes(user?.role || '') && (
                            <>
                                <Link to="/" onClick={() => setIsMenuOpen(false)} className="block px-4 py-3 text-base font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">ホームページ</Link>
                                <Link to="/attendance/list" onClick={() => setIsMenuOpen(false)} className="block px-4 py-3 text-base font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">状態リスト</Link>
                            </>
                        )}
                        {user?.role !== 'terminal' && (
                            <Link to="/leave" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between px-4 py-3 text-base font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                                <span>休暇申請/承認</span>
                                {badgeCount > 0 && (
                                    <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-full">
                                        {badgeCount}
                                    </span>
                                )}
                            </Link>
                        )}
                        {(user?.role === 'admin' || user?.role === 'hr') && (
                            <Link to="/employees" onClick={() => setIsMenuOpen(false)} className="block px-4 py-3 text-base font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">社員情報管理</Link>
                        )}
                        <div className="pt-4 border-t border-slate-50 flex items-center justify-between px-4">
                            <div>
                                <p className="text-sm font-black text-slate-900">{user?.username}</p>
                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                                    {user?.role === 'admin' ? '管理者' : user?.role === 'hr' ? '人事' : user?.role === 'manager' ? 'マネージャー' : '一般'}
                                </p>
                            </div>
                            <button
                                onClick={() => { logout(); setIsMenuOpen(false); }}
                                className="px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-black uppercase tracking-widest transition-colors"
                            >
                                ログアウト
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

import { PunchQR } from './pages/PunchQR';
import { ScannerTerminal } from './pages/ScannerTerminal';

const AppContent: React.FC = () => {
    const { isAuthenticated, user } = useAuth();

    return (
        <div className="min-h-screen premium-gradient-bg flex flex-col">
            {/* スキャンターミナルページおよびターミナルアカウント、またはスキャナーページでは Header を非表示 */}
            {isAuthenticated && user?.role !== 'terminal' && window.location.pathname !== '/scanner' && <Header />}

            <main className="flex-grow">
                <div className={window.location.pathname === '/scanner' || window.location.pathname === '/punch-qr' ? "" : "max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8"}>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/scanner" element={
                            <ProtectedRoute allowedRoles={['admin', 'terminal']}>
                                <ScannerTerminal />
                            </ProtectedRoute>
                        } />
                        <Route path="/punch-qr" element={<ProtectedRoute><PunchQR /></ProtectedRoute>} />

                        <Route path="/" element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}>
                                <Dashboard />
                            </ProtectedRoute>
                        } />

                        <Route path="/attendance/list" element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}>
                                <AttendanceList />
                            </ProtectedRoute>
                        } />

                        <Route path="/attendance/history/:id" element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}>
                                <EmployeeDetail />
                            </ProtectedRoute>
                        } />

                        <Route path="/leave" element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'hr', 'viewer']}>
                                <LeaveManagement />
                            </ProtectedRoute>
                        } />

                        <Route path="/employees" element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <Employees />
                            </ProtectedRoute>
                        } />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </main>

            <footer className="py-6 border-t border-slate-200/60 text-center text-slate-400 text-sm italic">
                &copy; 2026 Attendance Hub. Designed for Premium Analytics.
            </footer>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <Router>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </Router>
    );
};

export default App;
