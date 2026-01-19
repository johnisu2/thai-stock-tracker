import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { fetchStockPrice } from '@/lib/stockService';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Fetch followed stocks
        const user = await prisma.stockUser.findUnique({
            where: { email },
            include: { follows: { include: { stock: true } } }
        });

        let tableRows = "";

        if (user && user.follows.length > 0) {
            for (const f of user.follows) {
                const livePrice = await fetchStockPrice(f.stock.symbol);
                const displayPrice = (livePrice !== null ? livePrice : f.stock.lastPrice) || 0;
                const changeColor = displayPrice >= (f.stock.lastPrice || 0) ? '#16a34a' : '#dc2626'; // Green if >= stored, Red if < (Just a visual guess, ideally we need prev close)

                tableRows += `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px; font-weight: bold; color: #1f2937;">${f.stock.symbol}</td>
                        <td style="padding: 12px; text-align: right; font-weight: bold; color: ${changeColor};">${displayPrice.toFixed(2)} THB</td>
                    </tr>
                `;
            }
        } else {
            tableRows = `<tr><td colspan="2" style="padding: 12px; text-align: center; color: #6b7280;">No stocks followed yet.</td></tr>`;
        }

        const htmlContent = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;">
                <div style="background-color: #2563eb; padding: 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Thai Stock Tracker</h1>
                    <p style="color: #bfdbfe; margin: 5px 0 0;">Daily Summary</p>
                </div>
                <div style="padding: 20px;">
                    <p style="color: #374151; margin-bottom: 20px;">Here is the latest summary of your followed stocks as of <strong>${new Date().toLocaleString()}</strong>:</p>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <thead>
                            <tr style="background-color: #f9fafb; text-align: left;">
                                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Stock</th>
                                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563; text-align: right;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                    <div style="text-align: center;">
                        <a href="http://localhost:3000" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Dashboard</a>
                    </div>
                </div>
                <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
                    <p style="margin: 0;">Automated message from Thai Stock Tracker.</p>
                </div>
            </div>
        `;

        if (!process.env.SMTP_HOST) {
            console.log(htmlContent); // Log HTML for debugging if mock
            return NextResponse.json({ message: 'Mock Mode: HTML Summary logged' }, { status: 200 });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Thai Stock Tracker" <no-reply@tracker.com>',
            to: email,
            subject: 'Daily Stock Summary 📈',
            html: htmlContent, // Send HTML
        });

        return NextResponse.json({ message: 'Test email sent successfully' });
    } catch (error: any) {
        console.error('Test Email Failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
