'use client';

import { useState, useEffect } from 'react';
import { popularThaiStocks } from '../lib/thaiStocks';

// Default user email as requested
const DEFAULT_USER_EMAIL = 'jpraipiboonyakit@gmail.com';

export default function StockTracker() {
    const [symbol, setSymbol] = useState(popularThaiStocks[0]); // Default to first stock
    const [stockData, setStockData] = useState<{ symbol: string; price: number; timestamp: string } | null>(null);
    const [loading, setLoading] = useState(false);
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
        fetchData();
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

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-md space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Thai Stock Tracker</h2>
                <button
                    onClick={handleTestEmail}
                    className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-gray-700"
                >
                    Email Summary (Test)
                </button>
            </div>

            {/* Search Section */}
            <div className="flex gap-2">
                <input
                    list="stock-symbols"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="Type to search (e.g. PTT)"
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black uppercase"
                />
                <datalist id="stock-symbols">
                    {popularThaiStocks.map(s => (
                        <option key={s} value={s} />
                    ))}
                </datalist>
                <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Loading...' : 'Track'}
                </button>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            {/* Stock Detail & Set Alert */}
            {stockData && (
                <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">{stockData.symbol}</h3>
                            <span className="text-2xl font-bold text-green-600">{stockData.price.toFixed(2)} THB</span>
                        </div>
                        <button
                            onClick={handleFollow}
                            className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200"
                        >
                            ★ Follow
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">Updated: {new Date(stockData.timestamp).toLocaleString()}</p>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-semibold text-sm mb-2 text-gray-700">Set Alert for {DEFAULT_USER_EMAIL}</h4>
                        <div className="flex gap-2 items-center">
                            <input
                                type="number"
                                placeholder="Target Price"
                                className="flex-1 p-2 border border-gray-300 rounded-md text-sm text-black"
                                value={targetPrice}
                                onChange={(e) => setTargetPrice(e.target.value)}
                            />
                            <select
                                className="p-2 border border-gray-300 rounded-md text-sm text-black"
                                value={condition}
                                onChange={(e) => setCondition(e.target.value)}
                            >
                                <option value="GT">Greater Than ({'>'})</option>
                                <option value="LT">Less Than ({'<'})</option>
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
                                            alert('Alert set!');
                                            setTargetPrice('');
                                            fetchData(); // Refresh table
                                        } else {
                                            const err = await res.json();
                                            alert('Failed to set alert: ' + (err.error || 'Unknown error'));
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        alert('Error setting alert');
                                    }
                                }}
                                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                            >
                                Set Alert
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">My Portfolio (Watchlist & Alerts)</h3>
                {watchlist.length === 0 ? (
                    <p className="text-gray-500 text-sm">No stocks in watchlist.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Stock</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Saved Price</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Current Price</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Alert Target</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Condition</th>
                                    <th className="px-4 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {watchlist.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3 font-medium text-gray-900">{item.stock.symbol}</td>
                                        <td className="px-4 py-3 text-gray-500">{item.stock.lastPrice}</td>
                                        <td className="px-4 py-3 font-bold text-blue-600">
                                            {item.livePrice ? item.livePrice.toFixed(2) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 font-medium">
                                            {item.alert ? item.alert.targetPrice : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {item.alert ? (item.alert.condition === 'GT' ? '>=' : '<=') : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            {item.alert && (
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('Remove alert?')) return;
                                                        await fetch(`/api/alerts?id=${item.alert.id}`, { method: 'DELETE' }); // Note: Need to implement DELETE alert API if not exists, or re-use existing logic
                                                        fetchData();
                                                    }}
                                                    className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200"
                                                >
                                                    Clear Alert
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleUnfollow(item.id)}
                                                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200"
                                            >
                                                Unfollow
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
