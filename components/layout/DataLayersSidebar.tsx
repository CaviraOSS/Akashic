"use client";

import { useState } from "react";

interface Layer {
    id: string;
    label: string;
    sub: string;
    category: string;
    unit: string;
    status: "live" | "delayed" | "offline";
    enabledByDefault: boolean;
    updated: string;
    available?: boolean;
}

const LAYERS: Layer[] = [
    { id: "radar", label: "Global Air Traffic", sub: "ADS-B transponder mesh", category: "GEOINT", unit: "aircraft", status: "live", enabledByDefault: true, updated: "live" },
    { id: "usgs", label: "Global Seismic", sub: "USGS world earthquake feed", category: "MASINT", unit: "events", status: "live", enabledByDefault: true, updated: "live" },
    { id: "tle", label: "Satellite TLE", sub: "Orbital objects and stations", category: "GEOINT", unit: "objects", status: "live", enabledByDefault: true, updated: "live" },
    { id: "noaa", label: "Weather", sub: "Live radar and atmospheric fields", category: "MASINT", unit: "overlay", status: "live", enabledByDefault: false, updated: "live" },
    { id: "gdacs", label: "GDACS Alerts", sub: "Global disaster alert feed", category: "MASINT", unit: "alerts", status: "live", enabledByDefault: false, updated: "live" },
    { id: "airq", label: "Air Quality", sub: "Open-Meteo sampled pollution", category: "MASINT", unit: "cities", status: "live", enabledByDefault: false, updated: "live" },
    { id: "radio", label: "Radio Garden Live", sub: "12k places + verified stream mesh", category: "SIGINT", unit: "stations", status: "live", enabledByDefault: false, updated: "live" },
    { id: "sigint", label: "SIGINT Intercepts", sub: "ADS-B integrity + public OSINT", category: "SIGINT", unit: "signals", status: "live", enabledByDefault: false, updated: "live" },
    { id: "recon", label: "Recon Mode", sub: "Username and email public profile sweep", category: "SIGINT", unit: "hits", status: "live", enabledByDefault: false, updated: "live" },
    { id: "gil", label: "Geo-Intelligence", sub: "Cities, infrastructure, HUMINT & World Monitor", category: "GEOINT", unit: "cities", status: "live", enabledByDefault: false, updated: "live" },
];

const CATS = ["ALL", "GEOINT", "SIGINT", "MASINT"];

const STATUS_DOT: Record<string, string> = {
    live: "dot-live",
    delayed: "dot-delayed",
    offline: "dot-offline",
};
const STATUS_LABEL: Record<string, { text: string; colorClass: string }> = {
    live: { text: "LIVE", colorClass: "text-green" },
    delayed: { text: "DELAYED", colorClass: "text-amber" },
    offline: { text: "OFFLINE", colorClass: "text-m3-outline" },
};

interface SidebarProps {
    layers: Record<string, boolean>;
    onToggle: (id: string) => void;
    radarCount?: number;
    usgsCount?: number;
    radioCount?: number;
    sigintCount?: number;
    gdacsCount?: number;
    airqCount?: number;
    reconCount?: number;
    gilCount?: number;
}

export default function DataLayersSidebar({ layers, onToggle, radarCount, usgsCount, radioCount, sigintCount, gdacsCount, airqCount, reconCount, gilCount }: SidebarProps) {
    const [cat, setCat] = useState("ALL");

    const toggle = (id: string) => onToggle(id);
    const filtered = cat === "ALL" ? LAYERS : LAYERS.filter((l) => l.category === cat);
    const activeCount = Object.values(layers).filter(Boolean).length;

    return (
        <div className="panel-flat flex flex-col h-full bg-m3-surface text-m3-on-surface border-r border-m3-outline-variant/40 w-72 rounded-none border-t-0 border-b-0 border-l-0 shadow-lg relative z-10">
            <div className="px-5 pt-6 pb-4">
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5 opacity-90">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-m3-on-surface">
                            <rect x="0" y="0" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9" />
                            <rect x="8" y="0" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.4" />
                            <rect x="0" y="8" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.4" />
                            <rect x="8" y="8" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.15" />
                        </svg>
                        <span className="text-[0.75rem] font-semibold tracking-[0.08em] text-m3-on-surface">DATA LAYERS</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-[3px] bg-m3-surface-container rounded-md border border-m3-outline-variant/30 shadow-sm">
                        <div className="dot-live w-1.5 h-1.5 opacity-80" />
                        <span className="mono text-[0.45rem] font-bold text-m3-on-surface tracking-widest">SYSTEM LIVE</span>
                    </div>
                </div>
                <div className="text-[0.65rem] text-m3-on-surface-variant tracking-wide font-medium mt-[10px]">
                    {activeCount} OF {LAYERS.length} STREAMS ACTIVE
                </div>
            </div>

            <div className="px-4 pb-4 border-b border-m3-outline-variant/30">
                <div className="flex p-1 bg-m3-surface-container rounded-lg border border-m3-outline-variant/20 shadow-inner">
                    {CATS.map((c) => (
                        <button
                            key={c}
                            onClick={() => setCat(c)}
                            className={`flex-1 py-1.5 text-[0.55rem] font-semibold tracking-widest rounded-md transition-all duration-200 cursor-pointer ${cat === c
                                ? "bg-m3-surface text-m3-on-surface shadow-sm border border-m3-outline-variant/40"
                                : "text-m3-on-surface-variant hover:text-m3-on-surface border border-transparent bg-transparent"
                                }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-3 flight-sidebar">
                <div className="flex flex-col gap-1.5">
                    {filtered.map((layer) => {
                        const on = layers[layer.id];
                        const sl = STATUS_LABEL[layer.status];
                        const canToggle = layer.available !== false;
                        const displayCount =
                            layer.id === "radar" && radarCount !== undefined
                                ? radarCount
                                : layer.id === "usgs" && usgsCount !== undefined
                                    ? usgsCount
                                    : layer.id === "radio" && radioCount !== undefined
                                        ? radioCount
                                        : layer.id === "sigint" && sigintCount !== undefined
                                            ? sigintCount
                                            : layer.id === "gdacs" && gdacsCount !== undefined
                                                ? gdacsCount
                                                : layer.id === "airq" && airqCount !== undefined
                                                    ? airqCount
                                                    : layer.id === "recon" && reconCount !== undefined
                                                        ? reconCount
                                                        : layer.id === "gil" && gilCount !== undefined
                                                            ? gilCount
                                                            : 0;

                        return (
                            <div
                                key={layer.id}
                                onClick={() => {
                                    if (canToggle) toggle(layer.id);
                                }}
                                className={`group relative p-3.5 mx-1 rounded-xl border transition-all duration-300 ${canToggle ? "cursor-pointer" : "cursor-not-allowed opacity-70"} ${on
                                    ? "bg-m3-surface-container border-m3-outline-variant shadow-sm"
                                    : "bg-transparent border-transparent hover:bg-m3-surface-container/40 hover:border-m3-outline-variant/30"
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <span
                                                className={`text-[0.45rem] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${on ? "bg-m3-on-surface text-m3-surface" : "bg-m3-surface-container-high text-m3-on-surface-variant"
                                                    }`}
                                            >
                                                {layer.category}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`${STATUS_DOT[layer.status]} w-1 h-1 transition-opacity ${on ? "opacity-100" : "opacity-30"}`} />
                                                <span className={`mono text-[0.45rem] tracking-widest uppercase transition-colors duration-300 ${on ? sl.colorClass : "text-m3-outline"}`}>
                                                    {sl.text}
                                                </span>
                                            </div>
                                        </div>

                                        <div className={`text-[0.75rem] font-medium mb-1 truncate transition-colors ${on ? "text-m3-on-surface" : "text-m3-on-surface-variant group-hover:text-m3-on-surface"}`}>
                                            {layer.label}
                                        </div>

                                        <div className={`text-[0.6rem] truncate transition-colors ${on ? "text-m3-on-surface-variant" : "text-m3-outline group-hover:text-m3-on-surface-variant"}`}>
                                            {layer.sub}
                                        </div>

                                        <div className={`mt-3 flex items-center gap-1.5 overflow-hidden transition-all duration-300 ${on ? "max-h-8 opacity-100" : "max-h-0 opacity-0"}`}>
                                            <span className="mono font-bold text-[0.75rem] text-m3-on-surface">{displayCount.toLocaleString()}</span>
                                            <span className="text-[0.55rem] text-m3-on-surface-variant uppercase tracking-wider">{layer.unit}</span>
                                            <span className="mono text-[0.5rem] text-m3-outline ml-1">- {layer.updated}</span>
                                        </div>

                                        {!canToggle && <div className="mt-3 text-[0.55rem] uppercase tracking-widest text-m3-outline">unavailable</div>}
                                    </div>

                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                        }}
                                        className="pt-[2px]"
                                    >
                                        <label className="toggle">
                                            <input
                                                type="checkbox"
                                                checked={on}
                                                disabled={!canToggle}
                                                onChange={() => {
                                                    if (canToggle) toggle(layer.id);
                                                }}
                                            />
                                            <span className={`toggle-track transition-opacity duration-300 ${!on ? "opacity-40 group-hover:opacity-80" : "opacity-100"} ${!canToggle ? "opacity-20" : ""}`} />
                                            <span className={`toggle-thumb shadow-sm ${!on ? "opacity-70 group-hover:opacity-100" : ""} ${!canToggle ? "opacity-40" : ""}`} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="px-5 py-[14px] border-t border-m3-outline-variant/30 bg-m3-surface-container/30 flex justify-between items-center backdrop-blur-md">
                <span className="mono text-[0.45rem] font-bold tracking-widest text-m3-outline">INGEST v3.3.0</span>
                <div className="flex items-center gap-2">
                    <div className="w-[5px] h-[5px] rounded-full bg-red shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
                    <span className="mono text-[0.45rem] font-bold tracking-widest text-red">TLP:RED</span>
                </div>
            </div>
        </div>
    );
}
