import { useEffect, useState } from "react"
import { geo_intel_feed_response, geo_intel_event } from "@/lib/geo-intelligence/types"
import { build_live_deck } from "@/lib/geo-intelligence/live-deck-core"
import { MarketDeepDive } from "@/components/popups/MarketDeepDive"
import { IntelNewsReader } from "@/components/popups/IntelNewsReader"
import { FlightMap } from "@/components/popups/FlightMap"
import { LiveStreamDeck } from "@/components/popups/LiveStreamDeck"

const formatTimeAgo = (dateStr: string) => {
  const stamp = new Date(dateStr).getTime()
  if (!Number.isFinite(stamp)) return "pending"
  const diff = Date.now() - stamp
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const Block = ({ title, children, extra, extraHead, onClick }: any) => (
  <div onClick={onClick} className={`flex flex-col bg-[#0f0f0f] border border-[#222] rounded-md overflow-hidden ${onClick ? 'cursor-pointer hover:border-stone-500 transition-colors' : ''} ${extra || ''}`}>
    <div className="flex items-center justify-between px-3 py-2 border-b border-[#222] bg-[#141414]">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold tracking-widest text-[#d4d4d4] uppercase">{title}</span>
        <span className="text-[10px] text-stone-500 rounded-full border border-stone-700 px-1.5 leading-none">?</span>
      </div>
      {extraHead}
    </div>
    <div className="p-3 flex-1 flex flex-col">
      {children}
    </div>
  </div>
)

export const GlobalStockMarketsPanel = ({ data }: { data: geo_intel_feed_response }) => {
  const [activeSymbol, setActive] = useState<string | null>(null)
  return (
    <>
      <Block title="global stock markets" extra="col-span-1 lg:col-span-2 row-span-2" extraHead={<span className="text-[9px] bg-green-500/20 text-green-500 px-1.5 rounded">LIVE TICKER</span>}>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {data.markets?.map(m => (
            <div key={m.id} onClick={() => setActive(m.symbol)} className="cursor-pointer bg-[#111] border border-[#222] p-2 flex flex-col hover:border-stone-500 transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-stone-400 uppercase tracking-widest">{m.symbol}</span>
                <span className="text-[8px] bg-[#222] text-stone-300 px-1 rounded">{m.name}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[13px] font-bold text-white">{m.price}</span>
                <span className={`text-[10px] font-bold ${m.change_pct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {m.change_pct > 0 ? '+' : ''}{m.change_pct}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </Block>
      {activeSymbol && <MarketDeepDive symbol={activeSymbol} onClose={() => setActive(null)} />}
    </>
  )
}

export const EnergyResourcesPanel = ({ data }: { data: geo_intel_feed_response }) => {
  const [activeSymbol, setActive] = useState<string | null>(null)
  return (
    <>
      <Block title="energy & resources price" extra="row-span-2" extraHead={<span className="text-[9px] bg-yellow-500/20 text-yellow-500 px-1.5 rounded">COMMODITIES</span>}>
        <div className="grid grid-cols-2 gap-2">
          {data.energy_prices?.map(m => (
            <div key={m.id} onClick={() => setActive(m.symbol)} className="cursor-pointer bg-[#111] border border-[#222] p-2 flex flex-col hover:border-yellow-500/50 transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-yellow-500/80 uppercase tracking-widest">{m.symbol}</span>
                <span className="text-[8px] bg-[#222] text-stone-300 px-1 rounded truncate max-w-[60px]">{m.name}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[13px] font-bold text-white">{m.price}</span>
                <span className={`text-[10px] font-bold ${m.change_pct < 0 ? 'text-red-500' : m.change_pct > 0 ? 'text-green-500' : 'text-stone-500'}`}>
                  {m.change_pct > 0 ? '+' : ''}{m.change_pct}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </Block>
      {activeSymbol && <MarketDeepDive symbol={activeSymbol} onClose={() => setActive(null)} />}
    </>
  )
}

export const ContinentNewsGrid = ({ data }: { data: geo_intel_feed_response }) => {
  const [activeNews, setActiveNews] = useState<{ title: string, events: geo_intel_event[] } | null>(null)
  return (
    <>
      <Block title="7 continent major latest news" extra="col-span-1 md:col-span-2 row-span-3" extraHead={<span className="text-[9px] border border-[#0ea5e9] text-[#0ea5e9] px-1.5 rounded">GLOBAL GRID</span>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-full">
          {data.continent_news?.map(c => (
            <div key={c.continent} onClick={() => setActiveNews({ title: c.continent, events: c.events })} className="cursor-pointer flex flex-col gap-1 p-2 bg-[#111] border border-[#222] rounded hover:border-[#0ea5e9]/50 transition-colors">
              <span className="text-[10px] text-[#0ea5e9] uppercase font-bold tracking-widest border-b border-[#222] pb-1 mb-1 flex items-center gap-1">
                {c.continent}
              </span>
              {c.events.slice(0, 2).map(e => (
                <div key={e.id} className="flex flex-col mb-1 last:mb-0">
                  <span className="text-[8px] text-stone-500 uppercase">{e.source_name} • {formatTimeAgo(e.published_at)}</span>
                  <span className="text-[10px] text-stone-200 leading-tight line-clamp-2">{e.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Block>
      {activeNews && <IntelNewsReader title={activeNews.title} events={activeNews.events} onClose={() => setActiveNews(null)} />}
    </>
  )
}

export const SuperpowerTrackerPanel = ({ data }: { data: geo_intel_feed_response }) => {
  const [activeNews, setActiveNews] = useState<{ title: string, events: geo_intel_event[] } | null>(null)
  return (
    <>
      <Block title="superpower latest news" extra="row-span-3" extraHead={<span className="text-[9px] bg-red-500/20 text-red-500 px-1.5 rounded">GEO-POL</span>}>
        <div className="flex flex-col gap-2 h-full">
          {data.superpower_news?.map(s => (
            <div key={s.entity} onClick={() => setActiveNews({ title: s.entity, events: s.events })} className="cursor-pointer flex flex-col p-2 bg-[#111] border-l-2 border-l-[#ff6b00] rounded hover:bg-[#1a110a] transition-colors">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-white uppercase tracking-widest">{s.entity}</span>
                <span className="text-[8px] text-[#ff6b00] uppercase font-bold bg-[#ff6b00]/10 px-1 rounded">Priority</span>
              </div>
              {s.events.slice(0, 1).map(e => (
                <div key={e.id} className="flex flex-col">
                  <span className="text-[10px] text-stone-300 leading-tight">{e.title}</span>
                  <span className="text-[8px] text-stone-500 mt-0.5">{formatTimeAgo(e.published_at)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Block>
      {activeNews && <IntelNewsReader title={activeNews.title} events={activeNews.events} onClose={() => setActiveNews(null)} />}
    </>
  )
}

export const LatestFlightsPanel = ({ data }: { data: geo_intel_feed_response }) => {
  const [open, setOpen] = useState(false)
  const aviationEvents = data.events.filter(e => e.category === 'aviation')

  return (
    <>
      <Block title="latest flights & airspace" extra="row-span-2 cursor-pointer hover:border-blue-500 transition-colors" onClick={() => setOpen(true)} extraHead={<span className="text-[9px] border border-blue-500 text-blue-500 px-1.5 rounded">RADAR</span>}>
        <div className="flex flex-col gap-2 h-full">
          <div className="flex items-center gap-3 bg-[#111] p-2 rounded border border-blue-500/20">
            <div className="text-2xl font-bold text-blue-400">{aviationEvents.length}</div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-white uppercase">Airspace Anomalies</span>
              <span className="text-[9px] text-stone-500">Global flight telemetry</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
            {aviationEvents.length > 0 ? aviationEvents.slice(0, 5).map(e => (
              <div key={e.id} className="flex flex-col bg-[#1a1a1a] p-1.5 rounded">
                <span className="text-[9px] text-stone-400 uppercase tracking-widest flex items-center gap-1">
                  ✈ {e.title.replace('RADAR: Flight', '').trim()}
                </span>
                <span className="text-[10px] text-stone-200">{e.summary.split('|')[0]}</span>
              </div>
            )) : (
              <div className="text-[10px] text-stone-500 text-center py-2">No severe flight anomalies tracked.</div>
            )}
          </div>
        </div>
      </Block>
      {open && <FlightMap events={aviationEvents} onClose={() => setOpen(false)} />}
    </>
  )
}

export const LiveStreamsPanel = ({ data }: { data: geo_intel_feed_response }) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Block title="live news networks" extra="row-span-1 cursor-pointer hover:border-red-500 transition-colors" onClick={() => setOpen(true)} extraHead={<span className="text-[9px] bg-red-500 text-white px-1.5 rounded animate-pulse">LIVE TV</span>}>
        <div className="flex items-center justify-between h-full px-2">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">Global Broadcasts</span>
            <span className="text-[10px] text-stone-500">{data.source_health.active_sources} active sources routing</span>
          </div>
          <button className="bg-red-500/20 text-red-500 border border-red-500 p-2 rounded-full">
            ▶
          </button>
        </div>
      </Block>
      {open && <LiveStreamDeck onClose={() => setOpen(false)} />}
    </>
  )
}

const tonez: Record<string, { text: string, border: string, bg: string, dot: string }> = {
  red: { text: "text-red-400", border: "border-red-500/30", bg: "bg-red-500/10", dot: "bg-red-500" },
  cyan: { text: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-500/10", dot: "bg-cyan-500" },
  purple: { text: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/10", dot: "bg-purple-500" },
  orange: { text: "text-orange-400", border: "border-orange-500/30", bg: "bg-orange-500/10", dot: "bg-orange-500" },
  green: { text: "text-green-400", border: "border-green-500/30", bg: "bg-green-500/10", dot: "bg-green-500" },
  yellow: { text: "text-yellow-400", border: "border-yellow-500/30", bg: "bg-yellow-500/10", dot: "bg-yellow-500" },
  stone: { text: "text-stone-300", border: "border-stone-500/30", bg: "bg-stone-500/10", dot: "bg-stone-400" },
}

const domain_panel = ({ data, id }: { data: geo_intel_feed_response, id: string }) => {
  const group = build_live_deck(data).groups.find(item => item.id === id)
  if (!group) return null
  const tone = tonez[group.color] || tonez.stone
  return (
    <Block
      title={group.title}
      extraHead={<span className={`text-[9px] border px-1.5 rounded uppercase ${tone.text} ${tone.border}`}>live {group.count}</span>}
    >
      <div className="flex flex-col gap-2 min-h-[184px]">
        <div className={`grid grid-cols-3 gap-2 border p-2 rounded ${tone.border} ${tone.bg}`}>
          <div className="flex flex-col">
            <span className={`text-xl font-bold ${tone.text}`}>{group.count}</span>
            <span className="text-[8px] text-stone-500 uppercase">signals</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-red-400">{group.critical}</span>
            <span className="text-[8px] text-stone-500 uppercase">critical</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-orange-400">{group.high}</span>
            <span className="text-[8px] text-stone-500 uppercase">high</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {group.layers.map(layer => (
            <span key={layer} className="text-[8px] text-stone-400 border border-[#2c2c2c] bg-[#111] px-1.5 py-0.5 rounded">
              {layer.replaceAll("_", " ")} {data.counts?.[layer] || 0}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          {group.events.length ? group.events.slice(0, 4).map(event => (
            <div key={event.id} className="flex gap-2 border-t border-[#222] pt-1.5 first:border-0 first:pt-0 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${event.severity === "critical" ? "bg-red-500" : event.severity === "high" ? "bg-orange-500" : tone.dot}`} />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-stone-200 leading-tight line-clamp-2">{event.title}</span>
                <span className="text-[8px] text-stone-500 truncate">{event.location_name} | {event.source_name} | {formatTimeAgo(event.published_at)}</span>
              </div>
            </div>
          )) : (
            <span className="text-[9px] text-stone-500 py-2">reference layers active; awaiting live event matches</span>
          )}
        </div>
      </div>
    </Block>
  )
}

const source_health_panel = ({ data }: { data: geo_intel_feed_response }) => {
  const health = data.source_health
  const total = health.active_sources + health.delayed_sources + health.stale_sources
  return (
    <Block title="source health" extraHead={<span className="text-[9px] border border-green-500/40 text-green-400 px-1.5 rounded">live {health.active_sources}</span>}>
      <div className="flex flex-col gap-2 min-h-[150px]">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["active", health.active_sources, "text-green-400"],
            ["delayed", health.delayed_sources, "text-yellow-400"],
            ["stale", health.stale_sources, "text-red-400"],
          ].map(([label, val, color]) => (
            <div key={label} className="bg-[#111] border border-[#222] p-2 flex flex-col">
              <span className={`text-lg font-bold ${color}`}>{val}</span>
              <span className="text-[8px] text-stone-500 uppercase">{label}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          {health.source_groups.map(source => (
            <div key={source.name} className="flex items-center justify-between border-t border-[#222] pt-1.5 first:border-0">
              <span className="text-[9px] text-stone-300 truncate">{source.name}</span>
              <span className={`text-[8px] uppercase ${source.status === "live" ? "text-green-400" : source.status === "delayed" ? "text-yellow-400" : "text-red-400"}`}>
                {source.status} {source.count}
              </span>
            </div>
          ))}
        </div>
        <span className="text-[8px] text-stone-600">last refresh {formatTimeAgo(health.last_refresh)} | {total} monitored source states</span>
      </div>
    </Block>
  )
}

const live_correlations_panel = ({ data }: { data: geo_intel_feed_response }) => {
  const correlations = data.correlations.slice(0, 5)
  return (
    <Block title="live correlations" extraHead={<span className="text-[9px] border border-cyan-500/40 text-cyan-400 px-1.5 rounded">{correlations.length} linked</span>}>
      <div className="flex flex-col gap-2 min-h-[184px]">
        {correlations.length ? correlations.map(item => (
          <div key={item.id} className="border-l-2 border-cyan-500/60 bg-[#111] px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-stone-200 font-semibold line-clamp-1">{item.title}</span>
              <span className="text-[8px] text-cyan-400 shrink-0">{Math.round(item.confidence * 100)}%</span>
            </div>
            <span className="text-[9px] text-stone-500 leading-tight line-clamp-2">{item.interpretation}</span>
            <div className="flex gap-1 mt-1 flex-wrap">
              {item.categories.map((category, index) => <span key={`${category}-${index}`} className="text-[7px] uppercase text-stone-500 border border-[#2b2b2b] px-1">{category}</span>)}
            </div>
          </div>
        )) : <span className="text-[9px] text-stone-500 py-3 text-center">no verified cross-domain correlation in the current window</span>}
      </div>
    </Block>
  )
}

const wm_panel_groups = [
  {
    id: "ops",
    title: "ops intelligence",
    panels: ["live news", "live webcams", "threat timeline", "country instability", "strategic risk", "strategic posture", "cross-source signals"],
    layers: ["conflicts", "wars", "civil_unrest", "violence", "humanitarian", "ucdp_events", "displacement", "disease_outbreaks"],
    tone: "text-red-400 border-red-500/30 bg-red-500/10",
  },
  {
    id: "infra",
    title: "infrastructure atlas",
    panels: ["cascade", "supply chain", "chokepoint strip", "pipeline status", "storage facility map", "energy disruptions", "fuel shortages"],
    layers: ["pipelines", "cables", "chokepoints", "trade_routes", "live_tankers", "storage_facilities", "fuel_shortages", "commodity_ports"],
    tone: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  },
  {
    id: "markets",
    title: "markets & resources",
    panels: ["markets", "energy complex", "macro signals", "fear & greed", "sanctions pressure", "critical minerals", "gulf economies"],
    layers: ["economic_centers", "stock_exchanges", "financial_centers", "central_banks", "critical_minerals", "mining_sites", "processing_plants", "gulf_investments"],
    tone: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  },
  {
    id: "tech",
    title: "technology surface",
    panels: ["internet disruptions", "service status", "tech readiness", "tech hubs", "defense patents", "telegram intel", "gdelt intel"],
    layers: ["internet_disruptions", "cyber_threats", "data_centers", "startup_hubs", "cloud_regions", "accelerators", "tech_hqs", "tech_events"],
    tone: "text-sky-400 border-sky-500/30 bg-sky-500/10",
  },
  {
    id: "resilience",
    title: "resilience & civil",
    panels: ["population exposure", "radiation watch", "thermal escalation", "disease outbreaks", "positive feed", "progress", "renewable energy"],
    layers: ["radiation_watch", "irradiators", "natural_events", "climate_anomalies", "positive_events", "kindness", "happiness", "species_recovery", "renewable_installations", "resilience_score"],
    tone: "text-green-400 border-green-500/30 bg-green-500/10",
  },
]

const layer_panel_tone: Record<string, { text: string, border: string, bg: string, bar: string }> = {
  red: { text: "text-red-400", border: "border-red-500/30", bg: "bg-red-500/10", bar: "bg-red-500" },
  orange: { text: "text-orange-400", border: "border-orange-500/30", bg: "bg-orange-500/10", bar: "bg-orange-500" },
  cyan: { text: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-500/10", bar: "bg-cyan-500" },
  sky: { text: "text-sky-400", border: "border-sky-500/30", bg: "bg-sky-500/10", bar: "bg-sky-500" },
  green: { text: "text-green-400", border: "border-green-500/30", bg: "bg-green-500/10", bar: "bg-green-500" },
  yellow: { text: "text-yellow-400", border: "border-yellow-500/30", bg: "bg-yellow-500/10", bar: "bg-yellow-500" },
  purple: { text: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/10", bar: "bg-purple-500" },
  stone: { text: "text-stone-300", border: "border-stone-500/30", bg: "bg-stone-500/10", bar: "bg-stone-500" },
}

export const layer_signal_panels = [
  { id: "ucdp_events", title: "ucdp conflict events", badge: "conflict", tone: "red" },
  { id: "displacement", title: "displacement flows", badge: "humanitarian", tone: "cyan" },
  { id: "disease_outbreaks", title: "disease outbreaks", badge: "health", tone: "green" },
  { id: "trade_routes", title: "trade route stress", badge: "maritime", tone: "sky" },
  { id: "live_tankers", title: "live tanker watch", badge: "ais", tone: "cyan" },
  { id: "fuel_shortages", title: "fuel shortage registry", badge: "energy", tone: "orange" },
  { id: "data_centers", title: "ai data centers", badge: "tech", tone: "sky" },
  { id: "startup_hubs", title: "startup hubs", badge: "venture", tone: "cyan" },
  { id: "cloud_regions", title: "cloud regions", badge: "cloud", tone: "purple" },
  { id: "stock_exchanges", title: "stock exchanges", badge: "market", tone: "green" },
  { id: "central_banks", title: "central banks", badge: "macro", tone: "yellow" },
  { id: "gulf_investments", title: "gulf investments", badge: "fdi", tone: "green" },
  { id: "mining_sites", title: "mining sites", badge: "minerals", tone: "purple" },
  { id: "commodity_ports", title: "commodity ports", badge: "ports", tone: "sky" },
  { id: "irradiators", title: "radiological assets", badge: "watch", tone: "yellow" },
  { id: "renewable_installations", title: "clean energy", badge: "grid", tone: "green" },
  { id: "species_recovery", title: "species recovery", badge: "resilience", tone: "green" },
  { id: "resilience_score", title: "resilience score", badge: "civil", tone: "cyan" },
] as const

export const LayerSignalPanel = ({ data, id, title, badge, tone = "stone" }: { data: geo_intel_feed_response, id: string, title: string, badge: string, tone?: string }) => {
  const cfg = layer_panel_tone[tone] || layer_panel_tone.stone
  const count = data.counts?.[id as keyof typeof data.counts] || 0
  const events = data.events.filter(event => event.layer_id === id).slice(0, 3)
  const severity = events.find(event => event.severity === "critical") ? "critical" : events.find(event => event.severity === "high") ? "high" : count > 0 ? "active" : "quiet"
  const fill = Math.min(100, Math.max(8, count * 7))
  return (
    <Block title={title} extra="min-h-[210px]" extraHead={<span className={`text-[9px] border px-1.5 rounded uppercase ${cfg.text} ${cfg.border}`}>{badge}</span>}>
      <div className="flex h-full flex-col gap-2">
        <div className={`rounded border p-2 ${cfg.border} ${cfg.bg}`}>
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col">
              <span className={`text-2xl font-bold leading-none ${cfg.text}`}>{count}</span>
              <span className="text-[8px] uppercase tracking-widest text-stone-500">signals</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase text-stone-200">{severity}</span>
              <span className="text-[8px] text-stone-500">wm layer</span>
            </div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
            <div className={`h-full ${cfg.bar}`} style={{ width: `${fill}%` }} />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          {events.length ? events.map(event => (
            <div key={event.id} className="border-t border-[#222] pt-1 first:border-0 first:pt-0">
              <span className="block text-[10px] leading-tight text-stone-200 line-clamp-2">{event.title}</span>
              <span className="block text-[8px] text-stone-500 truncate">{event.source_name} | {formatTimeAgo(event.published_at)}</span>
            </div>
          )) : (
            <span className="text-[9px] text-stone-500">registry layer ready; no live event rows in the current feed window</span>
          )}
        </div>
      </div>
    </Block>
  )
}

const worldmonitor_panels_panel = ({ data }: { data: geo_intel_feed_response }) => {
  const counts = data.counts || {}
  const total_layers = wm_panel_groups.reduce((sum, group) => sum + group.layers.filter(layer => (counts as any)[layer] > 0).length, 0)
  return (
    <Block title="worldmonitor panel matrix" extraHead={<span className="text-[9px] border border-sky-500/40 text-sky-400 px-1.5 rounded">{total_layers} live layers</span>}>
      <div className="flex flex-col gap-2 min-h-[220px]">
        {wm_panel_groups.map(group => {
          const signals = group.layers.reduce((sum, layer) => sum + ((counts as any)[layer] || 0), 0)
          return (
            <div key={group.id} className={`rounded border px-2 py-1.5 ${group.tone}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-100">{group.title}</span>
                <span className="text-[10px] font-bold">{signals}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {group.panels.map(panel => (
                  <span key={panel} className="rounded border border-white/10 bg-black/20 px-1.5 py-0.5 text-[7px] uppercase text-stone-300">
                    {panel}
                  </span>
                ))}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {group.layers.filter(layer => (counts as any)[layer] > 0).slice(0, 8).map(layer => (
                  <span key={layer} className="text-[7px] uppercase text-stone-500">
                    {layer.replaceAll("_", " ")} {(counts as any)[layer]}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Block>
  )
}

export const live_panels = {
  conflict_humanitarian: (props: { data: geo_intel_feed_response }) => domain_panel({ ...props, id: "conflict_humanitarian" }),
  infrastructure_flow: (props: { data: geo_intel_feed_response }) => domain_panel({ ...props, id: "infrastructure_flow" }),
  cyber_connectivity: (props: { data: geo_intel_feed_response }) => domain_panel({ ...props, id: "cyber_connectivity" }),
  strategic_assets: (props: { data: geo_intel_feed_response }) => domain_panel({ ...props, id: "strategic_assets" }),
  natural_climate: (props: { data: geo_intel_feed_response }) => domain_panel({ ...props, id: "natural_climate" }),
  sanctions_economic: (props: { data: geo_intel_feed_response }) => domain_panel({ ...props, id: "sanctions_economic" }),
  technology_watch: (props: { data: geo_intel_feed_response }) => domain_panel({ ...props, id: "technology_watch" }),
  resilience_progress: (props: { data: geo_intel_feed_response }) => domain_panel({ ...props, id: "resilience_progress" }),
  intelligence_hotspots: (props: { data: geo_intel_feed_response }) => domain_panel({ ...props, id: "intelligence_hotspots" }),
  worldmonitor_panels: worldmonitor_panels_panel,
  source_health: source_health_panel,
  live_correlations: live_correlations_panel,
}

export const LiveIntelligenceFeed = ({ data }: { data: geo_intel_feed_response }) => {
  const events = build_live_deck(data).events

  return (
    <>
      <Block title="live intelligence" extra="row-span-2 h-full">
        <div className="flex gap-4 border-b border-[#222] pb-2 text-[11px] font-bold text-stone-500 shrink-0">
          <span className="text-white border-b-2 border-white pb-1 flex items-center gap-1">⚡ Live Events Feed</span>
          <span className="hover:text-stone-300 cursor-pointer">MILITARY</span>
          <span className="hover:text-stone-300 cursor-pointer">CYBER</span>
        </div>
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto mt-2 pr-1">
          {events.length > 0 ? events.map(e => (
            <div key={e.id} className="flex gap-2 text-[11px] p-2 bg-[#111] hover:bg-[#1a1a1a] border border-[#222] rounded group transition-colors">
              <span className={`text-${e.severity === 'critical' ? 'red' : e.severity === 'high' ? 'orange' : 'yellow'}-500 mt-0.5`}>■</span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-stone-200 line-clamp-2">{e.title}</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] text-stone-500 uppercase truncate">{e.category} | {e.source_name} • {formatTimeAgo(e.published_at)}</span>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-[10px] text-stone-500 text-center py-4 uppercase">Waiting for signals...</div>
          )}
        </div>
      </Block>
    </>
  )
}


export const StrategicRiskOverview = ({ data }: { data: geo_intel_feed_response }) => {
  const criticalCount = data.events.filter(e => e.severity === 'critical' || e.severity === 'high').length
  const totalCount = data.events.length
  const riskScore = totalCount === 0 ? 0 : Math.min(100, Math.round((criticalCount / Math.max(1, totalCount)) * 100) + (criticalCount * 2))

  let riskLevel = "low"
  let color = "text-green-500"
  let strokeColor = "#22c55e"
  let trend = "Stable"
  let trendIcon = "➡"
  let trendColor = "text-blue-500 bg-blue-500/20"

  if (riskScore >= 66) {
    riskLevel = "high"
    color = "text-[#ff6b00]"
    strokeColor = "#ff6b00"
    trend = "Worsening"
    trendIcon = "↗"
    trendColor = "text-red-500 bg-red-500/20"
  } else if (riskScore >= 33) {
    riskLevel = "elevated"
    color = "text-yellow-500"
    strokeColor = "#eab308"
    trend = "Rising"
    trendIcon = "↗"
    trendColor = "text-yellow-500 bg-yellow-500/20"
  }

  return (
    <Block title="strategic risk overview" extraHead={<span className="text-[9px] border border-[#eab308] text-[#eab308] px-1.5 rounded">LIVE · {totalCount} events</span>}>
      <div className="flex flex-col h-full justify-center">
        <div className="flex justify-around items-center">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <path className="text-[#222]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
              <path stroke={strokeColor} strokeDasharray={`${riskScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-bold ${color}`}>{riskScore}</span>
              <span className={`text-[8px] tracking-widest ${color} uppercase font-bold`}>{riskLevel}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-stone-500 uppercase tracking-widest">trend</span>
            <div className="flex items-center gap-2">
              <span className={`${trendColor} px-1 rounded text-[10px]`}>{trendIcon}</span>
              <span className="text-[12px] text-stone-300 font-semibold">{trend}</span>
            </div>
          </div>
        </div>
      </div>
    </Block>
  )
}

export const ThreatTimeline = ({ data }: { data: geo_intel_feed_response }) => {
  const days: Record<string, { total: number, critical: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days[d.toISOString().split('T')[0]] = { total: 0, critical: 0 }
  }
  let totalCriticalHigh = 0
  data.events.forEach(e => {
    const dateStr = e.published_at.split('T')[0]
    if (days[dateStr]) {
      days[dateStr].total++
      if (e.severity === 'critical' || e.severity === 'high') {
        days[dateStr].critical++
        totalCriticalHigh++
      }
    }
  })

  const dayEntries = Object.entries(days).sort((a, b) => a[0].localeCompare(b[0]))
  const activeDays = dayEntries.filter(([_, stats]) => stats.total > 0).length

  return (
    <Block title="threat timeline" extraHead={<span className="text-[9px] border border-green-500 text-green-500 px-1.5 rounded">LIVE EVENTS</span>}>
      <div className="flex flex-col h-full justify-between">
        <div className="flex justify-between text-center border-b border-[#222] pb-2">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white">{totalCriticalHigh}</span>
            <span className="text-[9px] text-stone-400">Critical/high</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white">{activeDays}</span>
            <span className="text-[9px] text-stone-400">Active days</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-bold text-white">7-Day Horizon</span>
            <span className="text-[9px] text-stone-400">{data.events.length} total events</span>
          </div>
        </div>
        <div className="flex items-end justify-between mt-4 h-16 px-2">
          {dayEntries.map(([dateStr, stats], idx) => {
            const d = new Date(dateStr)
            const label = `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`
            const maxH = 40
            const maxEvents = Math.max(...dayEntries.map(e => e[1].total), 1)
            const totalH = Math.max(2, (stats.total / maxEvents) * maxH)
            const critH = Math.max(0, (stats.critical / maxEvents) * maxH)

            return (
              <div key={dateStr} className="flex flex-col items-center gap-0 w-6">
                {stats.total > 0 ? (
                  <>
                    {stats.critical > 0 && <div className="w-4 bg-red-500 rounded-t-sm" style={{ height: `${critH}px` }} />}
                    <div className="w-4 bg-[#ff6b00]" style={{ height: `${totalH - critH}px`, borderTopLeftRadius: stats.critical === 0 ? '2px' : '0', borderTopRightRadius: stats.critical === 0 ? '2px' : '0' }} />
                    <div className="w-4 h-2 bg-[#222] rounded-b-sm" />
                  </>
                ) : (
                  <div className="w-4 h-1 bg-[#222] rounded-sm mb-2" />
                )}
                <span className={`text-[8px] mt-1 ${idx === 6 ? 'text-white font-bold' : 'text-stone-500'}`}>{label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </Block>
  )
}

export const CrossSourceSignal = ({ data }: { data: geo_intel_feed_response }) => {
  const categories: Record<string, { critical: number, high: number, med: number, events: geo_intel_event[] }> = {}
  data.events.forEach(e => {
    if (!categories[e.category]) categories[e.category] = { critical: 0, high: 0, med: 0, events: [] }
    categories[e.category].events.push(e)
    if (e.severity === 'critical') categories[e.category].critical++
    else if (e.severity === 'high') categories[e.category].high++
    else categories[e.category].med++
  })
  const topSig = Object.entries(categories).sort((a, b) => (b[1].critical * 2 + b[1].high) - (a[1].critical * 2 + a[1].high))[0]

  return (
    <Block title="cross-source signal aggregator">
      <div className="flex flex-col gap-2">
        {topSig ? (
          <>
            <div className="border border-red-500/30 bg-[#1a0f0f] rounded p-2 flex flex-col border-l-2 border-l-red-500">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-500 font-mono">1</span>
                  <span className="text-[10px] text-[#e5e5e5] font-bold flex items-center gap-1 uppercase">⚠ {topSig[0]} SURGE</span>
                </div>
                <span className="bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded uppercase">Critical</span>
              </div>
              <span className="text-[9px] text-stone-400 mb-1">Global - {formatTimeAgo(topSig[1].events[0].published_at)}</span>
              <span className="text-[12px] text-stone-200 leading-snug">
                Anomaly detected: {topSig[1].events.length} active {topSig[0]} events tracked globally.
              </span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold mt-2">
              <span className="text-red-500 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Critical {topSig[1].critical}</span>
              <span className="text-[#ff6b00] flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[#ff6b00] rounded-full" /> High {topSig[1].high}</span>
              <span className="text-[#eab308] flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[#eab308] rounded-full" /> Medium {topSig[1].med}</span>
            </div>
          </>
        ) : (
          <div className="text-stone-500 text-[10px] py-4 text-center">No significant cross-source signals.</div>
        )}
      </div>
    </Block>
  )
}

export const CountryInstabilityPanel = ({ data }: { data: geo_intel_feed_response }) => {
  const scores: Record<string, number> = {}
  data.events.forEach(e => {
    const loc = e.location_name || 'Unknown'
    if (loc === 'Unknown') return
    if (!scores[loc]) scores[loc] = 0
    scores[loc] += e.severity === 'critical' ? 25 : e.severity === 'high' ? 15 : e.severity === 'elevated' ? 10 : 5
  })

  const list = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, score]) => {
      const normalizedScore = Math.min(100, score * 2)
      return {
        name: name.split(',')[0],
        score: normalizedScore,
        chg: normalizedScore > 70 ? 5 : normalizedScore > 40 ? 2 : 0,
        flag: normalizedScore > 70 ? "🔴" : normalizedScore > 40 ? "🟠" : "🟡"
      }
    })

  return (
    <Block title="country instability" extraHead={<span className="text-[9px] border border-[#ff6b00] text-[#ff6b00] px-1.5 rounded">LIVE</span>}>
      <div className="flex flex-col gap-3">
        {list.length > 0 ? list.map(c => (
          <div key={c.name} className="flex flex-col gap-1 border-b border-[#222] pb-2 last:border-0">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-[#e5e5e5] font-semibold flex items-center gap-2 truncate pr-2 max-w-[150px]">
                <span className="text-stone-500 text-[10px]">☆</span> {c.flag} {c.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-white">{c.score}</span>
                <span className={`text-[9px] ${c.chg > 0 ? 'text-red-500' : c.chg < 0 ? 'text-green-500' : 'text-stone-500'}`}>
                  {c.chg > 0 ? `↑${c.chg}` : c.chg < 0 ? `↓${Math.abs(c.chg)}` : '—'}
                </span>
                <span className="text-stone-500 text-[10px] ml-1">↑</span>
              </div>
            </div>
            <div className="h-1 bg-[#222] rounded-full overflow-hidden">
              <div className={`h-full ${c.score > 70 ? 'bg-[#ff6b00]' : 'bg-[#eab308]'}`} style={{ width: `${c.score}%` }} />
            </div>
            <div className="text-[8px] text-stone-500 uppercase flex gap-2 tracking-wider mt-0.5">
              <span>EVTS:{c.score > 0 ? Math.floor(c.score / 10) : 0}</span>
            </div>
          </div>
        )) : (
          <div className="text-stone-500 text-[10px] text-center mt-4">No regional instability detected.</div>
        )}
      </div>
    </Block>
  )
}

export const StrategicPosturePanel = ({ data }: { data: geo_intel_feed_response }) => {
  const theaters: Record<string, { events: geo_intel_event[], air: number, sea: number }> = {
    "Middle East": { events: [], air: 0, sea: 0 },
    "Eastern Europe": { events: [], air: 0, sea: 0 },
    "Asia Pacific": { events: [], air: 0, sea: 0 },
    "Global Other": { events: [], air: 0, sea: 0 }
  }

  data.events.forEach(e => {
    if (e.category === 'aviation') {
      const region = e.lng && e.lng > 30 && e.lng < 60 && e.lat && e.lat > 10 && e.lat < 40 ? "Middle East" :
        e.lng && e.lng > 10 && e.lng < 40 && e.lat && e.lat > 40 && e.lat < 60 ? "Eastern Europe" :
          e.lng && e.lng > 100 ? "Asia Pacific" : "Global Other";
      theaters[region].events.push(e)
      theaters[region].air++
    }
    if (e.category === 'maritime' || e.title.toLowerCase().includes('naval')) {
      const region = e.lng && e.lng > 30 && e.lng < 60 && e.lat && e.lat > 10 && e.lat < 40 ? "Middle East" :
        e.lng && e.lng > 10 && e.lng < 40 && e.lat && e.lat > 40 && e.lat < 60 ? "Eastern Europe" :
          e.lng && e.lng > 100 ? "Asia Pacific" : "Global Other";
      theaters[region].events.push(e)
      theaters[region].sea++
    }
  })

  const sortedTheaters = Object.entries(theaters).filter(([_, t]) => t.air > 0 || t.sea > 0).slice(0, 3)

  return (
    <Block title="strategic posture" extraHead={<span className="text-[9px] bg-white/10 px-1.5 rounded text-white">{build_live_deck(data).events.length} SIGNALS</span>}>
      <div className="flex flex-col gap-2">
        {sortedTheaters.length > 0 ? sortedTheaters.map(([name, t]) => {
          const isElev = t.air + t.sea > 2
          return (
            <div key={name} className={`p-2 border rounded flex flex-col gap-2 ${isElev ? 'border-yellow-500/20 bg-yellow-500/10' : 'border-green-500/20 bg-green-500/5'}`}>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#e5e5e5] font-semibold">{name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isElev ? 'bg-yellow-500/20 text-yellow-500' : 'text-green-500'}`}>
                  {isElev ? 'ELEV' : 'NORM'}
                </span>
              </div>
              <div className="flex gap-3 text-[10px] text-stone-400">
                {t.air > 0 && <span className="flex items-center gap-1">AIR ✈ {t.air}</span>}
                {t.sea > 0 && <span className="flex items-center gap-1">SEA 🚢 {t.sea}</span>}
              </div>
              <div className="text-[9px] text-stone-500 mt-1 flex justify-between">
                <span>→ {isElev ? 'active' : 'stable'}</span>
              </div>
            </div>
          )
        }) : (
          <div className="p-2 border border-[#222] bg-[#1a1a1a] rounded text-[10px] text-stone-500 text-center">
            No significant posture changes detected.
          </div>
        )}
      </div>
    </Block>
  )
}

export const CryptoPanel = ({ data }: { data: geo_intel_feed_response }) => {
  return (
    <Block title="crypto prices" extraHead={<span className="text-[9px] border border-blue-500 text-blue-500 px-1.5 rounded">DIGITAL</span>}>
      <div className="flex flex-col gap-2">
        {data.crypto?.map(c => (
          <div key={c.id} className="flex items-center justify-between border-b border-[#222] pb-1 last:border-0 last:pb-0">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-[#e5e5e5] tracking-widest">{c.symbol}</span>
              <span className="text-[9px] text-stone-500">{c.name}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[12px] font-bold text-white">{c.price}</span>
              <span className={`text-[9px] ${c.change_pct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {c.change_pct > 0 ? '+' : ''}{c.change_pct}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </Block>
  )
}

export const FearGreedPanel = ({ data }: { data: geo_intel_feed_response }) => {
  const fg = data.fear_greed
  if (!fg) return null

  return (
    <Block title="fear & greed index" extraHead={<span className="text-[9px] bg-[#222] text-stone-300 px-1.5 rounded">SENTIMENT</span>}>
      <div className="flex flex-col items-center justify-center py-4 h-full">
        <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-[#222]">
          <span className="text-3xl font-bold text-white">{fg.index}</span>
        </div>
        <div className="mt-4 flex flex-col items-center">
          <span className="text-[14px] font-bold uppercase tracking-widest text-stone-300">{fg.classification}</span>
          <span className="text-[10px] text-stone-500 mt-1">PREV: {fg.previous_1} ({fg.previous_1_classification})</span>
        </div>
      </div>
    </Block>
  )
}

export const MacroSignalsPanel = ({ data }: { data: geo_intel_feed_response }) => {
  return (
    <Block title="macro signals" extraHead={<span className="text-[9px] bg-purple-500/20 text-purple-500 px-1.5 rounded">ECONOMY</span>}>
      <div className="flex flex-col gap-2">
        {data.macro_signals?.map(m => (
          <div key={m.label} className="flex justify-between items-center bg-[#111] border border-[#222] p-2 hover:border-purple-500/50 transition-colors">
            <span className="text-[10px] font-bold text-stone-400">{m.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white">{m.value}</span>
              <span className={`text-[10px] ${m.status === 'positive' ? 'text-green-500' : m.status === 'negative' ? 'text-red-500' : 'text-stone-500'}`}>
                {m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Block>
  )
}

export const WorldClockPanel = () => {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  const cities = [
    { name: "NY", tz: "America/New_York" },
    { name: "LDN", tz: "Europe/London" },
    { name: "TOK", tz: "Asia/Tokyo" },
    { name: "DXB", tz: "Asia/Dubai" },
  ]

  return (
    <Block title="world clock" extraHead={<span className="text-[9px] text-stone-500 border border-stone-700 px-1.5 rounded">TIME</span>}>
      <div className="grid grid-cols-2 gap-2 h-full">
        {cities.map(c => {
          const str = time.toLocaleTimeString("en-US", { timeZone: c.tz, hour: '2-digit', minute: '2-digit', hour12: false })
          return (
            <div key={c.name} className="flex flex-col bg-[#111] border border-[#222] p-2 items-center justify-center">
              <span className="text-[14px] font-bold text-white tracking-widest">{str}</span>
              <span className="text-[9px] text-stone-500 mt-1">{c.name}</span>
            </div>
          )
        })}
      </div>
    </Block>
  )
}
