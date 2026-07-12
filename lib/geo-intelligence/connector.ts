import { intel_type, entity, event, claim, source, evidence, relationship } from "./types"

export interface rate_limit_policy {
  requests: number
  window_seconds: number
}

export interface fetch_result {
  raw_payloads: any[]
  fetch_timestamp: number
  error?: string
}

export interface transform_result {
  entities: entity[]
  events: event[]
  claims: claim[]
  sources: source[]
  evidences: evidence[]
  relationships: relationship[]
}

export interface connector {
  source_name: string
  source_type: "api" | "rss" | "csv" | "scrape"
  license_note: string
  auth_required: boolean
  rate_limit: rate_limit_policy
  outputs: intel_type[]
  
  fetch(): Promise<fetch_result>
  transform(data: fetch_result): transform_result
}


export const hash_payload = async (payload: any): Promise<string> => {
  const str = typeof payload === "string" ? payload : JSON.stringify(payload)
  const buf = new TextEncoder().encode(str)
  const hash_buf = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hash_buf)).map(b => b.toString(16).padStart(2, "0")).join("")
}
