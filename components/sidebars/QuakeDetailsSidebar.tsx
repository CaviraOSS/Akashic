"use client";

import type { TacticalQuake } from "@/components/map/MapGlobe";

const fmt = (v: number | null | undefined, d = 2) => v === null || v === undefined || !Number.isFinite(v) ? "n/a" : v.toFixed(d);
const whole = (v: number | null | undefined) => v === null || v === undefined || !Number.isFinite(v) ? "n/a" : Math.round(v).toLocaleString();

function row(label: string, value: string) {
    return (
        <div key={label} className="flex justify-between gap-3 px-3.5 py-1.5">
            <span className="text-[0.55rem] font-medium uppercase tracking-wider text-m3-on-surface-variant">{label}</span>
            <span className="font-mono text-[0.62rem] text-right max-w-[180px] break-all text-m3-on-surface">{value}</span>
        </div>
    );
}

const DANGER_COLOR: Record<string, string> = {
    low: "#86efac",
    elevated: "#fcd34d",
    high: "#fb923c",
    "very high": "#f87171",
    extreme: "#ef4444",
    unknown: "#d1d5db",
};

export default function QuakeDetailsSidebar({ quake, onClose }: { quake: TacticalQuake | null; onClose: () => void; }) {
    if (!quake) return null;

    const danger = quake.danger_level || "unknown";
    const color = DANGER_COLOR[danger] || DANGER_COLOR.unknown;

    return (
        <div className="bg-m3-surface border border-m3-outline-variant shadow-panel-sm rounded-panel flight-sidebar w-[340px] max-h-[88vh] overflow-y-auto text-m3-on-surface">
            <div className="px-3.5 py-3 relative border-b border-m3-outline-variant">
                <div className="flex items-center gap-2">
                    <div className="rounded-full w-[8px] h-[8px]" style={{ backgroundColor: color }} />
                    <span className="text-[0.78rem] font-bold text-m3-on-surface tracking-wide uppercase">{quake.title || quake.place || `QUAKE-${quake.id}`}</span>
                </div>
                <div className="mt-1.5 flex gap-1.5 flex-wrap">
                    <span className="text-[0.5rem] font-semibold inline-flex px-2 py-0.5 rounded-tag border" style={{ color, borderColor: `${color}55`, backgroundColor: `${color}18` }}>
                        {danger.toUpperCase()}
                    </span>
                    <span className="text-[0.5rem] font-semibold text-m3-on-surface-variant bg-m3-surface-container inline-flex px-2 py-0.5 rounded-tag border border-m3-outline">
                        MAG {fmt(quake.mag, 1)}
                    </span>
                </div>
                <button onClick={onClose} className="absolute right-2.5 top-2.5 bg-transparent border-none text-m3-on-surface-variant cursor-pointer text-xs p-1 hover:text-m3-on-surface">✕</button>
            </div>

            <div className="py-2 border-b border-m3-outline-variant">
                {row("location", quake.place || "n/a")}
                {row("latitude", `${fmt(quake.latitude, 4)}°`)}
                {row("longitude", `${fmt(quake.longitude, 4)}°`)}
                {row("depth", `${fmt(quake.depth_km, 1)} km`)}
                {row("danger", danger)}
                {row("damage", quake.expected_damage || "n/a")}
            </div>

            <div className="py-2 border-b border-m3-outline-variant">
                {row("magnitude", fmt(quake.mag, 2))}
                {row("magnitude type", quake.mag_type || "n/a")}
                {row("significance", whole(quake.significance))}
                {row("mmi", fmt(quake.mmi, 2))}
                {row("cdi", fmt(quake.cdi, 2))}
                {row("felt reports", whole(quake.felt_reports))}
                {row("tsunami", quake.tsunami ? "possible" : "no")}
                {row("alert", quake.alert || "none")}
                {row("status", quake.status || "n/a")}
                {row("event type", quake.event_type || "n/a")}
            </div>

            <div className="py-2 border-b border-m3-outline-variant">
                {row("origin time", quake.time ? new Date(quake.time).toISOString() : "n/a")}
                {row("updated", quake.updated ? new Date(quake.updated).toISOString() : "n/a")}
                {row("dmin", fmt(quake.dmin, 3))}
                {row("gap", fmt(quake.gap, 1))}
            </div>

            <div className="py-2">
                {row("event id", quake.id)}
                {row("details", quake.detail_url || "n/a")}
                {row("usgs url", quake.event_url || "n/a")}
            </div>
        </div>
    );
}
