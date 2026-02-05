import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import { AttendanceList } from './pages/AttendanceList';
import Employees from './pages/Employees';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

const Header = () => {
    const { logout, user } = useAuth();

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
                <nav className="hidden md:flex items-center gap-8">
                    {user?.role !== 'viewer' && (
                        <>
                            <Link to="/" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">Dashboard</Link>
                            <Link to="/attendance/list" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">例外リスト</Link>
                        </>
                    )}
                    {(user?.role === 'admin' || user?.role === 'hr') && (
                        <>
                            <Link to="/employees" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors border-l border-slate-200 pl-8">社員情報管理</Link>
                            <Link to="/scanner" className="ml-4 px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors">Terminal Mode</Link>
                        </>
                    )}
                    <div className="flex items-center gap-3 border-l border-slate-200 pl-8">
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">{user?.username}</p>
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{user?.role}</p>
                        </div>
                        <button
                            onClick={() => logout()}
                            className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 cursor-pointer hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all"
                            title="Sign Out"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </nav>
            </div>
        </header>
    );
};

import { PunchQR } from './pages/PunchQR';
import { ScannerTerminal } from './pages/ScannerTerminal';

const AppContent: React.FC = () => {
    const { isAuthenticated, user } = useAuth();

    return (
        <div className="min-h-screen premium-gradient-bg flex flex-col">
            {/* 扫码终端页面不显示 Header */}
            {isAuthenticated && window.location.pathname !== '/scanner' && <Header />}

            <main className="flex-grow">
                <div className={window.location.pathname === '/scanner' || window.location.pathname === '/punch-qr' ? "" : "max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8"}>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/scanner" element={<ScannerTerminal />} />
                        <Route path="/punch-qr" element={<ProtectedRoute><PunchQR /></ProtectedRoute>} />

                        <Route path="/" element={
                            <ProtectedRoute>
                                {user?.role === 'viewer' ? <Navigate to="/punch-qr" replace /> : <Dashboard />}
                            </ProtectedRoute>
                        } />

                        <Route path="/attendance/list" element={<ProtectedRoute><AttendanceList /></ProtectedRoute>} />
                        <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
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
