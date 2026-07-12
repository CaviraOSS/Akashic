import yahooFinance from "yahoo-finance2"
import { connector, fetch_result, transform_result } from "../connector"
import { event, source, evidence, market_signal, entity } from "../types"

const SYMBOLS = ["^GSPC", "GC=F", "CL=F", "^VIX"]

export const market_connector: connector = {
  source_name: "Yahoo Finance",
  source_type: "api",
  license_note: "Public finance data",
  auth_required: false,
  rate_limit: { requests: 200, window_seconds: 3600 },
  outputs: ["event", "source", "evidence"],
  
  async fetch(): Promise<fetch_result> {
    try {
      const payloads = await Promise.all(SYMBOLS.map(sym => yahooFinance.quote(sym)))
      return { raw_payloads: payloads, fetch_timestamp: Date.now() }
    } catch (e: any) {
      return { raw_payloads: [], fetch_timestamp: Date.now(), error: e.message }
    }
  },
  
  transform(data: fetch_result): transform_result {
    const res: transform_result = {
      entities: [], events: [], claims: [], sources: [], evidences: [], relationships: []
    }
    if (!data.raw_payloads.length) return res
    
    const src: source = {
      id: "src_yahoo_finance",
      name: "Yahoo Finance",
      url: "https://finance.yahoo.com",
      type: "market",
      reliability: 95,
      originality: 50,
      speed: 99,
      bias_risk: "none",
      state_affiliated: false,
      created_at: Date.now()
    }
    res.sources.push(src)
    
    for (const q of data.raw_payloads) {
      const evd_id = `evd_${crypto.randomUUID()}`
      const evd: evidence = {
        id: evd_id,
        source_id: src.id,
        url: `https://finance.yahoo.com/quote/${q.symbol}`,
        hash: `${q.symbol}_${q.regularMarketTime}`,
        fetched_at: data.fetch_timestamp,
        confidence: 95
      }
      res.evidences.push(evd)
      
      const change = q.regularMarketChangePercent || 0
      
      if (Math.abs(change) > 2) {
        const evt: event = {
          id: `evt_${crypto.randomUUID()}`,
          title: `Market shock: ${q.symbol} moved ${change.toFixed(2)}%`,
          summary: `${q.shortName || q.symbol} experienced a significant price movement. Current price: ${q.regularMarketPrice}`,
          category: "market",
          severity: Math.abs(change) > 5 ? "high" : "elevated",
          confidence: 95,
          start_time: data.fetch_timestamp,
          status: "active",
          created_at: Date.now()
        }
        res.events.push(evt)
      }
    }
    
    return res
  }
}
