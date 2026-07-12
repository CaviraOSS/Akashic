"use client";

import type { TacticalCityIntel } from "@/components/map/MapGlobe";
import ReactMarkdown from "react-markdown";

const DANGER_COLOR: Record<string, string> = {
    low: "#86efac",
    medium: "#fcd34d",
    high: "#fb923c",
    critical: "#ef4444",
    unknown: "#d1d5db",
};

export default function IntelDetailsSidebar({ intel, onClose }: { intel: TacticalCityIntel | null; onClose: () => void; }) {
    if (!intel) return null;

    const severity = intel.severity || "unknown";
    const color = DANGER_COLOR[severity] || DANGER_COLOR.unknown;

    return (
        <div className="bg-m3-surface border border-m3-outline-variant shadow-panel-sm rounded-panel flight-sidebar w-[340px] max-h-[88vh] overflow-y-auto text-m3-on-surface">
            <div className="px-3.5 py-3 relative border-b border-m3-outline-variant bg-stone-950/40">
                <div className="flex items-center gap-2">
                    <div className="rounded-full w-[8px] h-[8px] animate-pulse" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
                    <span className="text-[0.78rem] font-bold text-m3-on-surface tracking-wide uppercase">{intel.title}</span>
                </div>
                <div className="mt-1.5 flex gap-1.5 flex-wrap">
                    <span className="text-[0.5rem] font-semibold inline-flex px-2 py-0.5 rounded-tag border" style={{ color, borderColor: `${color}55`, backgroundColor: `${color}18` }}>
                        {severity.toUpperCase()}
                    </span>
                    <span className="text-[0.5rem] font-semibold text-m3-on-surface-variant bg-m3-surface-container inline-flex px-2 py-0.5 rounded-tag border border-m3-outline">
                        {intel.type.toUpperCase()}
                    </span>
                    <span className="text-[0.5rem] font-semibold text-m3-on-surface-variant bg-m3-surface-container inline-flex px-2 py-0.5 rounded-tag border border-m3-outline text-red-400">
                        {intel.status.toUpperCase()}
                    </span>
                </div>
                <button onClick={onClose} className="absolute right-2.5 top-2.5 bg-transparent border-none text-m3-on-surface-variant cursor-pointer text-xs p-1 hover:text-m3-on-surface">✕</button>
            </div>

            <div className="p-3">
                <div className="relative mb-3 h-32 w-full rounded-[calc(1rem-0.5rem)] border border-white/10 bg-black overflow-hidden" 
                     style={{
                        background: `
                            repeating-linear-gradient(0deg, transparent, transparent 10px, ${color}20 10px, ${color}20 11px),
                            repeating-linear-gradient(90deg, transparent, transparent 10px, ${color}20 10px, ${color}20 11px),
                            radial-gradient(circle at center, ${color}30 0%, transparent 70%)
                        `,
                        backgroundColor: "#050505"
                     }}>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-70">
                        {intel.type === "shooting" ? (
                            <div className="flex items-center justify-center gap-4">
                                <div className="relative w-20 h-20 rounded-full border border-current" style={{ color }}>
                                    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-current opacity-50" />
                                    <div className="absolute left-1/2 top-0 w-[1px] h-full bg-current opacity-50" />
                                    <div className="absolute inset-3 rounded-full border border-current border-dashed animate-[spin_4s_linear_infinite]" />
                                    <div className="absolute inset-[35%] rounded-full bg-current animate-ping opacity-20" />
                                </div>
                                <div className="flex flex-col text-[8px] font-mono opacity-80" style={{ color }}>
                                    <span>TRGT ACQUIRED</span>
                                    <span>CONF: 89.4%</span>
                                    <span>RAD: 400M</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4" style={{ color }}>
                                <div className="relative w-16 h-20 border border-current bg-current/5 flex flex-col p-1 gap-1">
                                    <div className="w-full h-1 bg-current opacity-80" />
                                    <div className="w-3/4 h-1 bg-current opacity-40" />
                                    <div className="w-full h-1 bg-current opacity-40" />
                                    <div className="w-5/6 h-1 bg-current opacity-40" />
                                    <div className="mt-auto w-full h-4 bg-current/20 flex items-end justify-between p-[1px]">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="w-1 bg-current animate-pulse" 
                                                style={{ 
                                                    height: `${Math.random() * 100}%`, 
                                                    animationDelay: `${i * 0.15}s`,
                                                    animationDuration: `${Math.random() * 0.5 + 0.8}s` 
                                                }} />
                                        ))}
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-current animate-[bounce_2s_infinite]" />
                                </div>
                                <div className="flex flex-col text-[8px] font-mono opacity-80">
                                    <span>OSINT MATCH</span>
                                    <span>SRC: NEWS API</span>
                                    <span>NLP: PASS</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="absolute inset-0 rounded-[calc(1rem-0.5rem)] mix-blend-overlay" style={{ backgroundColor: `${color}05` }} />
                    <span className="absolute bottom-2 right-2 rounded border bg-black/80 px-2 py-1 font-mono text-[10px]" style={{ color, borderColor: `${color}40` }}>{intel.status}</span>
                </div>

                <div className="text-xs font-mono text-stone-400 space-y-2">
                    <div className="flex justify-between border-b border-stone-800 pb-1">
                        <span>LATITUDE</span><span className="text-stone-200">{intel.lat.toFixed(4)}°</span>
                    </div>
                    <div className="flex justify-between border-b border-stone-800 pb-1">
                        <span>LONGITUDE</span><span className="text-stone-200">{intel.lng.toFixed(4)}°</span>
                    </div>
                    <div className="flex justify-between border-b border-stone-800 pb-1">
                        <span>CITY JURISDICTION</span><span className="text-stone-200">{intel.city || "UNKNOWN"}</span>
                    </div>
                    <div className="flex justify-between border-b border-stone-800 pb-1">
                        <span>DETECTED BY</span><span className="text-stone-200">{intel.type === "shooting" ? "LOCAL NEWS / POLICE SCANNER" : "OSINT WEB SCRAPER"}</span>
                    </div>
                </div>

                {intel.story && (
                    <div className="mt-4 border-l-2 border-stone-500 bg-stone-900/40 p-2.5 text-xs text-stone-300 prose prose-invert prose-p:my-1 prose-a:text-cyan-400 hover:prose-a:text-cyan-300">
                        <ReactMarkdown>{intel.story}</ReactMarkdown>
                    </div>
                )}

                <div className="mt-4 border border-red-500/20 bg-red-500/5 p-2 text-[0.6rem] text-red-400 font-mono">
                    WARNING: THIS IS A LIVE TACTICAL FEED. DATA MAY BE INCOMPLETE OR UNVERIFIED BY FIELD AGENTS.
                </div>
            </div>
        </div>
    );
}
