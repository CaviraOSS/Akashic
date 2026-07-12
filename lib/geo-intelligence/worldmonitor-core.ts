export const wm_skip_layer_ids = ["weather_alerts"] as const

export const wm_layer_ids = [
  "conflicts",
  "wars",
  "civil_unrest",
  "violence",
  "humanitarian",
  "nuclear",
  "bases",
  "pipelines",
  "cables",
  "sanctions",
  "wildfires",
  "natural_events",
  "radiation_watch",
  "spaceports",
  "chokepoints",
  "climate_anomalies",
  "internet_disruptions",
  "cyber_threats",
  "gps_jamming",
  "iran_attacks",
  "intel_hotspots",
  "critical_minerals",
  "economic_centers",
  "orbital_surveillance",
  "storage_facilities",
  "ucdp_events",
  "displacement",
  "disease_outbreaks",
  "data_centers",
  "trade_routes",
  "fuel_shortages",
  "live_tankers",
  "stock_exchanges",
  "financial_centers",
  "central_banks",
  "commodity_hubs",
  "gulf_investments",
  "startup_hubs",
  "cloud_regions",
  "accelerators",
  "tech_hqs",
  "tech_events",
  "positive_events",
  "kindness",
  "happiness",
  "species_recovery",
  "renewable_installations",
  "mining_sites",
  "processing_plants",
  "commodity_ports",
  "irradiators",
  "resilience_score",
  "day_night",
] as const

export type wm_layer_id = typeof wm_layer_ids[number]
export type wm_severity = "critical" | "high" | "elevated" | "moderate" | "low" | "info"

export type wm_point = {
  id: string
  layer_id: wm_layer_id | string
  title: string
  summary?: string
  lat: number
  lng?: number
  lon?: number
  country_iso2?: string
  country_iso3?: string
  severity?: wm_severity | string
  confidence?: number
  source_name?: string
  source_url?: string
  published_at?: string
  metadata?: Record<string, any>
}

export type wm_path = {
  id: string
  layer_id: wm_layer_id | string
  title: string
  points: [number, number][]
  severity?: wm_severity | string
  source_name?: string
  metadata?: Record<string, any>
}

export type wm_country_score = {
  iso2: string
  score: number
  max_severity: wm_severity
  layers: Partial<Record<wm_layer_id, number>>
}

export type wm_feed = {
  generated_at: string
  points: wm_point[]
  paths: wm_path[]
  counts: Partial<Record<wm_layer_id, number>>
  country_scores: Record<string, wm_country_score>
  source_health: {
    active_sources: number
    skipped_layers: readonly string[]
    notes: string[]
  }
}

const sev_w: Record<wm_severity, number> = {
  critical: 34,
  high: 24,
  elevated: 16,
  moderate: 10,
  low: 5,
  info: 3,
}

const sev_rank: Record<wm_severity, number> = {
  info: 0,
  low: 1,
  moderate: 2,
  elevated: 3,
  high: 4,
  critical: 5,
}

const norm_sev = (v: any): wm_severity => {
  const s = String(v || "info").toLowerCase()
  return s === "critical" || s === "high" || s === "elevated" || s === "moderate" || s === "low" || s === "info" ? s : "info"
}

const layer_ok = (v: any): v is wm_layer_id => (wm_layer_ids as readonly string[]).includes(String(v)) && !(wm_skip_layer_ids as readonly string[]).includes(String(v))
const fin = (v: any) => Number.isFinite(Number(v))
const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n))

export const build_wm_feed = (inp: { generated_at?: string, points?: wm_point[], paths?: wm_path[] }): wm_feed => {
  const generated_at = inp.generated_at || new Date().toISOString()
  const counts: Partial<Record<wm_layer_id, number>> = {}
  const country_scores: Record<string, wm_country_score> = {}

  const points = (inp.points || []).flatMap((p): wm_point[] => {
    const layer_id = p.layer_id
    const lng = p.lng ?? p.lon
    if (!layer_ok(layer_id) || !fin(p.lat) || !fin(lng)) return []
    const out = { ...p, layer_id, lat: Number(p.lat), lng: Number(lng), severity: norm_sev(p.severity), confidence: p.confidence ?? 0.72 }
    counts[layer_id] = (counts[layer_id] || 0) + 1
    const iso2 = String(p.country_iso2 || "").toLowerCase()
    if (iso2) {
      const prev = country_scores[iso2] || { iso2, score: 0, max_severity: "info" as wm_severity, layers: {} }
      const sev = out.severity as wm_severity
      prev.score = clamp(prev.score + sev_w[sev])
      prev.layers[layer_id] = (prev.layers[layer_id] || 0) + 1
      if (sev_rank[sev] > sev_rank[prev.max_severity]) prev.max_severity = sev
      country_scores[iso2] = prev
    }
    return [out]
  })

  const paths = (inp.paths || []).flatMap((p): wm_path[] => {
    const layer_id = p.layer_id
    const pts = Array.isArray(p.points) ? p.points.filter(x => Array.isArray(x) && fin(x[0]) && fin(x[1])).map(x => [Number(x[0]), Number(x[1])] as [number, number]) : []
    if (!layer_ok(layer_id) || pts.length < 2) return []
    counts[layer_id] = (counts[layer_id] || 0) + 1
    return [{ ...p, layer_id, points: pts, severity: norm_sev(p.severity) }]
  })

  return {
    generated_at,
    points,
    paths,
    counts,
    country_scores,
    source_health: {
      active_sources: new Set([...points.map(p => p.source_name || "worldmonitor"), ...paths.map(p => p.source_name || "worldmonitor")]).size,
      skipped_layers: wm_skip_layer_ids,
      notes: ["aviation stays on the existing radar layer", "noaa weather stays on the existing noaa layer"],
    },
  }
}

