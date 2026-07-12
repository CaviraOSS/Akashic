import YahooFinance from 'yahoo-finance2';
import { market_signal } from './types';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export const fetchLiveMarkets = async (): Promise<any[]> => {
  const INDICES = [
    { symbol: '^GSPC', name: 'S&P 500', relevance: 'critical' },
    { symbol: '^IXIC', name: 'NASDAQ', relevance: 'critical' },
    { symbol: '^DJI', name: 'DOW', relevance: 'high' },
    { symbol: '^FTSE', name: 'FTSE 100', relevance: 'high' },
    { symbol: '^GDAXI', name: 'DAX', relevance: 'high' },
    { symbol: '^N225', name: 'NIKKEI', relevance: 'critical' },
    { symbol: '000001.SS', name: 'SSE COMP', relevance: 'critical' },
    { symbol: '^HSI', name: 'HANG SENG', relevance: 'high' },
  ];

  try {
    const quotes = await yf.quote(INDICES.map(i => i.symbol));
    return INDICES.map(idx => {
      const q = quotes.find(q => q.symbol === idx.symbol);
      return {
        id: `idx-${idx.symbol}`,
        symbol: idx.symbol.replace('^', ''),
        name: idx.name,
        type: "index",
        price: q?.regularMarketPrice?.toFixed(2) || "0.00",
        change_pct: Number(q?.regularMarketChangePercent?.toFixed(2)) || 0,
        relevance: idx.relevance,
        updated_at: new Date().toISOString()
      };
    });
  } catch (err) {
    console.error("market fetch failed", err);
    return [];
  }
}

export const fetchLiveEnergy = async (): Promise<any[]> => {
  const ENERGY = [
    { symbol: 'CL=F', name: 'WTI CRUDE', relevance: 'critical' },
    { symbol: 'BZ=F', name: 'BRENT', relevance: 'critical' },
    { symbol: 'NG=F', name: 'NAT GAS', relevance: 'high' },
    { symbol: 'GC=F', name: 'GOLD', relevance: 'high' },
    { symbol: 'SI=F', name: 'SILVER', relevance: 'moderate' },
    { symbol: 'HG=F', name: 'COPPER', relevance: 'high' },
  ];

  try {
    const quotes = await yf.quote(ENERGY.map(i => i.symbol));
    return ENERGY.map(idx => {
      const q = quotes.find(q => q.symbol === idx.symbol);
      return {
        id: `nrg-${idx.symbol}`,
        symbol: idx.symbol.split('=')[0],
        name: idx.name,
        type: "commodity",
        price: Number(q?.regularMarketPrice?.toFixed(2)) || 0,
        change_pct: Number(q?.regularMarketChangePercent?.toFixed(2)) || 0,
        updated_at: Date.now()
      };
    });
  } catch (err) {
    console.error("energy fetch failed", err);
    return [];
  }
}

export const fetchLiveCrypto = async () => {
  const CRYPTO = [
    { symbol: 'BTC-USD', name: 'BITCOIN' },
    { symbol: 'ETH-USD', name: 'ETHEREUM' },
    { symbol: 'BNB-USD', name: 'BNB' },
    { symbol: 'SOL-USD', name: 'SOLANA' },
    { symbol: 'XRP-USD', name: 'XRP' },
  ];

  try {
    const quotes = await yf.quote(CRYPTO.map(i => i.symbol));
    return CRYPTO.map(idx => {
      const q = quotes.find(q => q.symbol === idx.symbol);
      return {
        id: `cry-${idx.symbol}`,
        symbol: idx.symbol.split('-')[0],
        name: idx.name,
        price: q?.regularMarketPrice?.toFixed(2) || "0.00",
        change_pct: Number(q?.regularMarketChangePercent?.toFixed(2)) || 0,
        volume_signal: "normal",
        relevance: "high",
        updated_at: new Date().toISOString()
      };
    });
  } catch (err) {
    console.error("crypto fetch failed", err);
    return [];
  }
}
