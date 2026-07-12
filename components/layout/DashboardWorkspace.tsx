"use client"
import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

export type PanelType = 'map' | 'timeline' | 'feed' | 'risk_card' | 'entity_card' | 'claim_table' | 'alerts' | 'cyber' | 'infrastructure' | 'watchlist'

interface Panel {
  id: string
  type: PanelType
  title: string
  w: number
  h: number
}

interface DashboardTemplate {
  id: string
  name: string
  panels: Panel[]
}

const TEMPLATES: DashboardTemplate[] = [
  {
    id: 'global_crisis', name: 'GLOBAL CRISIS DASHBOARD',
    panels: [
      { id: 'p1', type: 'map', title: 'TACTICAL MAP', w: 8, h: 4 },
      { id: 'p2', type: 'alerts', title: 'GLOBAL ALERTS', w: 4, h: 4 },
      { id: 'p3', type: 'timeline', title: 'EVENT TIMELINE', w: 12, h: 2 }
    ]
  },
  {
    id: 'maritime_risk', name: 'MARITIME RISK DASHBOARD',
    panels: [
      { id: 'p1', type: 'infrastructure', title: 'CHOKEPOINTS & PORTS', w: 12, h: 3 },
      { id: 'p2', type: 'map', title: 'VESSEL TRACKING', w: 9, h: 5 },
      { id: 'p3', type: 'watchlist', title: 'SANCTIONED VESSELS', w: 3, h: 5 }
    ]
  },
  {
    id: 'cyber_threat', name: 'CYBER THREAT DASHBOARD',
    panels: [
      { id: 'p1', type: 'cyber', title: 'ACTIVE IOCS', w: 6, h: 4 },
      { id: 'p2', type: 'feed', title: 'SIGINT FEED', w: 6, h: 4 },
      { id: 'p3', type: 'risk_card', title: 'CRITICAL INFRASTRUCTURE RISK', w: 12, h: 2 }
    ]
  },
  {
    id: 'sanctions_comp', name: 'SANCTIONS & COMPLIANCE',
    panels: [
      { id: 'p1', type: 'entity_card', title: 'SDN TARGET PROFILE', w: 4, h: 5 },
      { id: 'p2', type: 'map', title: 'ASSET NETWORK', w: 8, h: 5 },
      { id: 'p3', type: 'claim_table', title: 'GLOBAL LIST HITS', w: 12, h: 3 }
    ]
  }
]


let ds = {
  alerts: [] as any[],
  feed: [] as string[],
  iocs: [] as any[],
  vessels: [] as any[],
  evts: [] as any[],
  sanc: [] as any[]
}
let sub_cb: (() => void)[] = []
const ping_subs = () => sub_cb.forEach(c => c())

if (typeof window !== 'undefined') {
  const r_ip = () => `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
  const r_imo = () => `imo ${Math.floor(Math.random() * 9000000 + 1000000)}`
  const lvls = ['high', 'med', 'low']
  const msgs = ['unauthorized access attempt', 'bso anomaly detected', 'vessel ping lost', 'rf intercept burst', 'pcap signature match', 'target deviation']
  const lists = ['OFAC', 'EU', 'UK HMT', 'UN', 'SECO']
  const r_ent = () => `ent_${Math.floor(Math.random() * 900000 + 100000)}`


  for (let i = 0; i < 150; i++) {
    ds.alerts.push({ id: i, time: new Date(Date.now() - i * 60000).toISOString().slice(11, 19) + 'z', msg: msgs[i % msgs.length] + ' ref_' + Math.floor(Math.random() * 1000), lvl: lvls[i % lvls.length] })
    ds.feed.push(`> recv: intercept_${i} [sig: ${(Math.random() * 100).toFixed(1)}%] payload: 0x${Math.floor(Math.random() * 100000000).toString(16)}`)
    ds.iocs.push({ ip: r_ip(), hits: Math.floor(Math.random() * 900) })
    ds.vessels.push({ imo: r_imo(), flag: ['PAN', 'LBR', 'MHL', 'USA', 'CHN'][i % 5] })
    ds.evts.push({ id: i, time: new Date(Date.now() - i * 3600000).toISOString().slice(11, 16) + 'z', val: Math.random() * 100 })
    ds.sanc.push({ id: i, ent: r_ent(), list: lists[i % lists.length], prog: `[${['IRAN', 'RUSSIA', 'DPRK', 'CYBER'][i % 4]}]`, match: Math.floor(Math.random() * 20 + 80) })
  }

  setInterval(() => {
    ds.alerts.unshift({ id: Date.now(), time: new Date().toISOString().slice(11, 19) + 'z', msg: msgs[Math.floor(Math.random() * msgs.length)] + ' ref_' + Math.floor(Math.random() * 1000), lvl: lvls[Math.floor(Math.random() * lvls.length)] })
    ds.feed.unshift(`> recv: intercept_${Date.now() % 1000} [sig: ${(Math.random() * 100).toFixed(1)}%] payload: 0x${Math.floor(Math.random() * 100000000).toString(16)}`)
    ds.iocs.unshift({ ip: r_ip(), hits: Math.floor(Math.random() * 100) })
    ds.vessels.unshift({ imo: r_imo(), flag: ['PAN', 'LBR', 'MHL', 'USA', 'CHN'][Math.floor(Math.random() * 5)] })
    ds.evts.unshift({ id: Date.now(), time: new Date().toISOString().slice(11, 16) + 'z', val: Math.random() * 100 })
    ds.sanc.unshift({ id: Date.now(), ent: r_ent(), list: lists[Math.floor(Math.random() * lists.length)], prog: `[${['IRAN', 'RUSSIA', 'DPRK', 'CYBER'][Math.floor(Math.random() * 4)]}]`, match: Math.floor(Math.random() * 20 + 80) })

    if (ds.alerts.length > 200) ds.alerts.pop()
    if (ds.feed.length > 200) ds.feed.pop()
    if (ds.iocs.length > 200) ds.iocs.pop()
    if (ds.vessels.length > 200) ds.vessels.pop()
    if (ds.evts.length > 200) ds.evts.pop()
    if (ds.sanc.length > 200) ds.sanc.pop()
    ping_subs()
  }, 400)
}

const use_ds = () => {
  const [, f] = useState({})
  useEffect(() => {
    const c = () => f({})
    sub_cb.push(c)
    return () => { sub_cb = sub_cb.filter(x => x !== c) }
  }, [])
  return ds
}



const alerts_mod = () => (
  <div className="flex flex-col gap-2 p-2 h-full overflow-y-auto">
    {use_ds().alerts.map((a: any) => (
      <div key={a.id} className={`text-xs border-l-2 p-1.5 bg-[#111] ${a.lvl === "high" ? "border-rose-500 text-rose-300" : a.lvl === "med" ? "border-amber-500 text-amber-300" : "border-blue-500 text-blue-300"}`}>
        <span className="opacity-50 mr-2">[{a.time}]</span> {a.msg}
      </div>
    ))}
  </div>
)

const timeline_mod = () => (
  <div className="flex gap-4 p-2 h-full items-center overflow-x-auto whitespace-nowrap">
    {use_ds().evts.slice(0, 50).map((e: any) => (
      <div key={e.id} className="flex flex-col gap-1 min-w-[120px]">
        <div className="text-[10px] text-[#555]">{e.time}</div>
        <div className="w-full h-1 bg-[#222] rounded"><div className="h-full bg-emerald-500 rounded transition-all" style={{ width: `${e.val}%` }} /></div>
        <div className="text-[9px] text-[#888] truncate">evt_{e.id.toString(16).slice(-6)}</div>
      </div>
    ))}
  </div>
)

const watchlist_mod = () => (
  <div className="flex flex-col p-2 h-full overflow-y-auto gap-1 text-xs">
    {use_ds().vessels.map((v: any, i: number) => (
      <div key={i} className="flex justify-between items-center p-1 hover:bg-[#1a1a1a] cursor-pointer border-b border-[#222]">
        <span className="text-[#aaa]">{v.imo} <span className="opacity-50 text-[10px]">[{v.flag}]</span></span>
        <span className="text-[9px] px-1 bg-[#222] text-rose-400 rounded">track</span>
      </div>
    ))}
  </div>
)

const cyber_mod = () => (
  <div className="flex flex-col p-2 h-full overflow-y-auto gap-1 text-[10px] font-mono">
    <div className="text-emerald-500 mb-1 sticky top-0 bg-black/80 backdrop-blur pb-1">:: active indicators of compromise</div>
    {use_ds().iocs.map((v: any, i: number) => (
      <div key={i} className="flex gap-2 text-[#777] border-b border-[#111]">
        <span className="text-rose-500 w-16">[{v.hits} hits]</span>
        <span className="text-[#ccc]">{v.ip}</span>
      </div>
    ))}
  </div>
)

const infra_mod = () => (
  <div className="grid grid-cols-3 gap-2 p-2 h-full items-center">
    {['suez', 'panama', 'hormuz'].map((c, i) => (
      <div key={i} className="border border-[#222] p-2 flex flex-col items-center justify-center bg-[#0a0a0a]">
        <span className="text-xs text-[#888] uppercase">{c}</span>
        <span className="text-lg text-emerald-400 font-bold">{Math.floor(use_ds().vessels.length / 3) + i * 12} vessels</span>
      </div>
    ))}
  </div>
)

const risk_mod = () => {
  const s = use_ds().alerts[0]?.id % 100 || 92
  return (
    <div className="flex p-4 h-full items-center justify-center gap-6">
      <div className="relative w-16 h-16 rounded-full border-4 border-[#222] flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-rose-500 border-t-transparent animate-spin" />
        <span className="text-xl font-bold text-rose-500">{s}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-rose-400 uppercase tracking-widest">critical threat level</span>
        <span className="text-[10px] text-[#666]">multiple cascading failures imminent</span>
      </div>
    </div>
  )
}

const feed_mod = () => (
  <div className="flex flex-col h-full overflow-y-auto p-2 gap-1 text-[10px]">
    {use_ds().feed.map((f: string, i: number) => (
      <div key={i} className="text-[#444] font-mono whitespace-nowrap">
        {f}
      </div>
    ))}
  </div>
)

const entity_card_mod = () => {
  const s = use_ds().sanc[0] || { ent: 'N/A', match: 0 }
  return (
    <div className="flex flex-col p-4 h-full gap-4 text-xs">
      <div className="flex justify-between items-start border-b border-[#333] pb-2">
        <div className="flex flex-col">
          <span className="text-[#666] tracking-widest uppercase text-[10px]">primary identifier</span>
          <span className="text-rose-400 font-bold text-lg">{s.ent}</span>
        </div>
        <div className="px-2 py-1 bg-rose-900/30 text-rose-500 rounded border border-rose-900 text-[10px] uppercase">sdn target</div>
      </div>
      <div className="flex flex-col gap-1 text-[#888]">
        <div className="flex justify-between"><span>fuzzy match score:</span> <span className="text-emerald-400">{s.match}%</span></div>
        <div className="flex justify-between"><span>known aliases:</span> <span>14</span></div>
        <div className="flex justify-between"><span>linked assets:</span> <span>3 vessels, 1 corp</span></div>
      </div>
      <div className="mt-auto h-16 w-full border border-[#222] bg-[#0a0a0a] flex items-center justify-center text-[10px] text-[#444]">
        [ linked assets locked ]
      </div>
    </div>
  )
}

const claim_table_mod = () => (
  <div className="flex flex-col h-full">
    <div className="flex text-[10px] text-[#666] border-b border-[#222] p-2 tracking-widest uppercase bg-[#050505]">
      <div className="w-24">timestamp</div>
      <div className="w-24">entity id</div>
      <div className="w-20">list source</div>
      <div className="w-24">program</div>
      <div className="flex-1">match confidence</div>
    </div>
    <div className="flex flex-col overflow-y-auto p-2 gap-1">
      {use_ds().sanc.slice(0, 30).map((s: any) => (
        <div key={s.id} className="flex text-xs items-center hover:bg-[#111] p-1 border-b border-[#111] transition-colors cursor-pointer">
          <div className="w-24 text-[#555]">{s.id.toString().slice(-8)}z</div>
          <div className="w-24 text-rose-400 font-mono">{s.ent}</div>
          <div className="w-20 text-[#888]">{s.list}</div>
          <div className="w-24 text-amber-400/70">{s.prog}</div>
          <div className="flex-1 flex items-center gap-2">
            <div className="w-32 h-1.5 bg-[#222] rounded"><div className={`h-full rounded ${s.match > 90 ? 'bg-rose-500' : s.match > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${s.match}%` }} /></div>
            <span className="text-[10px] text-[#555]">{s.match}%</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)

const render_mod = (type: PanelType, children: React.ReactNode) => {
  switch (type) {
    case 'map': return children
    case 'alerts': return alerts_mod()
    case 'timeline': return timeline_mod()
    case 'watchlist': return watchlist_mod()
    case 'cyber': return cyber_mod()
    case 'infrastructure': return infra_mod()
    case 'risk_card': return risk_mod()
    case 'feed': return feed_mod()
    case 'entity_card': return entity_card_mod()
    case 'claim_table': return claim_table_mod()
    default:
      return (
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <span className="text-[10px] text-[#555] tracking-widest uppercase">{type} MODULE</span>
        </div>
      )
  }
}

export function DashboardWorkspace({ children, onClose }: { children: React.ReactNode, onClose?: () => void }) {
  const [active_template, set_active_template] = useState<string>('global_crisis')
  const [menu_open, set_menu_open] = useState(false)

  const template = TEMPLATES.find(t => t.id === active_template) || TEMPLATES[0]

  return (
    <div className="absolute inset-0 z-[100] pointer-events-none flex flex-col font-mono bg-black">
      { }
      <div className="h-12 bg-[#050505]/90 backdrop-blur border-b border-[#333] flex items-center px-4 justify-between pointer-events-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={() => set_menu_open(!menu_open)}
            className="text-xs font-bold text-emerald-500 hover:text-emerald-400 border border-emerald-900/50 hover:border-emerald-500 px-3 py-1 rounded bg-[#111]"
          >
            [ MENU ]
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs font-bold text-rose-500 hover:text-rose-400 border border-rose-900/50 hover:border-rose-500 px-3 py-1 rounded bg-[#111]"
            >
              [ EXIT ]
            </button>
          )}
          <div className="flex flex-col">
            <span className="text-[10px] text-[#666] tracking-[0.2em] uppercase">Active Workspace</span>
            <span className="text-xs font-bold text-white tracking-widest">{template.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-[#888] tracking-widest uppercase">Layer 16: Telemetry Active</span>
          </div>
        </div>
      </div>

      { }
      <AnimatePresence>
        {menu_open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute top-12 left-4 w-80 bg-[#0a0a0a]/95 backdrop-blur-md border border-[#333] shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 pointer-events-auto rounded flex flex-col p-2 gap-2"
          >
            <div className="text-[10px] text-[#666] uppercase tracking-widest mb-2 px-2 border-b border-[#222] pb-2">Workspace Templates</div>
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => { set_active_template(t.id); set_menu_open(false) }}
                className={`text-left px-3 py-2 text-xs font-bold tracking-widest rounded transition-colors ${active_template === t.id ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-900/50' : 'text-[#888] hover:text-white hover:bg-[#111] border border-transparent'}`}
              >
                {t.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      { }
      <div className="flex-1 p-4 pointer-events-auto overflow-hidden flex flex-col gap-4">
        { }
        <div className="flex-1 grid grid-cols-12 gap-4 auto-rows-fr">
          {template.panels.map(p => (
            <div
              key={p.id}
              className={`bg-[#050505]/80 backdrop-blur border border-[#333] rounded overflow-hidden flex flex-col`}
              style={{ gridColumn: `span ${p.w}`, gridRow: `span ${p.h}` }}
            >
              <div className="h-6 bg-[#111] border-b border-[#222] flex items-center px-3 justify-between">
                <span className="text-[9px] font-bold text-[#888] tracking-[0.2em] uppercase">{p.title}</span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#333]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#333]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#333]" />
                </div>
              </div>
              <div className="flex-1 relative overflow-hidden pointer-events-auto bg-[#000]">
                {render_mod(p.type, children)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

