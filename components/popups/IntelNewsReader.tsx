"use client"

import { useEffect } from "react"
import { geo_intel_event } from "@/lib/geo-intelligence/types"

export const IntelNewsReader = ({ title, events, onClose }: { title: string, events: geo_intel_event[], onClose: () => void }) => {
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "auto" }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-10 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-4xl bg-[#0a0a0a] border border-[#333] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222] bg-[#111]">
          <span className="text-sm font-bold text-[#0ea5e9] tracking-widest uppercase flex items-center gap-2">
            ⚠ Intel Feed: {title}
          </span>
          <button onClick={onClose} className="p-1 hover:bg-[#222] rounded text-stone-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>
        <div className="flex-1 w-full h-full p-4 overflow-y-auto bg-[#0a0a0a] flex flex-col gap-4 font-mono">
          {events.length === 0 ? (
             <div className="text-stone-500 text-center py-10">No intelligence intercepts available for this sector.</div>
          ) : events.map(e => (
            <div key={e.id} className="bg-[#111] border border-[#222] rounded p-4 flex flex-col gap-2 hover:border-[#444] transition-colors">
               <div className="flex justify-between items-start">
                 <div className="flex flex-col gap-1">
                   <span className="text-[10px] text-stone-500 uppercase tracking-widest flex gap-2 items-center">
                     <span className="bg-white/10 px-1.5 py-0.5 rounded text-stone-300">{e.source_name}</span>
                     <span>{new Date(e.published_at).toLocaleString()}</span>
                   </span>
                   <h3 className="text-sm font-bold text-stone-200 leading-snug">{e.title}</h3>
                 </div>
                 {e.severity === 'critical' && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Critical</span>}
               </div>
               <p className="text-xs text-stone-400 leading-relaxed mt-2 border-l-2 border-[#333] pl-3">{e.summary}</p>
               {e.source_url && (
                 <a href={e.source_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 mt-2 flex items-center gap-1 w-fit">
                   Verify Source ↗
                 </a>
               )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
