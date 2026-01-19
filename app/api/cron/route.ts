import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchStockPrice } from '@/lib/stockService';
import nodemailer from 'nodemailer';

async function sendEmail(to: string, subject: string, body: string) {
    if (!process.env.SMTP_HOST) {
        console.log(`[EMAIL MOCK] To: ${to}, Subject: ${subject}`);
        console.log(`Body: ${body}`);
        console.log('To send real emails, configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env');
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Thai Stock Tracker" <no-reply@tracker.com>',
            to,
            subject,
            text: body,
        });
        console.log(`[EMAIL SENT] To: ${to}`);
    } catch (error) {
        console.error('[EMAIL ERROR]', error);
    }
}

// Helper to check if market is open (Thai Time)
// Morning: 10:00 - 12:30
// Afternoon: 14:00 - 16:30
function isMarketOpen() {
    // Current time in Thailand (UTC+7)
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Weekend Check
    if (day === 0 || day === 6) return false;

    const time = hour * 100 + minute; // e.g., 1030 for 10:30

    // Trading Hours
    const isMorning = time >= 1000 && time <= 1230;
    const isAfternoon = time >= 1400 && time <= 1630;

    return isMorning || isAfternoon;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'hourly'; // Default to hourly

        console.log(`Starting ${type} Job...`);

        // ==========================================
        // HOURLY JOB: Check Alerts
        // ==========================================
        if (type === 'hourly') {
            if (!isMarketOpen()) {
                console.log('Market closed, skipping checks.');
                return NextResponse.json({ message: 'Market Closed' });
            }

            // 1. Get all active alerts
            const alerts = await prisma.stockAlert.findMany({
                where: { isActive: true },
                include: { stock: true, user: true }
            });

            if (alerts.length === 0) {
                return NextResponse.json({ message: 'No active alerts' });
            }

            // 2. Group by stock to minimize fetch calls
            const stockMap = new Set<string>(alerts.map((a: any) => a.stock.symbol));
            const priceCache: Record<string, number> = {};

            // 3. Update active stocks prices & Trigger Checks
            const triggeredAlerts = [];
            for (const symbol of Array.from(stockMap)) {
                const price = await fetchStockPrice(symbol);
                if (price !== null) {
                    priceCache[symbol] = price;

                    // Update Stock Price in DB
                    await prisma.stockItem.update({
                        where: { symbol },
                        data: { lastPrice: price, lastUpdate: new Date() }
                    });
                }
            }

            // 4. Check conditions
            for (const alert of alerts) {
                const currentPrice = priceCache[alert.stock.symbol];
                if (!currentPrice) continue;

                let triggered = false;
                if (alert.condition === 'GT' && currentPrice >= alert.targetPrice) {
                    triggered = true;
                } else if (alert.condition === 'LT' && currentPrice <= alert.targetPrice) {
                    triggered = true;
                }

                if (triggered) {
                    await sendEmail(
                        alert.user.email,
                        `Stock Alert: ${alert.stock.symbol} is ${currentPrice}`,
                        `Your alert for ${alert.stock.symbol} has been triggered.\nCurrent Price: ${currentPrice}\nTarget: ${alert.targetPrice} (${alert.condition === 'GT' ? '>=' : '<='})`
                    );
                    triggeredAlerts.push(alert.id);

                    // Disable single-shot alerts
                    await prisma.stockAlert.update({
                        where: { id: alert.id },
                        data: { isActive: false }
                    });
                }
            }
            return NextResponse.json({ message: 'Hourly job completed', triggered: triggeredAlerts.length });
        }

        // ==========================================
        // DAILY JOB: Record History (Evening)
        // ==========================================
        if (type === 'daily') {
            // Get all stocks we are tracking
            const stocks = await prisma.stockItem.findMany();
            let updatedCount = 0;

            for (const stock of stocks) {
                const currentPrice = await fetchStockPrice(stock.symbol);
                if (currentPrice !== null) {
                    // Save to history
                    await prisma.stockHistory.create({
                        data: {
                            stockId: stock.id,
                            date: new Date(),
                            close: currentPrice,
                            // open, high, low can be added here if scraper supports it
                        }
                    });
                    updatedCount++;
                }
            }
            return NextResponse.json({ message: 'Daily history recorded', updated: updatedCount });
        }

        return NextResponse.json({ error: 'Invalid job type' }, { status: 400 });

    } catch (error) {
        console.error('Cron Job Failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
