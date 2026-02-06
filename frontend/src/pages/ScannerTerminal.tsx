import React, { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { scanPunchToken } from '../services/attendance.api';
import { useAuth } from '../contexts/AuthContext';

// 全局硬件排他锁，防止 React StrictMode 或快速切换引起冲突
let globalScannerInstance: Html5Qrcode | null = null;
let isReleasing = false;

export const ScannerTerminal: React.FC = () => {
    const [lastScan, setLastScan] = useState<{ status: 'success' | 'error', message: string, name?: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const { logout } = useAuth();

    // Audio elements
    const successAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    const errorAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');

    const initScanner = async () => {
        if (isReleasing) {
            setTimeout(initScanner, 500);
            return;
        }

        try {
            setIsInitializing(true);
            setCameraError(null);

            // 1. 如果已有实例，先杀掉
            if (globalScannerInstance) {
                try { await globalScannerInstance.stop(); } catch (e) { }
            }

            // 2. 创建新实例
            const scanner = new Html5Qrcode("reader");
            globalScannerInstance = scanner;

            // 3. 启动
            await scanner.start(
                { facingMode: "user" }, // 或者 "environment"
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                onScanSuccess,
                () => { } // 忽略失败帧
            );
            setIsInitializing(false);
        } catch (err: any) {
            console.error("Camera Init Error:", err);
            setCameraError(err.message || '摄像头启动失败，请检查权限或设备是否被占用');
            setIsInitializing(false);
        }
    };

    useEffect(() => {
        // 延迟启动，给前一个组件留出释放硬件的时间
        const timer = setTimeout(() => {
            initScanner();
        }, 600);

        return () => {
            clearTimeout(timer);
            if (globalScannerInstance) {
                isReleasing = true;
                globalScannerInstance.stop().then(() => {
                    globalScannerInstance = null;
                    isReleasing = false;
                }).catch(() => {
                    globalScannerInstance = null;
                    isReleasing = false;
                });
            }
        };
    }, []);

    const onScanSuccess = async (decodedText: string) => {
        if (isProcessing) return;
        setIsProcessing(true);

        try {
            const res = await scanPunchToken(decodedText);
            if (res.success) {
                successAudio.play().catch(() => { });
                setLastScan({
                    status: 'success',
                    message: res.message || '认证成功',
                    name: res.data?.employeeName
                });
            } else {
                errorAudio.play().catch(() => { });
                setLastScan({ status: 'error', message: res.message || '打卡已拦截' });
            }
        } catch (err: any) {
            errorAudio.play().catch(() => { });
            const msg = err.response?.data?.message || '认证服务异常';
            setLastScan({ status: 'error', message: msg });
        } finally {
            setTimeout(() => {
                setLastScan(null);
                setIsProcessing(false);
            }, 3500);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden">
            {/* 顶栏装饰 */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>

            <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/5 p-10 flex flex-col items-center relative overflow-hidden">
                {/* 背景装饰球 */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px]"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-600/5 rounded-full blur-[100px]"></div>

                <header className="text-center mb-10 z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-white/5 mb-4">
                        <span className={`w-2 h-2 rounded-full ${isInitializing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            {isInitializing ? 'Module Initializing' : 'System Operational'}
                        </span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic">
                        Node <span className="text-indigo-500">Terminal</span>
                    </h1>
                    <button
                        onClick={() => logout()}
                        className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Exit Terminal
                    </button>
                </header>

                <div className="relative w-full aspect-square max-w-[400px] rounded-[2.5rem] overflow-hidden border-2 border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-black group">
                    <div id="reader" className="w-full h-full scale-[1.02]"></div>

                    {/* Camera Init Loading */}
                    {isInitializing && (
                        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-20">
                            <div className="w-10 h-10 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    )}

                    {/* Error Overlay */}
                    {cameraError && (
                        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-8 text-center z-30 animate-in fade-in duration-500">
                            <div className="w-20 h-20 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-6 border border-rose-500/30">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">传感器链接中断</h3>
                            <p className="text-slate-400 text-sm mb-8 leading-relaxed">设备可能被其他窗口占用或权限未开放。<br />请关闭其他视频应用并重试。</p>
                            <button onClick={initScanner} className="px-8 py-3 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-xl">
                                重新唤醒 (Re-Link)
                            </button>
                        </div>
                    )}

                    {/* Authenticating State */}
                    {isProcessing && (
                        <div className="absolute inset-0 bg-indigo-600/40 backdrop-blur-xl flex items-center justify-center z-20 animate-in zoom-in duration-300">
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
                                <span className="text-white font-black mt-6 tracking-[0.4em] text-xs">ENCRYPTING</span>
                            </div>
                        </div>
                    )}

                    {/* UI Frame Accents */}
                    <div className="absolute inset-0 border-[20px] border-black/10 pointer-events-none"></div>
                    <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-indigo-500/40 rounded-tl-xl pointer-events-none"></div>
                    <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-indigo-500/40 rounded-tr-xl pointer-events-none"></div>
                    <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-indigo-500/40 rounded-bl-xl pointer-events-none"></div>
                    <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-indigo-500/40 rounded-br-xl pointer-events-none"></div>
                </div>

                {/* Status Result Display */}
                <div className="mt-12 w-full min-h-[140px] flex items-center justify-center relative">
                    {lastScan ? (
                        <div className={`w-full p-8 rounded-[2.5rem] flex items-center gap-8 animate-in cubic-bezier(0.175, 0.885, 0.32, 1.275) zoom-in slide-in-from-bottom-10 duration-700 ${lastScan.status === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)]' : 'bg-rose-500/10 border border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.1)]'}`}>
                            <div className={`w-20 h-20 rounded-3xl flex-shrink-0 flex items-center justify-center ${lastScan.status === 'success' ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/40' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/40'}`}>
                                {lastScan.status === 'success' ? (
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h3 className={`text-xs font-black uppercase tracking-[0.3em] mb-2 ${lastScan.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {lastScan.status === 'success' ? 'Access Authorized' : 'Security Halt'}
                                </h3>
                                <p className="text-2xl font-black tracking-tight truncate leading-none">
                                    {lastScan.status === 'success' ? lastScan.name : lastScan.message}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 opacity-20">
                            <div className="flex gap-3">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,1)]"></div>
                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Device Standing By</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 页面脚注 */}
            <footer className="mt-16 text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-8">
                <span>Core.v2.5</span>
                <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                <span>Active Link: Biometric-Scanner</span>
                <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                <button onClick={() => window.location.reload()} className="hover:text-white transition-colors cursor-pointer">Re-Sync</button>
            </footer>
        </div>
    );
};
