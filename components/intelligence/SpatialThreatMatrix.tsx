


import { useEffect, useState } from "react"

export const SpatialThreatMatrix = ({ onClose }: { onClose: ()=>void }) => {
  const [warnings, setWarnings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"collisions"|"proximity">("collisions")
  
  
  const [targetLat, setTargetLat] = useState("48.8566")
  const [targetLng, setTargetLng] = useState("2.3522")
  const [radius, setRadius] = useState("100")
  const [proxData, setProxData] = useState<any>(null)
  const [proxLoading, setProxLoading] = useState(false)

  const fetch_trajectories = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/spatial/trajectory?hours=2.0&radius=50.0")
      const d = await res.json()
      setWarnings(d.warnings || [])
    } catch(e) {}
    setLoading(false)
  }

  const run_proximity = async () => {
    setProxLoading(true)
    try {
      const res = await fetch(`/api/spatial/proximity?lat=${targetLat}&lng=${targetLng}&radius=${radius}`)
      const d = await res.json()
      setProxData(d.data)
    } catch(e) {}
    setProxLoading(false)
  }

  useEffect(() => { fetch_trajectories() }, [])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/90 pointer-events-auto" onClick={onClose} />
      
      <div className="relative w-[90vw] max-w-[1200px] h-[85vh] bg-[#050505] border border-red-900/50 shadow-[0_0_80px_rgba(220,38,38,0.15)] flex flex-col pointer-events-auto font-mono text-stone-300 rounded-xl overflow-hidden">
        
        {}
        <div className="flex justify-between items-center bg-[#0a0a0a] border-b border-red-900/50 p-3 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-xs font-bold text-red-500 uppercase tracking-widest">SPATIAL THREAT MATRIX</span>
            </div>
            <div className="flex border border-stone-800 rounded overflow-hidden">
              <button onClick={()=>setView("collisions")} className={`px-3 py-1 text-[10px] font-bold uppercase transition-colors ${view==="collisions"?'bg-red-900/40 text-red-400':'bg-[#111] text-stone-500 hover:text-stone-300'}`}>Kinematic Collisions</button>
              <button onClick={()=>setView("proximity")} className={`px-3 py-1 text-[10px] font-bold uppercase transition-colors ${view==="proximity"?'bg-cyan-900/40 text-cyan-400':'bg-[#111] text-stone-500 hover:text-stone-300'}`}>Radius Proximity</button>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">✕</button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {}
          <div className="flex-1 p-4 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#110505] to-[#050505]">
            
            {view === "collisions" && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-red-900/30 pb-2">
                  <div className="text-[10px] text-stone-400 uppercase tracking-widest">Extrapolated Trajectory Intersections (Next 2 Hours)</div>
                  <button onClick={fetch_trajectories} className="text-[9px] bg-red-900/30 text-red-400 px-2 py-1 rounded border border-red-800 hover:bg-red-900/60 transition-colors">RE-SCAN RADAR</button>
                </div>

                {loading ? (
                  <div className="w-full h-32 flex items-center justify-center">
                    <div className="text-xs font-bold text-red-500 uppercase tracking-widest animate-pulse">SOLVING KINEMATIC EQUATIONS...</div>
                  </div>
                ) : warnings.length === 0 ? (
                  <div className="w-full h-32 flex items-center justify-center">
                    <div className="text-xs font-bold text-green-500 uppercase tracking-widest">ZERO SPATIAL COLLISIONS DETECTED</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {warnings.map((w,i)=>(
                      <div key={i} className="bg-[#0a0a0a] border border-red-900/50 rounded-lg p-3 relative overflow-hidden group hover:border-red-500 transition-colors">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full group-hover:bg-red-500/20 transition-colors"></div>
                        
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded">{w.asset_type}</span>
                            <span className="text-xs font-bold text-stone-200">{w.identifier}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] font-bold text-red-500">T-MINUS {(w.time_to_impact_hours * 60).toFixed(0)} MINS</div>
                            <div className="text-[8px] text-stone-500 uppercase">TIME TO IMPACT</div>
                          </div>
                        </div>

                        <div className="border-l-2 border-red-500 pl-2 mb-3">
                          <div className="text-[10px] text-stone-500 uppercase mb-0.5">INTERSECTING TARGET</div>
                          <div className="text-xs text-stone-300 font-bold line-clamp-1">{w.event_title}</div>
                        </div>

                        <div className="flex gap-4 border-t border-stone-800 pt-2">
                          <div className="flex flex-col">
                            <span className="text-[8px] text-stone-500 uppercase">IMPACT LAT</span>
                            <span className="text-[10px] font-mono text-cyan-400">{w.collision_lat.toFixed(4)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] text-stone-500 uppercase">IMPACT LNG</span>
                            <span className="text-[10px] font-mono text-cyan-400">{w.collision_lng.toFixed(4)}</span>
                          </div>
                          <div className="flex flex-col ml-auto text-right">
                            <span className="text-[8px] text-stone-500 uppercase">RISK SCORE</span>
                            <span className="text-[10px] font-bold text-red-500">{w.risk_score}/100</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {view === "proximity" && (
              <div className="flex flex-col gap-4">
                <div className="bg-[#0a0a0a] border border-cyan-900/50 rounded-lg p-4 flex items-end gap-4 shadow-lg">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[9px] text-stone-500 uppercase font-bold tracking-widest">Latitude</label>
                    <input type="text" value={targetLat} onChange={e=>setTargetLat(e.target.value)} className="bg-[#111] border border-stone-800 rounded px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-cyan-500 transition-colors" />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[9px] text-stone-500 uppercase font-bold tracking-widest">Longitude</label>
                    <input type="text" value={targetLng} onChange={e=>setTargetLng(e.target.value)} className="bg-[#111] border border-stone-800 rounded px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-cyan-500 transition-colors" />
                  </div>
                  <div className="flex flex-col gap-1 w-32">
                    <label className="text-[9px] text-stone-500 uppercase font-bold tracking-widest">Radius (km)</label>
                    <input type="number" value={radius} onChange={e=>setRadius(e.target.value)} className="bg-[#111] border border-stone-800 rounded px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-cyan-500 transition-colors" />
                  </div>
                  <button onClick={run_proximity} disabled={proxLoading} className="bg-cyan-900/30 border border-cyan-800 text-cyan-400 h-[34px] px-6 rounded text-[10px] font-bold tracking-widest hover:bg-cyan-900/60 transition-colors disabled:opacity-50">
                    {proxLoading ? 'SCANNING...' : 'EXECUTE SCAN'}
                  </button>
                </div>

                {proxData && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    
                    {}
                    <div className="flex flex-col gap-2">
                      <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest border-b border-red-900/30 pb-1">ANOMALY EVENTS ({proxData.events.length})</div>
                      <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                        {proxData.events.map((e:any)=>(
                          <div key={e.id} className="bg-[#0a0a0a] border border-stone-800 p-2 rounded">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[8px] font-bold text-red-500 uppercase">{e.severity}</span>
                              <span className="text-[9px] text-cyan-400">{e.distance_km.toFixed(1)} km</span>
                            </div>
                            <div className="text-[10px] text-stone-300 line-clamp-2">{e.title}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {}
                    <div className="flex flex-col gap-2">
                      <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest border-b border-yellow-900/30 pb-1">INFRA ASSETS ({proxData.assets.length})</div>
                      <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                        {proxData.assets.map((a:any)=>(
                          <div key={a.id} className="bg-[#0a0a0a] border border-stone-800 p-2 rounded">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[8px] font-bold text-yellow-500 uppercase">{a.type}</span>
                              <span className="text-[9px] text-cyan-400">{a.distance_km.toFixed(1)} km</span>
                            </div>
                            <div className="text-[10px] text-stone-300">{a.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {}
                    <div className="flex flex-col gap-2">
                      <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest border-b border-blue-900/30 pb-1">FLIGHT VECTORS ({proxData.flights.length})</div>
                      <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                        {proxData.flights.map((f:any)=>(
                          <div key={f.id} className="bg-[#0a0a0a] border border-stone-800 p-2 rounded">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[8px] font-bold text-blue-500 uppercase">{f.callsign || f.icao_hex}</span>
                              <span className="text-[9px] text-cyan-400">{f.distance_km.toFixed(1)} km</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-[8px] text-stone-500">SPD: {f.speed}kt</span>
                              <span className="text-[8px] text-stone-500">HDG: {f.heading}°</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {}
                    <div className="flex flex-col gap-2">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest border-b border-emerald-900/30 pb-1">MARITIME VECTORS ({proxData.vessels.length})</div>
                      <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                        {proxData.vessels.map((v:any)=>(
                          <div key={v.id} className="bg-[#0a0a0a] border border-stone-800 p-2 rounded">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[8px] font-bold text-emerald-500 uppercase">{v.vessel?.name || v.imo || "VESSEL"}</span>
                              <span className="text-[9px] text-cyan-400">{v.distance_km.toFixed(1)} km</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-[8px] text-stone-500">SPD: {v.speed}kt</span>
                              <span className="text-[8px] text-stone-500">HDG: {v.heading}°</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
