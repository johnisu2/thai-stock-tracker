import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
                alerts: {
                    include: { stock: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!user) {
            return NextResponse.json([]);
        }

        return NextResponse.json(user.alerts);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { symbol, targetPrice, condition, userEmail } = body;

        // Basic validation
        if (!symbol || !targetPrice || !condition || !userEmail) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Find or Create User
        let user = await prisma.stockUser.findUnique({ where: { email: userEmail } });
        if (!user) {
            user = await prisma.stockUser.create({ data: { email: userEmail } });
        }

        // Find or Create Stock
        let stock = await prisma.stockItem.findUnique({ where: { symbol: symbol.toUpperCase() } });
        if (!stock) {
            // Fetch current price if creating new stock entry (optional but good)
            // For now just create with null price or updated later
            stock = await prisma.stockItem.create({
                data: {
                    symbol: symbol.toUpperCase(),
                    lastPrice: 0 // Will be updated by scheduler
                }
            });
        }

        // Create Alert
        const alert = await prisma.stockAlert.create({
            data: {
                userId: user.id,
                stockId: stock.id,
                targetPrice,
                condition
            }
        });

        // Auto-follow: Ensure the user is following this stock
        const existingFollow = await prisma.stockFollow.findUnique({
            where: {
                userId_stockId: {
                    userId: user.id,
                    stockId: stock.id
                }
            }
        });

        if (!existingFollow) {
            await prisma.stockFollow.create({
                data: {
                    userId: user.id,
                    stockId: stock.id
                }
            });
        }

        return NextResponse.json(alert, { status: 201 });
    } catch (error) {
        console.error('Error creating alert:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE: Remove an active alert
export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    try {
        await prisma.stockAlert.delete({
            where: { id: parseInt(id) }
        });
        return NextResponse.json({ message: 'Alert deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
    }
}
