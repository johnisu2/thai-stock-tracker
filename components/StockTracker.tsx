'use client';

import { useState, useEffect } from 'react';
import { popularThaiStocks } from '../lib/thaiStocks';
import MarketInsights from './MarketInsights';

// Default user email as requested
const DEFAULT_USER_EMAIL = 'jpraipiboonyakit@gmail.com';

export default function StockTracker() {
    const [symbol, setSymbol] = useState(popularThaiStocks[0]); // Default to first stock
    const [stockData, setStockData] = useState<{ symbol: string; price: number; timestamp: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [fullLoading, setFullLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Alert State
    const [targetPrice, setTargetPrice] = useState('');
    const [condition, setCondition] = useState('GT');

    // Alerts List State
    const [alerts, setAlerts] = useState<any[]>([]);
    const [alertsLoading, setAlertsLoading] = useState(false);

    // Watchlist State
    const [watchlist, setWatchlist] = useState<any[]>([]);

    // Fetch Data
    const fetchData = async () => {
        setAlertsLoading(true);
        try {
            // Alerts
            const resAlerts = await fetch(`/api/alerts?email=${DEFAULT_USER_EMAIL}`);
            if (resAlerts.ok) setAlerts(await resAlerts.json());

            // Watchlist
            const resFollows = await fetch(`/api/stocks/follow?email=${DEFAULT_USER_EMAIL}`);
            if (resFollows.ok) setWatchlist(await resFollows.json());

        } catch (e) {
            console.error("Failed to fetch data", e);
        } finally {
            setAlertsLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            await fetchData();
            // Artificial delay for better feel
            setTimeout(() => setFullLoading(false), 800);
        };
        init();
    }, []);

    const handleSearch = async () => {
        if (!symbol) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/stocks/fetch?symbol=${symbol}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch stock data');
            }

            setStockData(data);
        } catch (err: any) {
            setError(err.message);
            setStockData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleTestEmail = async () => {
        const res = await fetch('/api/email/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: DEFAULT_USER_EMAIL })
        });
        const data = await res.json();
        alert(data.message || data.error);
    };

    const handleSyncHistory = async () => {
        if (!confirm('ต้องการดึงข้อมูลหุ้นย้อนหลัง 7 วันเพื่อเปิดใช้งาน Dashboard หรือไม่? (อาจใช้เวลาสักครู่)')) return;
        setLoading(true);
        try {
            const res = await fetch('/api/stocks/history/seed', { method: 'POST' });
            const data = await res.json();
            alert(`✅ ${data.message}: บันทึกข้อมูลได้ ${data.recordsCreated} รายการ`);
            window.location.reload(); // Refresh to see real data
        } catch (e) {
            alert('❌ เกิดข้อผิดพลาดในการดึงข้อมูล');
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async () => {
        if (!stockData) return;
        try {
            const res = await fetch('/api/stocks/follow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: stockData.symbol,
                    userEmail: DEFAULT_USER_EMAIL,
                    price: stockData.price
                })
            });
            if (res.ok) {
                alert('Added to watchlist!');
                fetchData();
            } else {
                alert('Already in watchlist or error');
            }
        } catch (e) {
            alert('Error following stock');
        }
    };

    const handleUnfollow = async (id: number) => {
        if (!confirm('Remove from watchlist?')) return;
        await fetch(`/api/stocks/follow?id=${id}`, { method: 'DELETE' });
        fetchData();
    };

    if (fullLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spinner shadow-xl"></div>
                </div>
                <p className="mt-8 text-xl font-medium bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent animate-pulse">
                    กำลังจัดเตรียมตลาดหุ้นไทย...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto w-full space-y-8 animate-fade-in py-4">
            {/* Header Card */}
            <div className="glass p-8 rounded-3xl shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 -m-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -m-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                            Thai Stock Tracker
                        </h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-400 font-medium">ติดตามราคาหุ้นแบบ Real-time และตั้งค่าแจ้งเตือน</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleSyncHistory}
                            disabled={loading}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-2xl text-sm font-semibold text-white transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                        >
                            <span>🔄</span> ดึงข้อมูลย้อนหลัง (Sync)
                        </button>
                        <button
                            onClick={handleTestEmail}
                            className="px-6 py-3 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-2xl text-sm font-semibold text-blue-600 dark:text-blue-400 transition-all flex items-center gap-2 shadow-sm"
                        >
                            <span>✉️</span> ส่งสรุปหุ้นทางอีเมล
                        </button>
                    </div>
                </div>

                {/* Search & Detail Section */}
                <div className="mt-10 space-y-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <input
                                list="stock-symbols"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                placeholder="ค้นหาชื่อหุ้น (เช่น PTT...)"
                                className="w-full px-6 py-4 bg-white/80 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-lg font-semibold uppercase transition-all shadow-inner"
                            />
                            <datalist id="stock-symbols">
                                {popularThaiStocks.map(s => (
                                    <option key={s} value={s} />
                                ))}
                            </datalist>
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spinner"></div>
                            ) : '🚀 ค้นหาหุ้น'}
                        </button>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-3 animate-fade-in">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {stockData && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-gradient-to-br from-blue-50/50 to-white/50 dark:from-white/5 dark:to-transparent p-6 rounded-3xl border border-blue-100 dark:border-white/5 animate-fade-in">
                            <div className="md:col-span-5 flex justify-between items-start">
                                <div>
                                    <h3 className="text-sm font-bold text-blue-500 uppercase tracking-widest">{stockData.symbol}</h3>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-5xl font-black text-gray-900 dark:text-white">
                                            {stockData.price.toFixed(2)}
                                        </span>
                                        <span className="text-xl font-bold text-gray-400">THB</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                        🕒 อัปเดตเมื่อ: {new Date(stockData.timestamp).toLocaleString('th-TH')}
                                    </p>
                                </div>
                                <button
                                    onClick={handleFollow}
                                    className="p-3 bg-yellow-400 hover:bg-yellow-500 text-white rounded-2xl shadow-lg shadow-yellow-400/20 transition-all active:scale-90"
                                    title="เพิ่มในรายการโปรด"
                                >
                                    ⭐
                                </button>
                            </div>

                            <div className="md:col-span-7 md:border-l border-gray-200 dark:border-white/10 md:pl-8 flex flex-col justify-center">
                                <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase flex items-center gap-2">
                                    <span>🔔</span> ตั้งค่าแจ้งเตือนราคา
                                </h4>
                                <div className="flex flex-wrap gap-3">
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="ราคาเป้าหมาย"
                                        className="flex-1 min-w-[140px] px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-black dark:text-white focus:ring-2 focus:ring-blue-500/30"
                                        value={targetPrice}
                                        onChange={(e) => setTargetPrice(e.target.value)}
                                    />
                                    <select
                                        className="px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-black dark:text-white font-medium"
                                        value={condition}
                                        onChange={(e) => setCondition(e.target.value)}
                                    >
                                        <option value="GT">ราคามากกว่าหรือเท่ากับ (≥)</option>
                                        <option value="LT">ราคาน้อยกว่าหรือเท่ากับ (≤)</option>
                                    </select>
                                    <button
                                        onClick={async () => {
                                            if (!targetPrice) return;
                                            try {
                                                const res = await fetch('/api/alerts', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        symbol: stockData.symbol,
                                                        targetPrice: parseFloat(targetPrice),
                                                        condition,
                                                        userEmail: DEFAULT_USER_EMAIL
                                                    })
                                                });
                                                if (res.ok) {
                                                    alert('✅ ระบบจะส่งอีเมลเมื่อถึงราคาที่กำหนด!');
                                                    setTargetPrice('');
                                                    fetchData();
                                                }
                                            } catch (e) { alert('❌ เกิดข้อผิดพลาด'); }
                                        }}
                                        className="px-6 py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold rounded-xl transition-all hover:bg-gray-800 dark:hover:bg-gray-100"
                                    >
                                        ตั้งปลุก
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Market Insights Section */}
            <MarketInsights />

            {/* Watchlist Section */}
            <div className="glass p-8 rounded-3xl shadow-xl overflow-hidden relative">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                    <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">เครื่องมือติดตามหุ้น</h3>
                </div>

                {watchlist.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50/50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                        <div className="text-4xl mb-4 opacity-50">📋</div>
                        <p className="text-gray-500 font-medium italic">ยังไม่มีหุ้นในรายการติดตามของคุณ</p>
                    </div>
                ) : (
                    <div className="overflow-hidden border border-gray-100 dark:border-white/10 rounded-2xl bg-white/50 dark:bg-black/10">
                        <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-white/5">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">ชื่อหุ้น</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">ราคาเริ่มสแกน</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">ราคาปัจจุบัน</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">เป้าหมาย (แจ้งเตือน)</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                {watchlist.map((item) => {
                                    const isUp = item.livePrice >= item.stock.lastPrice;
                                    return (
                                        <tr key={item.id} className="hover:bg-white dark:hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400">
                                                        {item.stock.symbol[0]}
                                                    </div>
                                                    <span className="font-extrabold text-gray-900 dark:text-white">{item.stock.symbol}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 font-medium">{item.stock.lastPrice?.toFixed(2)}</td>
                                            <td className="px-6 py-4">
                                                <div className={`flex items-center gap-1.5 font-black text-lg ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                                                    {isUp ? '▲' : '▼'} {item.livePrice ? item.livePrice.toFixed(2) : '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.alert ? (
                                                    <div className="flex items-center">
                                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm transition-all hover:scale-105 ${item.alert.condition === 'GT'
                                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-500/30'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-500/30'
                                                            }`}>
                                                            <span className="text-sm">🔔</span>
                                                            <span className="opacity-70">{item.alert.condition === 'GT' ? '≥' : '≤'}</span>
                                                            <span>{item.alert.targetPrice.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-gray-700 font-medium">ไม่มีแจ้งเตือน</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {item.alert && (
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm('ลบการแจ้งเตือนนี้?')) return;
                                                                await fetch(`/api/alerts?id=${item.alert.id}`, { method: 'DELETE' });
                                                                fetchData();
                                                            }}
                                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                                            title="ลบแจ้งเตือน"
                                                        >
                                                            🔕
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleUnfollow(item.id)}
                                                        className="p-2 text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all"
                                                        title="หยุดติดตาม"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
