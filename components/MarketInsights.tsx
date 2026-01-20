'use client';

import { useState, useEffect } from 'react';

interface InsightStock {
    symbol: string;
    currentPrice: number;
    change7d: number;
    streak: number;
    isAboveAvg: boolean;
}

export default function MarketInsights() {
    const [insights, setInsights] = useState<{ topGainers: InsightStock[], momentumStocks: InsightStock[], isMock?: boolean } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const res = await fetch('/api/stocks/insights');
                if (res.ok) {
                    const data = await res.json();
                    setInsights(data);
                }
            } catch (e) {
                console.error('Failed to fetch insights', e);
            } finally {
                setLoading(false);
            }
        };
        fetchInsights();
    }, []);

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            <div className="h-48 bg-gray-200 dark:bg-white/5 rounded-3xl"></div>
            <div className="h-48 bg-gray-200 dark:bg-white/5 rounded-3xl"></div>
        </div>
    );

    if (!insights || (insights.topGainers.length === 0 && insights.momentumStocks.length === 0)) {
        return null; // Don't show if no data
    }

    const StockCard = ({ stock, type }: { stock: InsightStock, type: 'gainer' | 'momentum' }) => (
        <div className="flex items-center justify-between p-4 bg-white/40 dark:bg-white/5 border border-white/20 rounded-2xl transition-all hover:scale-[1.02] hover:bg-white/60 dark:hover:bg-white/10 group">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm ${type === 'gainer'
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>
                    {stock.symbol[0]}
                </div>
                <div>
                    <div className="font-black text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors uppercase">{stock.symbol}</div>
                    <div className="text-xs font-bold text-gray-500 flex items-center gap-1">
                        {type === 'gainer' ? '7 วันที่ผ่านมา' : `${stock.streak} วันบวกติดกัน`}
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className={`font-black text-lg ${type === 'gainer' ? 'text-green-600' : 'text-orange-500'}`}>
                    {type === 'gainer' ? `+${stock.change7d.toFixed(1)}%` : `🔥 ${stock.streak}D`}
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                    {stock.currentPrice.toFixed(2)} THB
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4 animate-fade-in">
            {insights.isMock && (
                <div className="flex items-center justify-between px-6 py-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-bold">
                        <span className="animate-pulse">🧪</span>
                        <span>โหมดสาธิต (Demo Mode): กำลังรอข้อมูลประวัติหุ้นจริง 7 วัน</span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Gainers */}
                <div className="glass p-6 rounded-3xl shadow-xl relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-500 rounded-lg text-white shadow-lg shadow-green-500/20">🚀</div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white">หุ้นพุ่งแรง 7 วัน</h3>
                    </div>
                    <div className="space-y-3">
                        {insights.topGainers.map(s => <StockCard key={s.symbol} stock={s} type="gainer" />)}
                    </div>
                </div>

                {/* Momentum Stocks */}
                <div className="glass p-6 rounded-3xl shadow-xl relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-orange-500 rounded-lg text-white shadow-lg shadow-orange-500/20">🔥</div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white">Momentum มาแรง</h3>
                    </div>
                    <div className="space-y-3">
                        {insights.momentumStocks.map(s => <StockCard key={s.symbol} stock={s} type="momentum" />)}
                    </div>
                </div>
            </div>
        </div>
    );
}
