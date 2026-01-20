import axios from 'axios';
import * as cheerio from 'cheerio';

export async function fetchStockPrice(symbol: string): Promise<number | null> {
  try {
    // Note: Direct scraping of SET website (set.or.th) often requires handling dynamic content or specific headers.
    // For this implementation, we will use a structure that targets a standard financial page.
    // Replace the URL and selectors with a reliable source. 
    // Example using a generic structure for illustration.

    // In a real production scenario, consider using an official API like SET Smart or a third-party financial API.

    // Google Finance URL for Thai stocks (e.g., PTT -> PTT:BKK)
    const url = `https://www.google.com/finance/quote/${symbol.toUpperCase()}:BKK`;

    console.log(`Fetching price for ${symbol} from ${url}`);

    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);

    // Google Finance class for price (this class name "YMlKec fxKbKc" is common, but "div.YMlKec.fxKbKc" is safer)
    const priceText = $('.YMlKec.fxKbKc').first().text();

    // Remove comma and currency symbol if any
    const cleanPrice = priceText.replace(/[^0-9.]/g, '');
    const price = parseFloat(cleanPrice);

    if (isNaN(price)) {
      console.error(`Failed to parse price for ${symbol}. Text found: ${priceText}`);
      return null;
    }

    return price;

  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error);
    return null;
  }
}

export async function fetchStockHistory(symbol: string): Promise<{ date: Date; close: number }[]> {
  try {
    // Use Yahoo Finance Chart API (v8) which provides JSON data
    // range=1mo (1 month) is sufficient for our 7-day needs
    const yahooSymbol = `${symbol.toUpperCase()}.BK`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=1mo&interval=1d`;

    console.log(`Fetching historical data for ${symbol} from ${url}`);

    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0' // Basic UA usually suffices for this API
      }
    });

    const result = data.chart.result?.[0];
    if (!result) {
      console.error(`No data found for ${symbol}`);
      return [];
    }

    const timestamps = result.timestamp || [];
    const closes = result.indicators.quote[0].close || [];

    const history: { date: Date; close: number }[] = [];

    timestamps.forEach((ts: number, i: number) => {
      const close = closes[i];
      if (close !== null && close !== undefined) {
        history.push({
          date: new Date(ts * 1000),
          close: close
        });
      }
    });

    // API returns oldest first, so we keep it that way or reverse if needed by caller?
    // Our logic usually expects array, let's keep it sorted by date ASC (Oldest -> Newest)
    // The previous implementation did .reverse() implying it wanted Oldest First (but scraping often gives Newest first).
    // The Chart API gives Oldest First. So we just return as is.

    return history;

  } catch (error) {
    console.error(`Error fetching history for ${symbol}:`, error);
    return [];
  }
}
