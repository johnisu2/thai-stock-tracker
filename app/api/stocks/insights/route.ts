import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Fetch all stocks and their history for the last 10 days (to ensure we have at least 7 days of data)
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

        const stocks = await prisma.stockItem.findMany({
            include: {
                history: {
                    where: {
                        date: { gte: tenDaysAgo }
                    },
                    orderBy: { date: 'asc' }
                }
            }
        });

        const insights = stocks.map(stock => {
            const history = stock.history;
            if (history.length < 2) return null;

            const latestPrice = history[history.length - 1].close ?? 0;
            const oldestPriceInPeriod = history[0].close ?? 0;

            if (oldestPriceInPeriod === 0) return null;

            // 7D Change
            const change7d = ((latestPrice - oldestPriceInPeriod) / oldestPriceInPeriod) * 100;

            // Bullish Streak (Consecutive days of closing higher than previous day)
            let streak = 0;
            for (let i = history.length - 1; i > 0; i--) {
                const current = history[i].close ?? 0;
                const prev = history[i - 1].close ?? 0;
                if (current > prev && prev !== 0) {
                    streak++;
                } else {
                    break;
                }
            }

            // Average 7D Price
            const validPrices = history.map(h => h.close).filter((c): c is number => c !== null);
            if (validPrices.length === 0) return null;
            const avgPrice = validPrices.reduce((sum, c) => sum + c, 0) / validPrices.length;

            return {
                symbol: stock.symbol,
                currentPrice: latestPrice,
                change7d,
                streak,
                avgPrice,
                isAboveAvg: latestPrice > avgPrice,
                lastUpdate: stock.lastUpdate
            };
        }).filter((i): i is any => i !== null);

        // If no real data yet, return some mock data so the user can see the UI
        if (insights.length === 0) {
            return NextResponse.json({
                topGainers: [
                    { symbol: 'PTT', currentPrice: 34.50, change7d: 5.2, streak: 2, isAboveAvg: true },
                    { symbol: 'CPALL', currentPrice: 65.25, change7d: 4.8, streak: 3, isAboveAvg: true },
                    { symbol: 'AOT', currentPrice: 62.00, change7d: 3.5, streak: 1, isAboveAvg: false },
                ],
                momentumStocks: [
                    { symbol: 'CPALL', currentPrice: 65.25, change7d: 4.8, streak: 3, isAboveAvg: true },
                    { symbol: 'PTT', currentPrice: 34.50, change7d: 5.2, streak: 2, isAboveAvg: true },
                ],
                timestamp: new Date(),
                isMock: true
            });
        }

        // Top Gainers (7 days)
        const topGainers = [...insights]
            .sort((a: any, b: any) => b.change7d - a.change7d)
            .slice(0, 5);

        // Momentum stocks (Streak >= 2 and above average)
        const momentumStocks = insights
            .filter((s: any) => s.streak >= 2 && s.isAboveAvg)
            .sort((a: any, b: any) => b.streak - a.streak || b.change7d - a.change7d)
            .slice(0, 5);

        return NextResponse.json({
            topGainers,
            momentumStocks,
            timestamp: new Date()
        });
    } catch (error: any) {
        console.error('[INSIGHTS ERROR]', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
