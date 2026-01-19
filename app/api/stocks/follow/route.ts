import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchStockPrice } from '@/lib/stockService';

// GET: List followed stocks for a user
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    try {
        const user = await prisma.stockUser.findUnique({
            where: { email },
            include: {
                follows: {
                    include: { stock: true },
                    orderBy: { createdAt: 'desc' },
                },
                alerts: {
                    where: { isActive: true },
                    include: { stock: true }
                }
            }
        });

        if (!user) return NextResponse.json([]);

        // Map alerts to stocks for easier frontend consumption
        // We want a list of follows, where each follow has a 'livePrice' and an optional 'alert'

        const followsWithDetails = await Promise.all(user.follows.map(async (f: any) => {
            const livePrice = await fetchStockPrice(f.stock.symbol);

            // Find active alert for this stock
            const activeAlert = user.alerts.find((a: any) => a.stockId === f.stockId);

            return {
                ...f,
                livePrice: livePrice !== null ? livePrice : 0,
                alert: activeAlert || null
            };
        }));

        return NextResponse.json(followsWithDetails);
    } catch (error: any) {
        console.error('[FOLLOW GET ERROR]', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

// POST: Follow a stock
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { symbol, userEmail, price } = body;

        if (!symbol || !userEmail) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Find/Create User
        let user = await prisma.stockUser.findUnique({ where: { email: userEmail } });
        if (!user) {
            user = await prisma.stockUser.create({ data: { email: userEmail } });
        }

        // Find/Create Stock
        let stock = await prisma.stockItem.findUnique({ where: { symbol: symbol.toUpperCase() } });

        // Determine price to save: provided price > existing price (if 0) > 0
        let priceToSave = price || 0;

        if (!stock) {
            stock = await prisma.stockItem.create({
                data: {
                    symbol: symbol.toUpperCase(),
                    lastPrice: priceToSave
                }
            });
        } else if (priceToSave > 0) {
            // Update price if we have a new one
            stock = await prisma.stockItem.update({
                where: { id: stock.id },
                data: { lastPrice: priceToSave, lastUpdate: new Date() }
            });
        }

        // Create Follow
        const follow = await prisma.stockFollow.create({
            data: {
                userId: user.id,
                stockId: stock.id
            }
        });

        return NextResponse.json(follow, { status: 201 });
    } catch (error: any) {
        console.error('[FOLLOW ERROR]', error);
        if (error.code === 'P2002') { // Unique constraint violation
            return NextResponse.json({ message: 'Already following' }, { status: 200 });
        }
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE: Unfollow
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await prisma.stockFollow.delete({
            where: { id: Number(id) }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
