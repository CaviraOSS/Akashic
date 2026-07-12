export const live_deck_layer_ids = [
  "conflicts", "wars", "civil_unrest", "violence", "humanitarian", "iran_attacks",
  "pipelines", "cables", "chokepoints", "storage_facilities",
  "cyber_threats", "internet_disruptions", "gps_jamming",
  "nuclear", "bases", "radiation_watch", "spaceports", "orbital_surveillance",
  "wildfires", "natural_events", "climate_anomalies",
  "sanctions", "critical_minerals", "economic_centers",
  "intel_hotspots",
  "ucdp_events", "displacement", "disease_outbreaks",
  "data_centers", "trade_routes", "fuel_shortages", "live_tankers",
  "stock_exchanges", "financial_centers", "central_banks", "commodity_hubs", "gulf_investments",
  "startup_hubs", "cloud_regions", "accelerators", "tech_hqs", "tech_events",
  "positive_events", "kindness", "happiness", "species_recovery", "renewable_installations",
  "mining_sites", "processing_plants", "commodity_ports", "irradiators", "resilience_score", "day_night",
] as const

export type live_deck_layer_id = typeof live_deck_layer_ids[number]

export const live_deck_groups = [
  {
    id: "conflict_humanitarian",
    title: "conflict & humanitarian",
    tag: "threats",
    color: "red",
    layers: ["conflicts", "wars", "civil_unrest", "violence", "humanitarian", "iran_attacks", "ucdp_events", "displacement", "disease_outbreaks"],
  },
  {
    id: "infrastructure_flow",
    title: "infrastructure flow",
    tag: "networks",
    color: "cyan",
    layers: ["pipelines", "cables", "chokepoints", "storage_facilities", "fuel_shortages", "trade_routes", "live_tankers", "commodity_ports"],
  },
  {
    id: "cyber_connectivity",
    title: "cyber & connectivity",
    tag: "digital",
    color: "purple",
    layers: ["cyber_threats", "internet_disruptions", "gps_jamming"],
  },
  {
    id: "strategic_assets",
    title: "strategic assets",
    tag: "watch",
    color: "orange",
    layers: ["nuclear", "bases", "radiation_watch", "spaceports", "orbital_surveillance", "irradiators", "day_night"],
  },
  {
    id: "natural_climate",
    title: "natural & climate",
    tag: "environment",
    color: "green",
    layers: ["wildfires", "natural_events", "climate_anomalies"],
  },
  {
    id: "sanctions_economic",
    title: "economic pressure",
    tag: "economy",
    color: "yellow",
    layers: ["sanctions", "critical_minerals", "economic_centers", "stock_exchanges", "financial_centers", "central_banks", "commodity_hubs", "gulf_investments", "mining_sites", "processing_plants"],
  },
  {
    id: "technology_watch",
    title: "technology watch",
    tag: "tech",
    color: "cyan",
    layers: ["data_centers", "startup_hubs", "cloud_regions", "accelerators", "tech_hqs", "tech_events"],
  },
  {
    id: "resilience_progress",
    title: "resilience & progress",
    tag: "civil",
    color: "green",
    layers: ["positive_events", "kindness", "happiness", "species_recovery", "renewable_installations", "resilience_score"],
  },
  {
    id: "intelligence_hotspots",
    title: "intelligence hotspots",
    tag: "priority",
    color: "stone",
    layers: ["intel_hotspots"],
  },
] as const

type live_event = {
  id: string
  title: string
  summary?: string
  category?: string
  layer_id?: string
  severity?: string
  source_name: string
  source_url?: string
  published_at: string
  location_name?: string
  confidence?: number
  lat?: number
  lng?: number
  country_iso2?: string
  country_iso3?: string
}

type live_feed = {
  events?: live_event[]
  counts?: Partial<Record<string, number>>
  correlations?: unknown[]
  source_health?: unknown
}

const severity_rank: Record<string, number> = {
  critical: 6,
  high: 5,
  elevated: 4,
  moderate: 3,
  low: 2,
  info: 1,
}

const blocked_text = /\b(ai|llm|machine learning|prediction|predictive|forecast model)\b/i

export const is_live_deck_event = (event: live_event) => {
  const txt = `${event.title || ""} ${event.summary || ""} ${event.source_name || ""}`
  if (blocked_text.test(txt)) return false
  if (event.category === "aviation") return false
  if (event.category === "weather" && !["wildfires", "natural_events", "climate_anomalies"].includes(event.layer_id || "")) return false
  if (/\bnoaa\b/i.test(event.source_name || "")) return false
  return !event.layer_id || live_deck_layer_ids.includes(event.layer_id as live_deck_layer_id)
}

const sort_events = (a: live_event, b: live_event) => {
  const sev = (severity_rank[b.severity || ""] || 0) - (severity_rank[a.severity || ""] || 0)
  if (sev) return sev
  return Date.parse(b.published_at || "") - Date.parse(a.published_at || "")
}

export const build_live_deck = (data: live_feed) => {
  const events = (data.events || []).filter(is_live_deck_event).sort(sort_events).slice(0, 50)
  const groups = live_deck_groups.map(meta => {
    const group_events = events.filter(event => meta.layers.includes(event.layer_id as never))
    const counted = meta.layers.reduce((sum, layer) => sum + (data.counts?.[layer] || 0), 0)
    return {
      ...meta,
      count: Math.max(counted, group_events.length),
      critical: group_events.filter(event => event.severity === "critical").length,
      high: group_events.filter(event => event.severity === "high").length,
      events: group_events.slice(0, 6),
    }
  })
  return {
    events,
    groups,
    correlations: data.correlations || [],
    source_health: data.source_health,
  }
}

const rad = (value: number) => value * Math.PI / 180

const distance_km = (a: { lat: number, lon: number }, b: { lat: number, lon: number }) => {
  const dlat = rad(b.lat - a.lat)
  const dlon = rad(b.lon - a.lon)
  const x = Math.sin(dlat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dlon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

const age_weight = (published_at: string, now: number) => {
  const age = Math.max(0, now - Date.parse(published_at || ""))
  const days = age / 86400000
  if (!Number.isFinite(days) || days > 90) return 0.25
  if (days <= 1) return 1
  if (days <= 7) return 0.8
  if (days <= 30) return 0.55
  return 0.35
}

export const build_city_unrest = (
  events: live_event[],
  city: { name: string, iso: string, lat: number, lon: number },
  now = Date.now(),
) => {
  const ranked = events
    .filter(event => event.layer_id === "civil_unrest" && Number.isFinite(event.lat) && Number.isFinite(event.lng))
    .map(event => ({ event, distance_km: distance_km(city, { lat: event.lat!, lon: event.lng! }) }))
    .filter(item => item.distance_km <= 500)
    .sort((a, b) => a.distance_km - b.distance_km)
  const score = Math.min(100, Math.round(ranked.reduce((sum, item) => {
    const base = { critical: 60, high: 44, elevated: 30, moderate: 20, low: 10, info: 4 }[item.event.severity || ""] || 0
    const proximity = Math.max(0.2, 1 - item.distance_km / 625)
    const confidence = Math.max(0.35, Math.min(1, item.event.confidence ?? 0.7))
    return sum + base * proximity * confidence * age_weight(item.event.published_at, now)
  }, 0)))
  const label = score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "elevated" : score > 0 ? "low" : "minimal"
  return {
    score,
    label,
    events: ranked.slice(0, 5).map(item => ({ ...item.event, distance_km: Math.round(item.distance_km) })),
    sources: new Set(ranked.map(item => item.event.source_name).filter(Boolean)).size,
  }
}

export const build_country_intel = (
  data: live_feed,
  country: { name: string, iso2: string, iso3: string },
  news: live_event[] = [],
) => {
  const iso2 = country.iso2.toUpperCase()
  const iso3 = country.iso3.toUpperCase()
  const name = country.name.toLowerCase()
  const events = (data.events || [])
    .filter(is_live_deck_event)
    .filter(event => event.country_iso2?.toUpperCase() === iso2
      || event.country_iso3?.toUpperCase() === iso3
      || event.location_name?.toLowerCase() === name)
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))
  const domains = events.reduce<Record<string, number>>((out, event) => {
    const key = event.layer_id || event.category || "other"
    out[key] = (out[key] || 0) + 1
    return out
  }, {})
  const risk_score = Math.min(100, events.reduce((sum, event) => sum + ({
    critical: 25,
    high: 18,
    elevated: 12,
    moderate: 8,
    low: 4,
    info: 1,
  }[event.severity || ""] || 0), 0))
  return {
    events,
    latest_news: news.filter(is_live_deck_event).sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at)).slice(0, 12),
    domains,
    risk_score,
    critical: events.filter(event => event.severity === "critical").length,
    high: events.filter(event => event.severity === "high").length,
    sources: new Set(events.map(event => event.source_name).filter(Boolean)).size,
  }
}

export type country_domain = "energy" | "infrastructure" | "security"

const country_domain_layers: Record<country_domain, string[]> = {
  energy: ["pipelines", "storage_facilities", "nuclear", "radiation_watch", "critical_minerals"],
  infrastructure: ["pipelines", "cables", "chokepoints", "storage_facilities", "internet_disruptions", "gps_jamming"],
  security: ["conflicts", "wars", "civil_unrest", "violence", "humanitarian", "iran_attacks", "bases", "cyber_threats", "gps_jamming", "sanctions"],
}

const country_domain_categories: Record<country_domain, string[]> = {
  energy: ["energy"],
  infrastructure: ["infrastructure", "maritime"],
  security: ["conflict", "war", "civil_unrest", "violence", "humanitarian", "cyber", "politics"],
}

export const build_country_domain_summary = (events: live_event[], domain: country_domain) => {
  const layers = country_domain_layers[domain]
  const categories = country_domain_categories[domain]
  const matched = events.filter(event =>
    layers.includes(event.layer_id || "")
    || (!event.layer_id && categories.includes(event.category || "")),
  )
  return {
    events: matched.slice(0, 6),
    count: matched.length,
    critical: matched.filter(event => event.severity === "critical").length,
    high: matched.filter(event => event.severity === "high").length,
    sources: new Set(matched.map(event => event.source_name).filter(Boolean)).size,
  }
}

export const valid_youtube_id = (id: string | null | undefined) => /^[a-z0-9_-]{11}$/i.test(id || "")

const unescape_json_text = (value: string | null) => value
  ? value.replace(/\\u0026/g, "&").replace(/\\"/g, "\"").replace(/\\\\/g, "\\")
  : null

export const parse_youtube_live_html = (html: string) => {
  const idx = html.indexOf("\"videoDetails\"")
  const block = idx < 0 ? "" : html.slice(idx, idx + 7000)
  const id = block.match(/"videoId"\s*:\s*"([a-z0-9_-]{11})"/i)?.[1] || null
  const is_live = /"isLive"\s*:\s*true/.test(block)
  const title = unescape_json_text(block.match(/"title"\s*:\s*"([^"]+)"/)?.[1] || null)
  const channel_name = unescape_json_text(
    block.match(/"ownerChannelName"\s*:\s*"([^"]+)"/)?.[1]
    || block.match(/"author"\s*:\s*"([^"]+)"/)?.[1]
    || null,
  )
  const hls_url = unescape_json_text(html.match(/"hlsManifestUrl"\s*:\s*"([^"]+)"/)?.[1] || null)
  return {
    video_id: is_live && valid_youtube_id(id) ? id : null,
    hls_url: is_live && valid_youtube_id(id) ? hls_url : null,
    channel_name,
    title,
    is_live: is_live && valid_youtube_id(id),
  }
}
