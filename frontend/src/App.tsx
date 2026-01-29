
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import { AttendanceList } from './pages/AttendanceList';
// import EmployeeDetail from './pages/EmployeeDetail'; // Assume this exists or created later

const App: React.FC = () => {
    return (
        <Router>
            <div className="min-h-screen premium-gradient-bg flex flex-col">
                {/* Advanced Header */}
                <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 rotate-3 transition-transform hover:rotate-0">
                                <span className="text-white font-bold text-xl">A</span>
                            </div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-violet-700 tracking-tight">
                                Attendance Hub
                            </h1>
                        </div>
                        <nav className="hidden md:flex items-center gap-8">
                            <Link to="/" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">Dashboard</Link>
                            <Link to="/attendance/list" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">Exception List</Link>
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors">
                                <span className="text-xs font-bold">JD</span>
                            </div>
                        </nav>
                    </div>
                </header>

                <main className="flex-grow">
                    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/attendance/list" element={<AttendanceList />} />
                        </Routes>
                    </div>
                </main>

                <footer className="py-6 border-t border-slate-200/60 text-center text-slate-400 text-sm italic">
                    &copy; 2026 Attendance Hub. Designed for Premium Analytics.
                </footer>
            </div>
        </Router>
    );
};

export default App;
