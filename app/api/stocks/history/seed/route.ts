import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchStockHistory } from '@/lib/stockService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const stocks = await prisma.stockItem.findMany();
        let totalCreated = 0;

        for (const stock of stocks) {
            console.log(`Seeding history for ${stock.symbol}...`);
            const history = await fetchStockHistory(stock.symbol);

            for (const entry of history) {
                // Check if already exists for this date to avoid duplicates
                const exists = await prisma.stockHistory.findFirst({
                    where: {
                        stockId: stock.id,
                        date: {
                            gte: new Date(entry.date.setHours(0, 0, 0, 0)),
                            lt: new Date(entry.date.setHours(23, 59, 59, 999))
                        }
                    }
                });

                if (!exists) {
                    await prisma.stockHistory.create({
                        data: {
                            stockId: stock.id,
                            date: entry.date,
                            close: entry.close
                        }
                    });
                    totalCreated++;
                }
            }
        }

        return NextResponse.json({
            message: 'History seeding completed',
            stocksProcessed: stocks.length,
            recordsCreated: totalCreated
        });
    } catch (error: any) {
        console.error('[SEED ERROR]', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
