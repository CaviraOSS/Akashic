


export type intel_type = "entity" | "event" | "claim" | "source" | "evidence" | "relationship" | "location" | "asset" | "indicator" | "document" | "media" | "market_signal"





export type entity_type =
  | "person" | "org" | "company" | "gov_agency" | "military_unit" | "armed_group"
  | "political_party" | "country" | "province" | "city" | "port" | "airport"
  | "vessel" | "aircraft" | "satellite" | "malware" | "apt" | "cve" | "domain"
  | "ip" | "asn" | "url" | "wallet" | "asset" | "news_source" | "commodity"
  | "stock" | "route" | "crypto"

export type relationship_type =
  | "owns" | "controls" | "operates" | "funds" | "attacks" | "targets" | "sanctions"
  | "is_sanctioned_by" | "located_in" | "near" | "depends_on" | "supplies"
  | "trades_with" | "affiliated_with" | "attributed_to" | "reported_by"
  | "confirmed_by" | "contradicted_by" | "same_as" | "alias_of" | "parent_of"
  | "subsidiary_of" | "routes_through" | "uses_malware" | "exploits_cve"
  | "mentions" | "supports" | "disputes" | "amplifies" | "copies_from"
  | "hosted_on" | "registered_by" | "communicates_with" | "transits"
  | "impacts" | "correlates_with"

export type event_category =
  | "conflict" | "cyber" | "infrastructure" | "market" | "aviation" | "maritime"
  | "politics" | "weather" | "humanitarian" | "energy"

export type severity_level = "critical" | "high" | "elevated" | "low" | "info"

export type claim_type =
  | "casualty" | "territorial_control" | "attack" | "attribution" | "responsibility"
  | "cyber_intrusion" | "outage_cause" | "sanctions" | "market_moving"
  | "gov_statement" | "denial" | "correction" | "forecast" | "warning"
  | "evacuation" | "damage" | "protest_size" | "election" | "supply_chain"

export type claim_status = "unverified" | "weak" | "partial" | "confirmed" | "disputed" | "contradicted" | "false" | "stale" | "superseded"

export type source_type = "news" | "gov" | "ngo" | "int_org" | "company" | "academic" | "sensor" | "market" | "cyber" | "social" | "document" | "satellite" | "community"

export type investigation_status = "draft" | "active" | "monitoring" | "escalated" | "archived"

export type alert_severity = "info" | "watch" | "elevated" | "high" | "critical"

export type timeline_item_type = "event_occurred" | "source_reported" | "claim_made" | "claim_confirmed" | "claim_contradicted" | "claim_corrected" | "entity_updated" | "asset_moved" | "risk_changed" | "alert_fired" | "official_response" | "market_reaction" | "analyst_note"

export type map_layer_type = "live_events" | "conflict_zones" | "hotspots" | "military_bases" | "military_flights" | "vessels" | "ais_disruptions" | "gps_jamming" | "cyber_threats" | "internet_outages" | "undersea_cables" | "pipelines" | "ports" | "airports" | "nuclear" | "data_centers" | "power_plants" | "earthquakes" | "wildfires" | "storms" | "floods" | "refugee_flows" | "sanctions" | "trade_routes" | "satellites"





export interface source {
  id: string
  name: string
  domain?: string
  url?: string
  country?: string
  lang?: string
  type: source_type
  reliability: number
  originality: number
  speed: number
  bias_risk: "high" | "low" | "unknown" | "none"
  state_affiliated: boolean
  created_at: number
}

export interface evidence {
  id: string
  source_id: string
  url?: string
  archive_url?: string
  hash?: string
  text_extract?: string
  fetched_at: number
  parser_ver?: string
  confidence: number
}

export interface entity {
  id: string
  type: entity_type
  name: string
  aliases: string[]
  description?: string
  country_iso?: string
  confidence: number
  is_canonical: boolean
  merged_into?: string
  metadata: Record<string, any>
  created_at: number
}

export interface relationship {
  id: string
  src_id: string
  dst_id: string
  type: relationship_type
  confidence: number
  start_time?: number
  end_time?: number
  notes?: string
  created_at: number
}

export interface event {
  id: string
  title: string
  summary: string
  category: event_category
  severity: severity_level
  confidence: number
  start_time?: number
  end_time?: number
  location_id?: string
  status: "active" | "resolved" | "disputed"
  created_at: number
}

export interface claim {
  id: string
  event_id?: string
  text: string
  summary?: string
  type: claim_type
  status: claim_status
  confidence: number
  location_id?: string
  first_seen: number
  last_seen: number
}





export interface location {
  id: string
  name: string
  type: "country" | "city" | "aoi" | "exact" | "port" | "airport" | "facility"
  lat?: number
  lng?: number
  country_iso?: string
  geojson?: string
  confidence: number
}

export interface asset {
  id: string
  type: "cable" | "pipeline" | "port" | "powerplant" | "datacenter" | "bridge" | "base"
  name: string
  location_id?: string
  owner_id?: string
  operator_id?: string
  status: "operational" | "disrupted" | "destroyed" | "offline"
  vuln_score: number
  metadata: Record<string, any>
}

export interface indicator {
  id: string
  type: "ip" | "domain" | "url" | "hash" | "cve" | "wallet" | "asn"
  value: string
  confidence: number
  first_seen: number
  last_seen: number
  is_active: boolean
  metadata: Record<string, any>
}





export interface investigation {
  id: string
  title: string
  description?: string
  status: investigation_status
  analyst_id?: string
  created_at: number
  updated_at: number
}

export interface hypothesis {
  id: string
  invest_id: string
  text: string
  confidence: number
  status: "testing" | "accepted" | "rejected"
  created_at: number
}

export interface watchlist {
  id: string
  name: string
  description?: string
  created_at: number
}





export interface alert_rule {
  id: string
  name: string
  logic: string
  severity: alert_severity
  watchlist_id?: string
  is_active: boolean
}

export interface alert {
  id: string
  rule_id: string
  severity: alert_severity
  message: string
  is_read: boolean
  invest_id?: string
  triggered_at: number
}

export interface timeline_item {
  id: string
  type: timeline_item_type
  timestamp: number
  description: string
  event_id?: string
  claim_id?: string
  source_id?: string
}

export interface risk_score {
  id: string
  entity_id?: string
  event_id?: string
  asset_id?: string
  score: number
  severity: severity_level
  confidence: number
  velocity: number
  trend: "rising" | "falling" | "stable"
  explanation?: string
  generated_at: number
}





export interface vessel_tracking {
  id: string
  vessel_id: string
  imo?: string
  mmsi?: string
  lat: number
  lng: number
  speed?: number
  heading?: number
  destination?: string
  is_dark: boolean
  timestamp: number
}

export interface flight_tracking {
  id: string
  aircraft_id: string
  callsign?: string
  icao_hex?: string
  lat: number
  lng: number
  altitude?: number
  speed?: number
  heading?: number
  squawk?: string
  timestamp: number
}





export interface document {
  id: string
  title: string
  file_type: "pdf" | "docx" | "html" | "csv" | "txt"
  storage_url?: string
  hash: string
  published_at?: number
  source_id?: string
}

export interface media_artifact {
  id: string
  type: "image" | "video" | "audio"
  url: string
  hash: string
  exif_data: Record<string, any>
  captured_at?: number
  manip_score: number
}

export interface market_signal {
  id: string
  symbol: string
  type: "index" | "stock" | "commodity" | "crypto" | "fx"
  price: number
  change_pct: number
  volume?: number
  updated_at: number
  event_id?: string
}





export type world_monitor_layer_id =
  | "conflicts" | "wars" | "civil_unrest" | "violence" | "humanitarian"
  | "nuclear" | "bases" | "pipelines" | "cables"
  | "sanctions" | "wildfires" | "natural_events"
  | "radiation_watch" | "spaceports" | "chokepoints"
  | "climate_anomalies" | "internet_disruptions"
  | "cyber_threats" | "gps_jamming" | "iran_attacks"
  | "intel_hotspots" | "critical_minerals" | "economic_centers"
  | "orbital_surveillance" | "storage_facilities"
  | "ucdp_events" | "displacement" | "disease_outbreaks"
  | "data_centers" | "trade_routes" | "fuel_shortages" | "live_tankers"
  | "stock_exchanges" | "financial_centers" | "central_banks" | "commodity_hubs" | "gulf_investments"
  | "startup_hubs" | "cloud_regions" | "accelerators" | "tech_hqs" | "tech_events"
  | "positive_events" | "kindness" | "happiness" | "species_recovery" | "renewable_installations"
  | "mining_sites" | "processing_plants" | "commodity_ports" | "irradiators"
  | "resilience_score" | "day_night"

export type geo_intel_category =
  | "conflict" | "war" | "civil_unrest" | "violence" | "humanitarian"
  | "infrastructure" | "energy" | "market" | "crypto" | "cyber"
  | "weather" | "aviation" | "maritime" | "politics" | "health" | "technology" | "society"

export type geo_intel_severity = "critical" | "high" | "elevated" | "moderate" | "low" | "info"

export type geo_intel_trend = "rising" | "stable" | "falling"

export interface geo_intel_event {
  id: string
  title: string
  summary: string
  category: geo_intel_category
  layer_id?: world_monitor_layer_id
  severity: geo_intel_severity
  confidence: number
  location_name: string
  country_iso2?: string
  country_iso3?: string
  lat?: number
  lng?: number
  entities: string[]
  source_name: string
  source_url?: string
  published_at: string
  detected_at: string
  related_event_ids?: string[]
}

export interface geo_intel_brief {
  id: string
  scope: "global" | "country" | "region" | "asset"
  title: string
  summary: string
  why_it_matters: string
  risk_trend: geo_intel_trend
  confidence: number
  generated_at: string
  drivers: string[]
}

export interface geo_intel_risk_score {
  scope_id: string
  label: string
  score: number
  previous_score: number
  trend: geo_intel_trend
  level: geo_intel_severity
  drivers: string[]
  pressures: { label: string, value: number, color: string }[]
  buffers: { label: string, value: number, color: string }[]
  updated_at: string
}

export interface geo_intel_correlation {
  id: string
  title: string
  interpretation: string
  confidence: number
  severity: geo_intel_severity
  categories: geo_intel_category[]
  event_ids: string[]
  time_window: string
}

export interface legacy_market_signal {
  id: string
  symbol: string
  name: string
  type: "index" | "stock" | "commodity" | "fx"
  price: string
  change_pct: number
  relevance: string
  region?: string
  updated_at: string
}

export interface crypto_signal {
  id: string
  symbol: string
  name: string
  price: string
  change_pct: number
  volume_signal: "high" | "normal" | "low"
  relevance: string
  updated_at: string
}

export interface geo_intel_source_health {
  active_sources: number
  delayed_sources: number
  stale_sources: number
  last_refresh: string
  source_groups: {
    name: string
    status: "live" | "delayed" | "stale"
    count: number
  }[]
}

export interface continent_news_feed {
  continent: string
  events: geo_intel_event[]
}

export interface superpower_news_feed {
  entity: string
  events: geo_intel_event[]
}

export interface geo_intel_feed_response {
  scope: {
    type: "global" | "country" | "region"
    label: string
    country_iso2?: string
    country_iso3?: string
  }
  events: geo_intel_event[]
  brief: geo_intel_brief
  risk: geo_intel_risk_score
  correlations: geo_intel_correlation[]
  markets: legacy_market_signal[]
  crypto: crypto_signal[]
  crypto_prices?: crypto_signal[]
  continent_news?: continent_news_feed[]
  superpower_news?: superpower_news_feed[]
  energy_prices?: legacy_market_signal[]
  fear_greed?: { index: number, classification: string, previous_1: number, previous_1_classification: string, updated_at: string }
  macro_signals?: { label: string, value: string, trend: "up" | "down" | "flat", status: "positive" | "negative" | "neutral" }[]
  source_health: geo_intel_source_health
  counts: Partial<Record<world_monitor_layer_id, number>>
  generated_at: string
}
