


import { useEffect, useState, useRef } from "react"
import Draggable from "react-draggable"

export const InvestigationCanvas = ({ onClose }: { onClose: ()=>void }) => {
  const [invs, setInvs] = useState<any[]>([])
  const [activeInv, setActiveInv] = useState<any>(null)
  const [veracity, setVeracity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<"workspace"|"disinfo">("workspace")
  const [campaigns, setCampaigns] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/investigations/workspace")
      .then(r=>r.json())
      .then(d=>{ setInvs(d.investigations||[]); setLoading(false) })
      .catch(console.error)
  }, [])

  const load_inv = async(id:string)=>{
    setLoading(true)
    try {
      const res = await fetch(`/api/investigations/workspace?id=${id}`)
      const d = await res.json()
      setActiveInv(d.investigation)
      
      
      if(d.investigation?.events?.length > 0){
        const vres = await fetch(`/api/investigations/veracity?event_id=${d.investigation.events[0].event_id}`)
        const vd = await vres.json()
        setVeracity(vd.matrix)
      } else {
        setVeracity(null)
      }
    } catch(e){}
    setLoading(false)
  }

  const load_disinfo = async()=>{
    setLoading(true)
    setMode("disinfo")
    setActiveInv(null)
    try {
      const res = await fetch(`/api/investigations/veracity?mode=disinfo`)
      const d = await res.json()
      setCampaigns(d.campaigns||[])
    } catch(e){}
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/95 pointer-events-auto" onClick={onClose} />
      <div className="relative w-[95vw] h-[95vh] bg-[#050505] border border-cyan-900/50 shadow-[0_0_80px_rgba(8,145,178,0.15)] flex flex-col pointer-events-auto overflow-hidden font-mono text-stone-300 rounded-xl">
        
        {}
        <div className="flex justify-between items-center bg-[#0a0a0a] border-b border-cyan-900/50 p-3 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">AKASHIC WORKSPACE</span>
            </div>
            <div className="flex border border-stone-800 rounded overflow-hidden">
              <button onClick={()=>{setMode("workspace"); setActiveInv(null)}} className={`px-3 py-1 text-[10px] font-bold uppercase transition-colors ${mode==="workspace"?'bg-cyan-900/40 text-cyan-400':'bg-[#111] text-stone-500 hover:text-stone-300'}`}>Investigations</button>
              <button onClick={load_disinfo} className={`px-3 py-1 text-[10px] font-bold uppercase transition-colors ${mode==="disinfo"?'bg-red-900/40 text-red-400':'bg-[#111] text-stone-500 hover:text-stone-300'}`}>Disinfo Radar</button>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">✕</button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {}
          <div className="w-[320px] bg-[#0a0a0a] border-r border-cyan-900/30 flex flex-col shrink-0">
            {mode === "workspace" && (
              <>
                <div className="p-3 border-b border-stone-800 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">ACTIVE CASES</span>
                  <button className="text-[10px] bg-cyan-900/30 text-cyan-400 px-2 py-0.5 border border-cyan-800 rounded hover:bg-cyan-900/60">+ NEW</button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {loading && !activeInv ? (
                     <div className="text-[10px] text-stone-600 text-center py-4 uppercase">SYNCING DB...</div>
                  ) : invs.length === 0 ? (
                     <div className="text-[10px] text-stone-600 text-center py-4 uppercase">NO ACTIVE CASES</div>
                  ) : invs.map(inv => (
                    <div key={inv.id} onClick={()=>load_inv(inv.id)} className={`p-2 rounded border cursor-pointer transition-all ${activeInv?.id === inv.id ? 'bg-[#111] border-cyan-500 shadow-[inset_2px_0_0_#06b6d4]' : 'bg-[#0f0f0f] border-stone-800 hover:border-stone-600'}`}>
                      <div className="text-[11px] font-bold text-stone-200 line-clamp-1">{inv.title}</div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[9px] text-stone-500 uppercase">{inv.status}</span>
                        <span className="text-[8px] text-stone-600">{new Date(inv.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {mode === "disinfo" && (
              <>
                <div className="p-3 border-b border-stone-800">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">STATE-SPONSORED ANOMALIES</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {loading ? (
                    <div className="text-[10px] text-stone-600 text-center py-4 uppercase animate-pulse">RUNNING BAYESIAN SWEEP...</div>
                  ) : campaigns.length === 0 ? (
                    <div className="text-[10px] text-green-600 text-center py-4 uppercase">NO CAMPAIGNS DETECTED (48H)</div>
                  ) : campaigns.map((c,i) => (
                    <div key={i} className="p-2 bg-[#111] border border-red-900/50 rounded flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-red-400 uppercase">CLUSTER {i+1}</span>
                        <span className="text-[9px] bg-red-900/30 text-red-400 px-1 rounded">{c.instances} SIGS</span>
                      </div>
                      <div className="text-[10px] text-stone-300 line-clamp-3">{c.text}</div>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[8px] text-stone-500">SRC: {c.unique_sources}</span>
                        <span className="text-[8px] text-stone-500">CRED: {c.credibility.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {}
          <div className="flex-1 bg-[#050505] relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0a0a0a] to-[#000]">
            
            {}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            
            {loading && activeInv && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="text-xs font-bold text-cyan-500 uppercase tracking-widest animate-pulse">RECONSTRUCTING TIMELINE...</div>
              </div>
            )}

            {!activeInv && mode === "workspace" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-[11px] text-stone-600 uppercase tracking-widest border border-stone-800 p-4 rounded bg-[#0a0a0a]">SELECT AN INVESTIGATION TO OPEN CANVAS</div>
              </div>
            )}

            {activeInv && (
              <div className="relative w-full h-full p-4 overflow-auto">
                
                {}
                <div className="absolute top-4 left-4 z-40 bg-[#0a0a0a] border border-cyan-900/50 rounded p-3 w-[300px] shadow-lg shadow-black/50">
                  <div className="text-sm font-bold text-cyan-400 mb-1">{activeInv.title}</div>
                  <div className="text-[10px] text-stone-400 leading-relaxed mb-3">{activeInv.description}</div>
                  
                  <div className="flex gap-4 border-t border-stone-800 pt-2">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-stone-500 uppercase">EVENTS</span>
                      <span className="text-sm font-bold text-white">{activeInv.events?.length || 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-stone-500 uppercase">CLAIMS</span>
                      <span className="text-sm font-bold text-white">{activeInv.claims?.length || 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-stone-500 uppercase">ENTITIES</span>
                      <span className="text-sm font-bold text-white">{activeInv.entities?.length || 0}</span>
                    </div>
                  </div>
                </div>

                {}
                <div className="relative w-[3000px] h-[3000px]">
                  
                  {}
                  {activeInv.events?.map((ev:any, i:number) => (
                    <Draggable key={ev.event_id} defaultPosition={{x: 350, y: 50 + (i*150)}}>
                      <div className="absolute w-[280px] bg-[#111] border-l-2 border-l-red-500 border border-stone-800 rounded shadow-xl cursor-move p-2 z-20">
                        <div className="text-[8px] text-red-500 font-bold uppercase mb-1">EVENT NODE</div>
                        <div className="text-[10px] text-stone-200">{ev.event.title}</div>
                        <div className="text-[9px] text-stone-500 mt-1">{new Date(ev.event.start_time).toLocaleString()}</div>
                      </div>
                    </Draggable>
                  ))}

                  {}
                  {activeInv.claims?.map((cl:any, i:number) => {
                    const claim = cl.claim
                    
                    const ver = veracity?.find((v:any) => v.claim_id === claim.id)
                    const conf = ver ? Math.round(ver.posterior_prob * 100) : Math.round(claim.confidence)
                    
                    let color = "text-yellow-500"
                    let bcolor = "border-yellow-500/50"
                    if(conf > 75) { color = "text-green-500"; bcolor = "border-green-500/50" }
                    if(conf < 30) { color = "text-red-500"; bcolor = "border-red-500/50" }

                    return (
                      <Draggable key={cl.claim_id} defaultPosition={{x: 700 + (i%2)*300, y: 100 + Math.floor(i/2)*160}}>
                        <div className={`absolute w-[260px] bg-[#0a0a0a] border ${bcolor} rounded shadow-xl cursor-move flex flex-col z-10`}>
                          <div className="flex justify-between items-center p-2 border-b border-stone-800 bg-[#111]">
                            <div className="text-[8px] font-bold uppercase tracking-widest text-stone-400">CLAIM NODE</div>
                            <div className={`text-[9px] font-bold ${color}`}>{conf}% VERACITY</div>
                          </div>
                          <div className="p-2 text-[10px] text-stone-300 leading-snug">
                            "{claim.summary || claim.text}"
                          </div>
                          {ver && ver.contradicts.length > 0 && (
                            <div className="px-2 pb-2">
                              <span className="text-[8px] bg-red-900/30 text-red-400 px-1 py-0.5 rounded uppercase font-bold">CONTRADICTION DETECTED</span>
                            </div>
                          )}
                        </div>
                      </Draggable>
                    )
                  })}

                  {}
                  {activeInv.entities?.map((en:any, i:number) => (
                    <Draggable key={en.entity_id} defaultPosition={{x: 50 + (i*100), y: 400 + (i*50)}}>
                      <div className="absolute w-[150px] bg-[#0a0a0a] border-t-2 border-t-cyan-500 border border-stone-800 rounded shadow-xl cursor-move p-2 z-30">
                        <div className="text-[8px] text-cyan-500 font-bold uppercase mb-1">{en.entity.type}</div>
                        <div className="text-[10px] text-stone-200 font-bold truncate">{en.entity.name}</div>
                      </div>
                    </Draggable>
                  ))}

                </div>
              </div>
            )}

            {mode === "disinfo" && !loading && campaigns.length > 0 && (
               <div className="w-full h-full flex items-center justify-center">
                  <div className="w-[80%] max-w-[800px] bg-[#111] border border-red-900/50 p-6 rounded-xl shadow-2xl shadow-red-900/20">
                    <div className="text-xl font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-3">
                      <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                      ACTIVE DISINFORMATION CAMPAIGN DETECTED
                    </div>
                    <div className="text-sm text-stone-300 mb-6">The Bayesian anomaly detector has found {campaigns[0].instances} identical claims pushed across {campaigns[0].unique_sources} separate sources within a tightly clustered timeframe. The computed credibility score for this cluster is {campaigns[0].credibility.toFixed(1)}%.</div>
                    
                    <div className="bg-[#0a0a0a] border border-stone-800 p-4 rounded">
                      <div className="text-[10px] text-stone-500 uppercase mb-2">IDENTICAL PAYLOAD:</div>
                      <div className="text-sm font-mono text-stone-200 border-l-2 border-red-500 pl-3">
                        "{campaigns[0].text}"
                      </div>
                    </div>
                    
                    <button className="mt-6 bg-red-900/30 border border-red-800 text-red-400 px-4 py-2 rounded text-[11px] font-bold tracking-widest hover:bg-red-900/60 transition-colors">
                      PROMOTE TO INVESTIGATION WORKSPACE
                    </button>
                  </div>
               </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
