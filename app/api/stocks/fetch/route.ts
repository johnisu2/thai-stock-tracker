import { NextRequest, NextResponse } from 'next/server';
import { fetchStockPrice } from '@/lib/stockService';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const price = await fetchStockPrice(symbol);

    if (price === null) {
        return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 });
    }

    return NextResponse.json({ symbol: symbol.toUpperCase(), price, timestamp: new Date() });
}
