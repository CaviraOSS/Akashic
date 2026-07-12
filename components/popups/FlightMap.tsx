"use client"

import { useEffect } from "react"
import { geo_intel_event } from "@/lib/geo-intelligence/types"

export const FlightMap = ({ events, onClose }: { events: geo_intel_event[], onClose: () => void }) => {
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "auto" }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-10 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-5xl bg-[#0a0a0a] border border-[#333] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222] bg-[#111]">
          <span className="text-sm font-bold text-blue-400 tracking-widest uppercase flex items-center gap-2">
            ◎ Live Aviation Telemetry
          </span>
          <button onClick={onClose} className="p-1 hover:bg-[#222] rounded text-stone-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>
        <div className="flex-1 w-full h-full p-4 overflow-y-auto bg-[#0a0a0a] flex flex-col gap-4 font-mono text-xs">
          <div className="grid grid-cols-12 gap-4 text-stone-500 uppercase tracking-widest border-b border-[#222] pb-2 font-bold px-2">
            <div className="col-span-3">Callsign & Origin</div>
            <div className="col-span-3">Coordinates</div>
            <div className="col-span-2">Altitude</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Time</div>
          </div>
          {events.length === 0 ? (
             <div className="text-stone-500 text-center py-10">No active telemetry available.</div>
          ) : events.map(e => (
            <div key={e.id} className="grid grid-cols-12 gap-4 bg-[#111] border border-[#222] rounded p-3 hover:border-blue-500/50 transition-colors items-center">
               <div className="col-span-3 flex flex-col">
                 <span className="text-white font-bold">{e.title.replace('RADAR: Flight', '').trim()}</span>
                 <span className="text-[9px] text-stone-500">{e.id.split('-')[1]} (ICAO24)</span>
               </div>
               <div className="col-span-3 flex flex-col">
                 <span className="text-stone-300">{e.lat?.toFixed(4)}, {e.lng?.toFixed(4)}</span>
                 <span className="text-[9px] text-stone-500">LAT/LNG</span>
               </div>
               <div className="col-span-2 flex flex-col">
                 <span className="text-blue-400 font-bold">{e.summary.split('|')[0]}</span>
                 <span className="text-[9px] text-stone-500">{e.summary.split('|')[1]}</span>
               </div>
               <div className="col-span-2">
                 <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider">
                   AIRBORNE
                 </span>
               </div>
               <div className="col-span-2 flex flex-col items-end">
                 <span className="text-stone-400">{new Date(e.published_at).toLocaleTimeString()}</span>
                 <span className="text-[9px] text-green-500">LIVE FEED</span>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
