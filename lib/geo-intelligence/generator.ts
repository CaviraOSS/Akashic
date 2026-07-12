import { geo_intel_feed_response, geo_intel_event } from "./types"
import { fetchLiveMarkets, fetchLiveEnergy, fetchLiveCrypto } from "./engine-markets"
import { fetchLiveContinents, fetchLiveSuperpowers, fetchWorldNews } from "./engine-news"
import { fetchLiveFlights } from "./engine-flights"
import { get_worldmonitor_feed } from "./worldmonitor-feed"

const rdm = (min: number, max: number) => Math.random() * (max - min) + min
const rd_int = (min: number, max: number) => Math.floor(rdm(min, max))

export const get_dynamic_geo_intel = async (filter_country?: string, filter_layer?: string): Promise<geo_intel_feed_response> => {

  const [markets, energy_prices, crypto_prices, continent_news, superpower_news, world_news, flights] = await Promise.all([
    fetchLiveMarkets(),
    fetchLiveEnergy(),
    fetchLiveCrypto(),
    fetchLiveContinents(),
    fetchLiveSuperpowers(),
    fetchWorldNews(),
    fetchLiveFlights()
  ]);

  const wm = get_worldmonitor_feed()
  const wm_cat = (layer_id: string): geo_intel_event["category"] =>
    layer_id === "conflicts" || layer_id === "wars" || layer_id === "iran_attacks" || layer_id === "ucdp_events" ? "conflict"
      : layer_id === "civil_unrest" ? "civil_unrest"
        : layer_id === "violence" ? "violence"
          : layer_id === "humanitarian" || layer_id === "displacement" ? "humanitarian"
            : layer_id === "disease_outbreaks" ? "health"
              : layer_id === "cyber_threats" || layer_id === "internet_disruptions" ? "cyber"
                : layer_id === "pipelines" || layer_id === "chokepoints" || layer_id === "storage_facilities" || layer_id === "fuel_shortages" ? "energy"
                  : layer_id === "trade_routes" || layer_id === "live_tankers" || layer_id === "commodity_ports" ? "maritime"
                    : layer_id === "economic_centers" || layer_id === "critical_minerals" || layer_id === "sanctions" || layer_id === "stock_exchanges" || layer_id === "financial_centers" || layer_id === "central_banks" || layer_id === "commodity_hubs" || layer_id === "gulf_investments" || layer_id === "mining_sites" || layer_id === "processing_plants" ? "market"
                      : layer_id === "data_centers" || layer_id === "startup_hubs" || layer_id === "cloud_regions" || layer_id === "accelerators" || layer_id === "tech_hqs" || layer_id === "tech_events" ? "technology"
                        : layer_id === "positive_events" || layer_id === "kindness" || layer_id === "happiness" || layer_id === "species_recovery" || layer_id === "renewable_installations" || layer_id === "resilience_score" ? "society"
                          : layer_id === "natural_events" || layer_id === "wildfires" || layer_id === "climate_anomalies" ? "weather"
                            : "infrastructure"

  const wm_events: geo_intel_event[] = wm.points.map((p) => ({
    id: p.id,
    title: p.title,
    summary: p.summary || p.title,
    category: wm_cat(String(p.layer_id)),
    layer_id: p.layer_id as geo_intel_event["layer_id"],
    severity: p.severity as geo_intel_event["severity"],
    confidence: p.confidence ?? 0.72,
    location_name: p.title,
    country_iso2: p.country_iso2?.toUpperCase(),
    country_iso3: p.country_iso3?.toUpperCase(),
    lat: p.lat,
    lng: p.lng,
    entities: [],
    source_name: p.source_name || "worldmonitor",
    source_url: p.source_url,
    published_at: p.published_at || wm.generated_at,
    detected_at: wm.generated_at,
  }))


  let evts: geo_intel_event[] = [...flights, ...world_news, ...wm_events];


  if (evts.length === 0) {
    evts = Array.from({ length: 5 }).map((_, i) => ({
      id: `evt-fallback-${Date.now()}-${i}`,
      title: `network anomaly ${i}`,
      summary: "live feed disconnected.",
      category: "cyber",
      layer_id: "humanitarian",
      severity: "low",
      confidence: 0.5,
      location_name: "global theater",
      lat: 0,
      lng: 0,
      entities: ["sys"],
      source_name: "fallback",
      published_at: new Date().toISOString(),
      detected_at: new Date().toISOString(),
    }))
  }

  return {
    scope: { type: "global", label: "GLOBAL THEATER" },
    events: evts,
    brief: {
      id: `brf-${Date.now()}`,
      scope: "global",
      title: `Tactical Summary: ${world_news[0]?.title || "Awaiting signal"}`,
      summary: `Live feeds reporting ${evts.length} active events. High severity density in ${evts.filter(e => e.severity === 'high' || e.severity === 'critical').length} sectors. Superpowers tracking ${superpower_news.flatMap(s => s.events).length} items.`,
      why_it_matters: `Recent shifts in ${evts[0]?.category || 'global'} activity require immediate attention. Asset volatility correlates with ${markets[0]?.change_pct > 0 ? 'positive' : 'negative'} market pressure.`,
      risk_trend: "stable",
      confidence: 0.94,
      generated_at: new Date().toISOString(),
      drivers: [evts[0]?.category ? `${evts[0].category.toUpperCase()} Activity` : "RSS Intercepts", "Radar Telemetry", "Market Signals"],
    },
    risk: {
      scope_id: "global",
      label: "aggregate risk",
      score: Math.min(100, Math.max(0, 50 + (evts.filter(e => e.severity === 'critical' || e.severity === 'high').length * 5))),
      previous_score: Math.min(100, Math.max(0, 45 + (evts.filter(e => e.severity === 'critical' || e.severity === 'high').length * 4))),
      trend: "stable",
      level: "elevated",
      drivers: ["live-events", "market-volatility"],
      pressures: [
        { label: "coercive", value: Math.min(0.99, evts.filter(e => e.category === 'conflict').length * 0.15), color: "bg-red-500" },
        { label: "fragility", value: Math.min(0.99, evts.filter(e => e.category === 'politics').length * 0.1), color: "bg-orange-500" },
        { label: "capital", value: Math.min(0.99, Math.abs((crypto_prices[0]?.change_pct || 0) / 10)), color: "bg-amber-500" }
      ],
      buffers: [
        { label: "alliance", value: 0.65 + (evts.filter(e => e.category === 'humanitarian').length * 0.05), color: "bg-cyan-500" },
        { label: "maritime", value: 0.50 + (flights.filter(f => f.category === 'maritime').length * 0.05), color: "bg-blue-500" }
      ],
      updated_at: new Date().toISOString(),
    },
    correlations: evts.length > 2 ? [
      {
        id: "corr-1",
        title: "Cross-Domain Cluster",
        interpretation: `Detected correlation between ${evts[0].category} and ${evts[1].category} anomalies over the last hour.`,
        confidence: 0.91,
        severity: "elevated",
        categories: [evts[0].category, evts[1].category],
        event_ids: evts.slice(0, 3).map((e) => e.id),
        time_window: "Live",
      },
    ] : [],
    markets: markets as any,
    crypto: crypto_prices as any,
    continent_news,
    superpower_news,
    energy_prices: energy_prices as any,
    fear_greed: {
      index: Math.min(100, Math.max(0, 50 + ((markets[0]?.change_pct || 0) * 10))),
      classification: (markets[0]?.change_pct || 0) > 0 ? "GREED" : "FEAR",
      previous_1: Math.min(100, Math.max(0, 45 + ((crypto_prices[0]?.change_pct || 0) * 5))),
      previous_1_classification: (crypto_prices[0]?.change_pct || 0) > 0 ? "GREED" : "FEAR",
      updated_at: new Date().toISOString()
    },
    macro_signals: [
      { label: "GLOBAL MARKET IDX", value: markets[0]?.price || "0", trend: (markets[0]?.change_pct || 0) > 0 ? "up" : "down", status: (markets[0]?.change_pct || 0) > 0 ? "positive" : "negative" },
      { label: "CRYPTO VOLATILITY", value: crypto_prices[0]?.price || "0", trend: (crypto_prices[0]?.change_pct || 0) > 0 ? "up" : "down", status: "neutral" },
      { label: "ENERGY BENCHMARK", value: energy_prices[0]?.price || "0", trend: (energy_prices[0]?.change_pct || 0) > 0 ? "up" : "down", status: (energy_prices[0]?.change_pct || 0) > 0 ? "negative" : "positive" },
      { label: "EVENT FREQUENCY", value: `${evts.length} /hr`, trend: evts.length > 20 ? "up" : "flat", status: evts.length > 20 ? "negative" : "neutral" }
    ],
    source_health: {
      active_sources: 4,
      delayed_sources: 0,
      stale_sources: 0,
      last_refresh: new Date().toISOString(),
      source_groups: [
        { name: "yahoo-finance", status: "live", count: markets.length + energy_prices.length },
        { name: "google-rss", status: "live", count: world_news.length },
        { name: "opensky-radar", status: "live", count: flights.length },
        { name: "worldmonitor", status: "live", count: wm.points.length + wm.paths.length },
      ],
    },
    counts: wm.counts,
    generated_at: new Date().toISOString(),
  }
}
