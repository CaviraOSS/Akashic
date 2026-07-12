"use client"

import { geo_intel_feed_response } from "@/lib/geo-intelligence/types"
import { useState } from "react"

export type geo_console_props = {
  data: geo_intel_feed_response
  loading?: boolean
}

const sev_c: Record<string, string> = {
  critical: "text-red-500", high: "text-orange-500",
  elevated: "text-amber-500", moderate: "text-yellow-500",
  low: "text-green-500", info: "text-cyan-500"
}
const sev_bg: Record<string, string> = {
  critical: "bg-red-500", high: "bg-orange-500",
  elevated: "bg-amber-500", moderate: "bg-yellow-500",
  low: "bg-green-500", info: "bg-cyan-500"
}

const sec = (title: string, body: React.ReactNode, extra = "") => (
  <div className={`mb-3 p-2.5 border border-white/10 rounded bg-white/[0.02] ${extra}`}>
    <div className="text-[11px] tracking-widest text-stone-500 mb-2">{title}</div>
    {body}
  </div>
)

export const GeoIntelligenceConsole = ({ data, loading }: geo_console_props) => {
  const [tab, set_tab] = useState("overview")

  if (loading || !data) return (
    <div className="w-full min-h-[400px] flex items-center justify-center font-mono text-stone-500 text-xs">
      <span className="animate-pulse">loading regional intelligence...</span>
    </div>
  )

  const net = data.risk.score / 100
  const risk_color = net > 0.7 ? "bg-red-500" : net > 0.4 ? "bg-amber-500" : "bg-green-500"

  return (
    <div className="w-full font-mono text-stone-300 p-4">
      
      {}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <span className="text-[13px] font-bold tracking-widest text-stone-200">regional intelligence</span>
          <select className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-xs text-stone-400 outline-none ml-2">
            <option>{data.scope.label}</option>
          </select>
        </div>
        <div className="text-[10px] text-stone-500 flex gap-4">
          <span>generated {data.generated_at.split('t')[0]}</span>
          <span>confidence {Math.round(data.brief.confidence * 100)}%</span>
          <span>scoring v2.4</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        
        {}
        <div className="flex flex-col">
          {sec("regime", (
            <div>
              <div className="text-[15px] font-semibold text-stone-200 capitalize">{data.risk.level} risk posture</div>
              <div className="text-[11px] text-stone-500 mt-1">was: {data.risk.previous_score} · driver: {data.risk.drivers[0]}</div>
            </div>
          ))}

          {sec("balance vector", (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-stone-500 mb-1">pressures</div>
                  {data.risk.pressures?.map(x => (
                    <div key={x.label} className="grid grid-cols-[60px_24px_1fr] gap-2 items-center mb-1">
                      <span className="text-[10px] text-stone-400">{x.label}</span>
                      <span className="text-[10px] tabular-nums">{x.value.toFixed(2)}</span>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${x.color}`} style={{ width: `${x.value * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-[10px] text-stone-500 mb-1">buffers</div>
                  {data.risk.buffers?.map(x => (
                    <div key={x.label} className="grid grid-cols-[60px_24px_1fr] gap-2 items-center mb-1">
                      <span className="text-[10px] text-stone-400">{x.label}</span>
                      <span className="text-[10px] tabular-nums">{x.value.toFixed(2)}</span>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${x.color}`} style={{ width: `${x.value * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-[60px_24px_1fr] gap-2 items-center pt-2 border-t border-white/10 mt-1">
                <span className="text-[10px] text-stone-400 font-semibold">net score</span>
                <span className="text-[10px] tabular-nums font-semibold">{net.toFixed(2)}</span>
                <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
                  <div className={`absolute left-0 top-0 bottom-0 ${risk_color}`} style={{ width: `${net * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {}
        <div className="flex flex-col">
          {sec("actors & markets", (
            <div className="flex flex-col">
              {[...data.markets, ...data.crypto].slice(0, 6).map(a => {
                const delta = a.change_pct
                const d_col = delta > 0 ? "text-red-400" : delta < 0 ? "text-cyan-400" : "text-stone-500"
                const d_str = delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)
                return (
                  <div key={a.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center py-1.5 border-b border-dashed border-white/10 last:border-0">
                    <div>
                      <div className="text-[11px] font-medium text-stone-200">{a.name.toLowerCase()}</div>
                      <div className="text-[9px] text-stone-500">{a.relevance.toLowerCase()}</div>
                    </div>
                    <div className="text-[10px] tabular-nums">{a.price}</div>
                    <div className={`text-[9px] tabular-nums min-w-[36px] text-right ${d_col}`}>{d_str}</div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {}
        <div className="flex flex-col">
          {sec("narrative brief", (
            <div className="flex flex-col gap-2">
              <div className="text-[10px] text-stone-500 uppercase tracking-widest">situation assessment</div>
              <div className="text-[11px] leading-relaxed text-stone-300">{data.brief.summary.toLowerCase()}</div>
              
              <div className="text-[10px] text-stone-500 uppercase tracking-widest mt-2">risk outlook</div>
              <div className="text-[11px] leading-relaxed text-stone-300">{data.brief.why_it_matters.toLowerCase()}</div>
              
              <div className="text-[10px] text-stone-500 uppercase tracking-widest mt-2">drivers</div>
              {data.brief.drivers.map(d => (
                <div key={d} className="text-[10px] flex gap-2"><span className="text-stone-600">▸</span> {d.toLowerCase()}</div>
              ))}
            </div>
          ))}

          {sec("transmission health", (
            <div className="flex flex-col">
              {data.source_health.source_groups.map(g => (
                <div key={g.name} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center py-1.5 border-b border-dashed border-white/10 last:border-0">
                  <div>
                    <div className="text-[11px] font-medium text-stone-200">{g.name.toLowerCase()}</div>
                  </div>
                  <div className="text-[10px] tabular-nums text-stone-400">{g.count} nodes</div>
                  <div className={`text-[9px] uppercase ${g.status === 'live' ? 'text-green-500' : 'text-amber-500'}`}>{g.status}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {}
        <div className="flex flex-col">
          {sec("watchlist triggers", (
            <div className="flex flex-col">
              {data.events.slice(0, 6).map(e => (
                <div key={e.id} className="py-1.5 border-b border-dashed border-white/10 last:border-0 text-[10px]">
                  <div className="flex gap-2 mb-0.5">
                    <span className={sev_c[e.severity] || "text-stone-500"}>●</span>
                    <span className="text-stone-200">{e.title.toLowerCase()}</span>
                  </div>
                  <div className="flex justify-between pl-4 text-stone-500">
                    <span>{e.location_name.toLowerCase()}</span>
                    <span>{e.source_name.toLowerCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {data.correlations.length > 0 && sec("correlations", (
            <div className="flex flex-col gap-1">
              {data.correlations.map(c => (
                <div key={c.id} className="text-[10px]">
                  <span className="text-stone-400">▸</span> {c.interpretation.toLowerCase()}
                </div>
              ))}
            </div>
          ), "border-purple-500/30 bg-purple-500/[0.02]")}
        </div>

      </div>
    </div>
  )
}

