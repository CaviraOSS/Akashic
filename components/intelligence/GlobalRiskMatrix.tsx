


import { useEffect, useState } from "react"

export const GlobalRiskMatrix = ({ onClose }: { onClose: ()=>void }) => {
  const [scores, setScores] = useState<any[]>([])
  const [correlations, setCorrelations] = useState<any[]>([])
  const [stats, setStats] = useState({ assets: 0, entities: 0 })
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"risk"|"correlations">("risk")

  const fetch_data = async () => {
    setLoading(true)
    try {
      const [rRes, cRes] = await Promise.all([
        fetch("/api/analytics/risk"),
        fetch("/api/analytics/correlations")
      ])
      const rData = await rRes.json()
      const cData = await cRes.json()
      
      setScores(rData.scores || [])
      setStats({ assets: rData.total_assets || 0, entities: rData.total_entities || 0 })
      setCorrelations(cData.correlations || [])
    } catch(e) {}
    setLoading(false)
  }

  useEffect(() => { fetch_data() }, [])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/90 pointer-events-auto" onClick={onClose} />
      
      <div className="relative w-[95vw] max-w-[1400px] h-[90vh] bg-[#050505] border border-orange-900/50 shadow-[0_0_80px_rgba(249,115,22,0.15)] flex flex-col pointer-events-auto font-mono text-stone-300 rounded-xl overflow-hidden">
        
        {}
        <div className="flex justify-between items-center bg-[#0a0a0a] border-b border-orange-900/50 p-3 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">GLOBAL RISK ENGINE</span>
            </div>
            <div className="flex border border-stone-800 rounded overflow-hidden">
              <button onClick={()=>setView("risk")} className={`px-3 py-1 text-[10px] font-bold uppercase transition-colors ${view==="risk"?'bg-orange-900/40 text-orange-400':'bg-[#111] text-stone-500 hover:text-stone-300'}`}>Systemic Risk</button>
              <button onClick={()=>setView("correlations")} className={`px-3 py-1 text-[10px] font-bold uppercase transition-colors ${view==="correlations"?'bg-fuchsia-900/40 text-fuchsia-400':'bg-[#111] text-stone-500 hover:text-stone-300'}`}>Cross-Domain Correlations</button>
            </div>
          </div>
          <button onClick={fetch_data} className="text-[10px] text-stone-500 hover:text-orange-400 border border-stone-800 hover:border-orange-900/50 px-2 py-1 rounded transition-colors mr-2">RE-CALCULATE</button>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#110500] to-[#050505]">
          
          {loading ? (
             <div className="w-full h-full flex flex-col items-center justify-center gap-4">
               <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
               <div className="text-xs font-bold text-orange-500 uppercase tracking-widest animate-pulse">COMPUTING MULTI-DIMENSIONAL RISK...</div>
             </div>
          ) : view === "risk" ? (
             <div className="flex flex-col gap-6">
                
                {}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-[#0a0a0a] border border-stone-800 p-3 rounded flex flex-col">
                    <span className="text-[10px] text-stone-500 uppercase font-bold">MONITORED ASSETS</span>
                    <span className="text-2xl font-bold text-stone-200">{stats.assets.toLocaleString()}</span>
                  </div>
                  <div className="bg-[#0a0a0a] border border-stone-800 p-3 rounded flex flex-col">
                    <span className="text-[10px] text-stone-500 uppercase font-bold">MONITORED ENTITIES</span>
                    <span className="text-2xl font-bold text-stone-200">{stats.entities.toLocaleString()}</span>
                  </div>
                  <div className="bg-[#0a0a0a] border border-orange-900/30 p-3 rounded flex flex-col">
                    <span className="text-[10px] text-orange-500 uppercase font-bold">CRITICAL THREATS</span>
                    <span className="text-2xl font-bold text-orange-400">{scores.filter(s=>s.severity==="critical").length}</span>
                  </div>
                  <div className="bg-[#0a0a0a] border border-red-900/30 p-3 rounded flex flex-col">
                    <span className="text-[10px] text-red-500 uppercase font-bold">RISING VELOCITY</span>
                    <span className="text-2xl font-bold text-red-400">{scores.filter(s=>s.trend==="rising").length}</span>
                  </div>
                </div>

                {}
                <div className="grid grid-cols-1 gap-3">
                  {scores.length === 0 ? (
                    <div className="text-center text-stone-500 py-10 uppercase text-xs">NO ACTIVE RISK SCORES</div>
                  ) : scores.map(s => {
                    let col = "text-yellow-500"
                    let bcol = "border-yellow-900/30"
                    let bgcol = "bg-yellow-900/10"
                    if(s.severity === "critical") { col="text-orange-500"; bcol="border-orange-500/50"; bgcol="bg-orange-500/10" }
                    else if(s.severity === "high") { col="text-red-500"; bcol="border-red-900/50"; bgcol="bg-red-900/10" }

                    return (
                      <div key={s.id} className={`flex items-stretch bg-[#0a0a0a] border ${bcol} rounded overflow-hidden`}>
                        {}
                        <div className={`w-24 flex flex-col items-center justify-center ${bgcol} border-r ${bcol} p-2`}>
                          <span className={`text-2xl font-bold ${col}`}>{s.score.toFixed(0)}</span>
                          <span className="text-[8px] uppercase font-bold text-stone-400">RISK INDEX</span>
                        </div>
                        
                        {}
                        <div className="flex-1 p-3 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-[10px] font-bold text-stone-500 uppercase mb-0.5">{s.entity ? "ENTITY" : s.asset ? "ASSET" : "EVENT"}</div>
                              <div className="text-sm font-bold text-stone-200">{s.entity?.name || s.asset?.name || s.event?.title}</div>
                            </div>
                            <div className="flex items-center gap-2">
                               <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${s.trend==="rising"?'bg-red-900/30 text-red-500':'bg-stone-800 text-stone-400'}`}>
                                 {s.trend} (V:{s.velocity.toFixed(0)})
                               </span>
                            </div>
                          </div>
                          <div className="text-[11px] text-stone-400 mt-2">{s.explanation}</div>
                        </div>

                        {}
                        <div className="w-64 border-l border-stone-800 p-3 flex flex-col justify-center gap-2">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-stone-500 uppercase">Veracity Conf.</span>
                            <span className="text-cyan-400 font-bold">{s.confidence.toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-1 bg-stone-900 rounded overflow-hidden">
                             <div className="h-full bg-cyan-500" style={{width: `${s.confidence}%`}}></div>
                          </div>

                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-stone-500 uppercase">Velocity Index</span>
                            <span className="text-red-400 font-bold">{s.velocity.toFixed(1)}</span>
                          </div>
                          <div className="w-full h-1 bg-stone-900 rounded overflow-hidden">
                             <div className="h-full bg-red-500" style={{width: `${s.velocity}%`}}></div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
             </div>
          ) : (
             <div className="flex flex-col gap-6">
               <div className="text-xs font-bold text-fuchsia-500 uppercase tracking-widest border-b border-fuchsia-900/30 pb-2 flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-ping"></span>
                 ACTIVE CROSS-DOMAIN CORRELATIONS
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {correlations.length === 0 ? (
                    <div className="col-span-2 text-center text-stone-500 py-10 uppercase text-xs">NO SIGNIFICANT CORRELATIONS DETECTED IN LAST 48 HOURS</div>
                 ) : correlations.map((c, i) => (
                    <div key={i} className="bg-[#0a0a0a] border border-fuchsia-900/40 rounded-xl p-4 flex flex-col gap-4 shadow-lg shadow-fuchsia-900/10">
                      
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2 items-center">
                          <span className="text-[10px] font-bold bg-stone-800 text-stone-300 px-2 py-0.5 rounded uppercase">{c.domain_a}</span>
                          <span className="text-stone-500 text-xs">⟷</span>
                          <span className="text-[10px] font-bold bg-stone-800 text-stone-300 px-2 py-0.5 rounded uppercase">{c.domain_b}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[14px] font-bold text-fuchsia-400">{c.confidence.toFixed(1)}%</span>
                          <span className="text-[8px] text-stone-500 uppercase">CONFIDENCE</span>
                        </div>
                      </div>

                      <div className="text-sm font-bold text-stone-200 border-l-2 border-fuchsia-500 pl-3 leading-snug">
                        {c.description}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-[#111] border border-stone-800 p-2 rounded">
                          <div className="text-[8px] text-stone-500 uppercase mb-1">NODE A</div>
                          <div className="text-[10px] text-stone-300 line-clamp-2">{c.event_a.title}</div>
                        </div>
                        <div className="bg-[#111] border border-stone-800 p-2 rounded">
                          <div className="text-[8px] text-stone-500 uppercase mb-1">NODE B</div>
                          <div className="text-[10px] text-stone-300 line-clamp-2">{c.event_b.title}</div>
                        </div>
                      </div>
                      
                      <button className="mt-2 text-[9px] font-bold text-stone-400 border border-stone-800 hover:border-fuchsia-500 hover:text-fuchsia-400 transition-colors py-1.5 rounded uppercase tracking-widest">
                        OPEN IN INVESTIGATION CANVAS
                      </button>
                    </div>
                 ))}
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  )
}
