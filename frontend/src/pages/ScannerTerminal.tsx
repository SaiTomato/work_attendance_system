import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { scanPunchToken } from '../services/attendance.api';

export const ScannerTerminal: React.FC = () => {
    const [lastScan, setLastScan] = useState<{ status: 'success' | 'error', message: string, name?: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    // Audio elements - Using standard beeps if links fail
    const successAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    const errorAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');

    const startScanner = () => {
        setCameraError(null);

        // Ensure old one is gone
        if (scannerRef.current) {
            scannerRef.current.clear().catch(() => { });
        }

        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            /* verbose= */ false
        );

        scanner.render(onScanSuccess, () => {
            // Keep this empty to ignore periodic "No QR code found" logs
        });

        scannerRef.current = scanner;
    };

    useEffect(() => {
        // Delay a bit to ensure old DOM/Media sessions are closed
        const timer = setTimeout(() => {
            startScanner();
        }, 300);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Cleanup failed", error);
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
                    message: res.message || '打卡成功',
                    name: res.data?.employeeName
                });
            } else {
                errorAudio.play().catch(() => { });
                setLastScan({ status: 'error', message: res.message || '打卡失败' });
            }
        } catch (err: any) {
            errorAudio.play().catch(() => { });
            const msg = err.response?.data?.message || '服务器拒绝打卡';
            setLastScan({ status: 'error', message: msg });
        } finally {
            setTimeout(() => {
                setLastScan(null);
                setIsProcessing(false);
            }, 3500);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-slate-800 rounded-[2rem] shadow-2xl border border-slate-700 p-8 flex flex-col items-center">
                <header className="text-center mb-8">
                    <h1 className="text-3xl font-black text-white tracking-widest uppercase flex items-center gap-3 justify-center">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                        Terminal Inbound
                    </h1>
                    <p className="text-slate-400 mt-2 font-mono text-sm uppercase">Secure Verification Active</p>
                </header>

                <div className="relative w-full aspect-square max-w-[380px] bg-black rounded-3xl overflow-hidden border-4 border-slate-700 shadow-2xl group">
                    <div id="reader" className="w-full h-full"></div>

                    {/* Error State */}
                    {cameraError && (
                        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-8 text-center z-20">
                            <div className="w-16 h-16 bg-rose-500 text-white rounded-full flex items-center justify-center mb-4">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">Camera Access Failed</h3>
                            <p className="text-slate-400 text-sm mb-6">设备占用中或未获授权。请确保没有其他窗口开启摄像头。</p>
                            <button onClick={startScanner} className="px-6 py-2 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-500 transition-colors">
                                重试加载 (Retry)
                            </button>
                        </div>
                    )}

                    {/* Scan Overlay UI */}
                    {isProcessing && (
                        <div className="absolute inset-0 bg-emerald-900/40 backdrop-blur-md flex items-center justify-center z-10 animate-in fade-in duration-300">
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                <span className="text-white font-black mt-4 tracking-[0.2em] text-sm">AUTHENTICATING</span>
                            </div>
                        </div>
                    )}

                    {/* Decorative Corner Borders */}
                    <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-white/30 rounded-tl-lg pointer-events-none"></div>
                    <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-white/30 rounded-tr-lg pointer-events-none"></div>
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-white/30 rounded-bl-lg pointer-events-none"></div>
                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-white/30 rounded-br-lg pointer-events-none"></div>
                </div>

                <div className="mt-10 w-full min-h-[140px]">
                    {lastScan ? (
                        <div className={`p-6 rounded-3xl flex items-center gap-6 animate-in zoom-in slide-in-from-bottom-6 duration-500 ${lastScan.status === 'success' ? 'bg-emerald-500/10 border-2 border-emerald-500/30' : 'bg-rose-500/10 border-2 border-rose-500/30'}`}>
                            <div className={`w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center ${lastScan.status === 'success' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/40'}`}>
                                {lastScan.status === 'success' ? (
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h3 className={`text-sm font-black uppercase tracking-widest ${lastScan.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {lastScan.status === 'success' ? 'Verified Successfully' : 'Action Blocked'}
                                </h3>
                                <p className="text-white text-xl font-bold mt-1 truncate">
                                    {lastScan.status === 'success' ? `${lastScan.name} さん、欢迎！` : lastScan.message}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 text-white space-y-3">
                            <div className="flex gap-2">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Waiting for QR Code</span>
                        </div>
                    )}
                </div>
            </div>

            <footer className="mt-12 flex items-center gap-6">
                <div className="px-4 py-2 bg-slate-800 rounded-full border border-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Secure Channel</span>
                </div>
                <button onClick={() => window.location.reload()} className="text-slate-500 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            </footer>
        </div>
    );
};
