"use client"

import { useRef, useState } from "react"

export type world_monitor_layer_id =
  | "conflicts" | "wars" | "civil_unrest" | "violence" | "humanitarian"
  | "nuclear" | "bases" | "pipelines" | "cables"
  | "sanctions"
  | "radiation_watch" | "spaceports" | "chokepoints"
  | "climate_anomalies" | "weather_alerts" | "internet_disruptions"
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

export interface world_monitor_layer_state {
  conflicts: boolean
  wars: boolean
  civil_unrest: boolean
  violence: boolean
  humanitarian: boolean
  nuclear: boolean
  bases: boolean
  pipelines: boolean
  cables: boolean
  sanctions: boolean
  radiation_watch: boolean
  spaceports: boolean
  chokepoints: boolean
  climate_anomalies: boolean
  weather_alerts: boolean
  internet_disruptions: boolean
  cyber_threats: boolean
  gps_jamming: boolean
  iran_attacks: boolean
  intel_hotspots: boolean
  critical_minerals: boolean
  economic_centers: boolean
  orbital_surveillance: boolean
  storage_facilities: boolean
  ucdp_events: boolean
  displacement: boolean
  disease_outbreaks: boolean
  data_centers: boolean
  trade_routes: boolean
  fuel_shortages: boolean
  live_tankers: boolean
  stock_exchanges: boolean
  financial_centers: boolean
  central_banks: boolean
  commodity_hubs: boolean
  gulf_investments: boolean
  startup_hubs: boolean
  cloud_regions: boolean
  accelerators: boolean
  tech_hqs: boolean
  tech_events: boolean
  positive_events: boolean
  kindness: boolean
  happiness: boolean
  species_recovery: boolean
  renewable_installations: boolean
  mining_sites: boolean
  processing_plants: boolean
  commodity_ports: boolean
  irradiators: boolean
  resilience_score: boolean
  day_night: boolean
}

export const DEFAULT_WM_LAYERS: world_monitor_layer_state = {
  conflicts: false,
  wars: false,
  civil_unrest: false,
  violence: false,
  humanitarian: false,
  nuclear: false,
  bases: false,
  pipelines: false,
  cables: false,
  sanctions: false,
  radiation_watch: false,
  spaceports: false,
  chokepoints: false,
  climate_anomalies: false,
  weather_alerts: false,
  internet_disruptions: false,
  cyber_threats: false,
  gps_jamming: false,
  iran_attacks: false,
  intel_hotspots: false,
  critical_minerals: false,
  economic_centers: false,
  orbital_surveillance: false,
  storage_facilities: false,
  ucdp_events: false,
  displacement: false,
  disease_outbreaks: false,
  data_centers: false,
  trade_routes: false,
  fuel_shortages: false,
  live_tankers: false,
  stock_exchanges: false,
  financial_centers: false,
  central_banks: false,
  commodity_hubs: false,
  gulf_investments: false,
  startup_hubs: false,
  cloud_regions: false,
  accelerators: false,
  tech_hqs: false,
  tech_events: false,
  positive_events: false,
  kindness: false,
  happiness: false,
  species_recovery: false,
  renewable_installations: false,
  mining_sites: false,
  processing_plants: false,
  commodity_ports: false,
  irradiators: false,
  resilience_score: false,
  day_night: false,
}

type layer_def = {
  id: world_monitor_layer_id
  label: string
  icon: string
  color: string
  badge: string
  severity: "critical" | "high" | "moderate" | "info"
  group: "threats" | "infrastructure" | "climate" | "economic" | "intelligence" | "maritime" | "technology" | "health" | "resilience"
}

const layers: layer_def[] = [
  { id: "iran_attacks", label: "iran attacks", icon: "ir", color: "#ef4444", badge: "osint", severity: "critical", group: "threats" },
  { id: "intel_hotspots", label: "intel hotspots", icon: "hot", color: "#f97316", badge: "gil", severity: "critical", group: "threats" },
  { id: "conflicts", label: "conflict zones", icon: "cf", color: "#ef4444", badge: "ucdp", severity: "critical", group: "threats" },
  { id: "wars", label: "active wars", icon: "war", color: "#dc2626", badge: "ucdp", severity: "critical", group: "threats" },
  { id: "civil_unrest", label: "civil unrest", icon: "un", color: "#f59e0b", badge: "acled", severity: "moderate", group: "threats" },
  { id: "violence", label: "violence events", icon: "vx", color: "#f97316", badge: "acled", severity: "high", group: "threats" },
  { id: "humanitarian", label: "humanitarian stress", icon: "hum", color: "#06b6d4", badge: "hdx", severity: "info", group: "threats" },
  { id: "gps_jamming", label: "gps jamming", icon: "gps", color: "#a855f7", badge: "osint", severity: "high", group: "threats" },
  { id: "cyber_threats", label: "cyber threats", icon: "cy", color: "#6366f1", badge: "cert", severity: "high", group: "threats" },
  { id: "ucdp_events", label: "ucdp events", icon: "ucd", color: "#ef4444", badge: "ucdp", severity: "high", group: "threats" },
  { id: "displacement", label: "displacement flows", icon: "disp", color: "#06b6d4", badge: "unhcr", severity: "high", group: "threats" },
  { id: "disease_outbreaks", label: "disease outbreaks", icon: "bio", color: "#84cc16", badge: "who", severity: "moderate", group: "health" },

  { id: "bases", label: "military bases", icon: "mil", color: "#10b981", badge: "mil", severity: "high", group: "infrastructure" },
  { id: "nuclear", label: "nuclear sites", icon: "nuc", color: "#d946ef", badge: "iaea", severity: "critical", group: "infrastructure" },
  { id: "irradiators", label: "gamma irradiators", icon: "irr", color: "#facc15", badge: "iaea", severity: "high", group: "infrastructure" },
  { id: "radiation_watch", label: "radiation watch", icon: "rad", color: "#eab308", badge: "safe", severity: "high", group: "infrastructure" },
  { id: "spaceports", label: "spaceports", icon: "sp", color: "#ec4899", badge: "space", severity: "info", group: "infrastructure" },
  { id: "data_centers", label: "ai data centers", icon: "dc", color: "#22d3ee", badge: "tech", severity: "info", group: "technology" },
  { id: "cables", label: "undersea cables", icon: "cab", color: "#0ea5e9", badge: "infra", severity: "info", group: "infrastructure" },
  { id: "pipelines", label: "pipelines", icon: "pipe", color: "#f59e0b", badge: "infra", severity: "moderate", group: "infrastructure" },
  { id: "storage_facilities", label: "storage facilities", icon: "tank", color: "#78716c", badge: "infra", severity: "info", group: "infrastructure" },
  { id: "fuel_shortages", label: "fuel shortages", icon: "fuel", color: "#f97316", badge: "energy", severity: "high", group: "infrastructure" },
  { id: "chokepoints", label: "chokepoints", icon: "ch", color: "#2563eb", badge: "eia", severity: "high", group: "infrastructure" },
  { id: "trade_routes", label: "trade routes", icon: "tr", color: "#38bdf8", badge: "trade", severity: "moderate", group: "maritime" },
  { id: "live_tankers", label: "live tankers", icon: "ais", color: "#0ea5e9", badge: "ais", severity: "moderate", group: "maritime" },
  { id: "internet_disruptions", label: "internet disruptions", icon: "net", color: "#8b5cf6", badge: "ioda", severity: "high", group: "infrastructure" },

  { id: "climate_anomalies", label: "climate anomalies", icon: "clm", color: "#f97316", badge: "climate", severity: "moderate", group: "climate" },

  { id: "economic_centers", label: "economic centers", icon: "eco", color: "#eab308", badge: "imf", severity: "info", group: "economic" },
  { id: "stock_exchanges", label: "stock exchanges", icon: "stk", color: "#22c55e", badge: "market", severity: "info", group: "economic" },
  { id: "financial_centers", label: "financial centers", icon: "fin", color: "#84cc16", badge: "market", severity: "info", group: "economic" },
  { id: "central_banks", label: "central banks", icon: "cb", color: "#facc15", badge: "macro", severity: "info", group: "economic" },
  { id: "commodity_hubs", label: "commodity hubs", icon: "hub", color: "#fb923c", badge: "trade", severity: "info", group: "economic" },
  { id: "gulf_investments", label: "gulf investments", icon: "gcc", color: "#14b8a6", badge: "fdi", severity: "info", group: "economic" },
  { id: "critical_minerals", label: "critical minerals", icon: "min", color: "#6366f1", badge: "usgs", severity: "moderate", group: "economic" },
  { id: "mining_sites", label: "mining sites", icon: "mine", color: "#a78bfa", badge: "min", severity: "moderate", group: "economic" },
  { id: "processing_plants", label: "processing plants", icon: "proc", color: "#c084fc", badge: "min", severity: "moderate", group: "economic" },
  { id: "commodity_ports", label: "commodity ports", icon: "port", color: "#38bdf8", badge: "port", severity: "moderate", group: "maritime" },
  { id: "sanctions", label: "sanctions", icon: "san", color: "#ef4444", badge: "ofac", severity: "high", group: "economic" },
  { id: "orbital_surveillance", label: "orbital surveillance", icon: "orb", color: "#a855f7", badge: "space", severity: "info", group: "intelligence" },
  { id: "startup_hubs", label: "startup hubs", icon: "vc", color: "#22d3ee", badge: "tech", severity: "info", group: "technology" },
  { id: "cloud_regions", label: "cloud regions", icon: "cld", color: "#38bdf8", badge: "cloud", severity: "info", group: "technology" },
  { id: "accelerators", label: "accelerators", icon: "acc", color: "#a3e635", badge: "tech", severity: "info", group: "technology" },
  { id: "tech_hqs", label: "tech hqs", icon: "hq", color: "#06b6d4", badge: "tech", severity: "info", group: "technology" },
  { id: "tech_events", label: "tech events", icon: "evt", color: "#f472b6", badge: "tech", severity: "info", group: "technology" },
  { id: "positive_events", label: "positive events", icon: "pos", color: "#22c55e", badge: "good", severity: "info", group: "resilience" },
  { id: "kindness", label: "acts of kindness", icon: "kind", color: "#34d399", badge: "good", severity: "info", group: "resilience" },
  { id: "happiness", label: "happiness index", icon: "happy", color: "#facc15", badge: "un", severity: "info", group: "resilience" },
  { id: "species_recovery", label: "species recovery", icon: "bio", color: "#84cc16", badge: "eco", severity: "info", group: "resilience" },
  { id: "renewable_installations", label: "clean energy", icon: "ren", color: "#10b981", badge: "grid", severity: "info", group: "resilience" },
  { id: "resilience_score", label: "resilience score", icon: "res", color: "#2dd4bf", badge: "cii", severity: "info", group: "resilience" },
  { id: "day_night", label: "day/night terminator", icon: "dn", color: "#94a3b8", badge: "astro", severity: "info", group: "intelligence" },
]

const group_labels: Record<string, string> = {
  threats: "threats",
  infrastructure: "infrastructure",
  climate: "climate & natural",
  economic: "economic & sanctions",
  intelligence: "intelligence",
  maritime: "maritime & trade",
  technology: "technology",
  health: "health",
  resilience: "resilience",
}

interface props {
  visible: boolean
  layers: world_monitor_layer_state
  onToggle: (id: world_monitor_layer_id) => void
  counts?: Partial<Record<world_monitor_layer_id, number>>
  has_correlations?: boolean
}

export default function WorldMonitorDeck({ visible, layers: st, onToggle, counts, has_correlations }: props) {
  const [exp, set_exp] = useState(true)
  const [search, set_search] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const active = layers.filter(l => st[l.id]).length
  const total = layers.reduce((a, l) => a + (counts?.[l.id] || 0), 0)

  if (!visible) return null

  if (!exp) return (
    <button onClick={() => set_exp(true)} className="pointer-events-auto h-12 w-12 rounded-xl border border-red-500/30 bg-stone-950/90 text-red-400 backdrop-blur-xl hover:bg-stone-900/90">
      <span className="text-xs font-bold">{active || "wm"}</span>
    </button>
  )

  const filtered = search ? layers.filter(l => `${l.label} ${l.badge}`.includes(search.toLowerCase())) : layers
  const groups = [...new Set(filtered.map(l => l.group))]

  return (
    <div ref={ref} className="w-[300px] pointer-events-auto overflow-hidden rounded-xl border border-stone-800 bg-stone-950/95 font-mono text-stone-300 shadow-2xl backdrop-blur-xl">
      <div className="border-b border-stone-800 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded bg-red-500/20 px-1 py-0.5 text-[10px] text-red-400">live</span>
            <span className="text-xs font-bold tracking-widest text-stone-100">geo-intelligence</span>
          </div>
          <button onClick={() => set_exp(false)} className="text-xs text-stone-500 hover:text-stone-300">x</button>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-stone-500">events tracked</span>
            <span className="text-lg font-bold leading-none text-cyan-400">{total.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-stone-500">layers</span>
            <span className="text-xs">{active} / {layers.length}</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {active > 8 && <span className="rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-400">risk: critical</span>}
          {active <= 8 && active > 3 && <span className="rounded border border-orange-500/20 bg-orange-500/10 px-1.5 py-0.5 text-[10px] text-orange-400">risk: elevated</span>}
          {active <= 3 && active > 0 && <span className="rounded border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-400">risk: stable</span>}
          {has_correlations && <span className="rounded border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-400">correlated</span>}
        </div>
      </div>
      <div className="px-2 pt-2">
        <input
          type="text"
          value={search}
          onChange={e => set_search(e.target.value)}
          placeholder="search layers"
          className="w-full rounded border border-stone-700 bg-stone-900/80 px-2 py-1.5 text-xs text-stone-300 outline-none placeholder:text-stone-600 focus:border-cyan-500/50"
        />
      </div>
      <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto p-2">
        {groups.map(g => (
          <div key={g}>
            {!search && <div className="px-2 pb-1 pt-2 text-[8px] uppercase tracking-widest text-stone-500">{group_labels[g] || g}</div>}
            {filtered.filter(l => l.group === g).map(l => {
              const on = st[l.id]
              const cnt = counts?.[l.id] || 0
              return (
                <label key={l.id} className={`flex cursor-pointer items-center gap-3 rounded border p-2 transition-colors ${on ? "border-stone-700 bg-stone-800/60" : "border-transparent hover:bg-stone-900/50"}`}>
                  <div className={`flex h-4 w-4 items-center justify-center rounded border ${on ? "border-cyan-500 bg-cyan-500/20 text-cyan-400" : "border-stone-600"}`}>
                    {on && <span className="text-[10px]">v</span>}
                  </div>
                  <input type="checkbox" className="hidden" checked={on} onChange={() => onToggle(l.id)} />
                  <span className="w-8 text-[10px] font-bold text-stone-500">{l.icon}</span>
                  <div className="flex flex-1 flex-col">
                    <span className={`text-[10px] font-bold tracking-wide ${on ? "text-stone-100" : "text-stone-400"}`}>{l.label}</span>
                    <span className="text-[8px] text-stone-500">{l.badge}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {cnt > 0 && <span className="text-xs font-bold text-stone-300">{cnt}</span>}
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: on ? l.color : "#333" }} />
                  </div>
                </label>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

