import Parser from "rss-parser"
import { connector, fetch_result, transform_result, hash_payload } from "../connector"
import { event, source, evidence, claim, entity } from "../types"

const parser = new Parser()
const url = "https://news.google.com/rss"

export const news_connector: connector = {
  source_name: "Google News",
  source_type: "rss",
  license_note: "Public RSS feed",
  auth_required: false,
  rate_limit: { requests: 60, window_seconds: 60 },
  outputs: ["event", "source", "evidence"],
  
  async fetch(): Promise<fetch_result> {
    try {
      const feed = await parser.parseURL(url)
      return { raw_payloads: feed.items, fetch_timestamp: Date.now() }
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
      id: "src_google_news",
      name: "Google News",
      url: "https://news.google.com",
      type: "news",
      reliability: 80,
      originality: 30,
      speed: 90,
      bias_risk: "low",
      state_affiliated: false,
      created_at: Date.now()
    }
    res.sources.push(src)
    
    for (const item of data.raw_payloads) {
      const evd_id = `evd_${crypto.randomUUID()}`
      const evd: evidence = {
        id: evd_id,
        source_id: src.id,
        url: item.link || src.url,
        hash: item.guid || item.link || evd_id,
        fetched_at: data.fetch_timestamp,
        confidence: 80
      }
      res.evidences.push(evd)
      
      const evt: event = {
        id: `evt_${crypto.randomUUID()}`,
        title: item.title || "Untitled",
        summary: item.contentSnippet || item.content || "",
        category: "politics",
        severity: "info",
        confidence: 80,
        start_time: item.isoDate ? new Date(item.isoDate).getTime() : data.fetch_timestamp,
        status: "active",
        created_at: Date.now()
      }
      res.events.push(evt)
    }
    
    return res
  }
}
