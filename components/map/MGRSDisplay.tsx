"use client";

import { useEffect, useState } from "react";

interface PositionFix {
    mgrs: string;
    lat: number;
    lon: number;
    altMeters: number;
    accuracyMeters: number;
    fixType: string;
    sats: string;
}

const COORDS = [
    { mgrs: "38T NK 52841 37492", lat: "34.3749°N", lon: "36.5284°E", alt: "412m", acc: "±2m" },
    { mgrs: "38T NK 52903 37511", lat: "34.3751°N", lon: "36.5290°E", alt: "408m", acc: "±1m" },
    { mgrs: "38T NK 52867 37488", lat: "34.3748°N", lon: "36.5287°E", alt: "415m", acc: "±3m" },
    { mgrs: "37T FH 81204 62847", lat: "34.6284°N", lon: "32.8120°E", alt: "38m", acc: "±2m" },
];

export default function MGRSDisplay({ fix }: { fix?: PositionFix | null }) {
    const [idx, setIdx] = useState(0);
    const [time, setTime] = useState("");
    const [date, setDate] = useState("");
    const [fading, setFading] = useState(false);

    useEffect(() => {
        const tick = () => {
            const n = new Date();
            const hh = String(n.getUTCHours()).padStart(2, "0");
            const mm = String(n.getUTCMinutes()).padStart(2, "0");
            const ss = String(n.getUTCSeconds()).padStart(2, "0");
            setTime(`${hh}:${mm}:${ss}Z`);
            setDate(n.toISOString().slice(0, 10));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const id = setInterval(() => {
            setFading(true);
            setTimeout(() => { setIdx((p) => (p + 1) % COORDS.length); setFading(false); }, 180);
        }, 5000);
        return () => clearInterval(id);
    }, []);

    const c = COORDS[idx];
    const latTxt = fix ? `${Math.abs(fix.lat).toFixed(4)}°${fix.lat >= 0 ? "N" : "S"}` : c.lat;
    const lonTxt = fix ? `${Math.abs(fix.lon).toFixed(4)}°${fix.lon >= 0 ? "E" : "W"}` : c.lon;
    const altTxt = fix ? `${Math.round(fix.altMeters)}m` : c.alt;
    const accTxt = fix ? `±${Math.max(1, Math.round(fix.accuracyMeters))}m` : c.acc;
    const mgrsTxt = fix ? fix.mgrs : c.mgrs;
    const fixTypeTxt = fix?.fixType || "3D-DGPS";
    const satsTxt = fix?.sats || "12/14";

    return (
        <div className="bg-m3-surface border border-m3-outline-variant shadow-panel-sm rounded-panel w-[232px] overflow-hidden text-m3-on-surface">
            {}
            <div className="px-[14px] py-[10px] border-b border-m3-outline-variant">
                <div className="flex items-center gap-2">
                    <div className="rounded-full w-[8px] h-[8px] bg-m3-primary" />
                    <span className="text-[0.68rem] font-medium text-m3-on-surface">Position Fix</span>
                </div>
                <div className="mt-1">
                    <span className="font-mono text-[0.52rem] text-m3-on-surface-variant uppercase tracking-wider">GPS · INS</span>
                </div>
            </div>

            {}
            <div className="px-[14px] pt-[12px] pb-[10px] border-b border-m3-outline-variant">
                <div className="font-sans text-[0.5rem] font-medium text-m3-on-surface-variant uppercase tracking-wider mb-1">MGRS GRID</div>
                <div
                    className="font-mono font-bold text-base text-m3-on-surface tracking-[0.06em] transition-opacity duration-[180ms]"
                    style={{ opacity: fading ? 0 : 1 }}
                >
                    {mgrsTxt}
                </div>
            </div>

            {}
            <div className="px-[14px] py-[10px] grid grid-cols-3 gap-2 border-b border-m3-outline-variant">
                {[
                    { label: "LAT", value: latTxt },
                    { label: "LON", value: lonTxt },
                    { label: "ALT", value: altTxt },
                ].map((item) => (
                    <div key={item.label}>
                        <div className="font-sans text-[0.5rem] font-medium text-m3-on-surface-variant uppercase tracking-wider mb-[3px]">{item.label}</div>
                        <div
                            className="font-mono text-[0.6rem] text-m3-on-surface transition-opacity duration-[180ms]"
                            style={{ opacity: fading ? 0 : 1 }}
                        >
                            {item.value}
                        </div>
                    </div>
                ))}
            </div>

            {}
            <div className="px-[14px] py-[10px] flex justify-between border-b border-m3-outline-variant">
                <div>
                    <div className="font-sans text-[0.5rem] font-medium text-m3-on-surface-variant uppercase tracking-wider mb-[3px]">ACCURACY</div>
                    <div
                        className="font-mono text-[0.62rem] text-m3-on-surface transition-opacity duration-[180ms]"
                        style={{ opacity: fading ? 0 : 1 }}
                    >
                        {accTxt}
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-sans text-[0.5rem] font-medium text-m3-on-surface-variant uppercase tracking-wider mb-[3px]">FIX TYPE</div>
                    <div className="font-mono text-[0.62rem] text-m3-on-surface">{fixTypeTxt}</div>
                </div>
            </div>

            {}
            <div className="px-[14px] py-[10px] flex justify-between items-center border-b border-m3-outline-variant">
                <div>
                    <div className="font-sans text-[0.5rem] font-medium text-m3-on-surface-variant uppercase tracking-wider mb-[3px]">UTC TIME</div>
                    <div className="font-mono font-medium text-[0.85rem] text-m3-on-surface tracking-[0.04em]">
                        {time}
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-sans text-[0.5rem] font-medium text-m3-on-surface-variant uppercase tracking-wider mb-[3px]">DATE</div>
                    <div className="font-mono text-[0.6rem] text-m3-on-surface-variant">{date}</div>
                </div>
            </div>

            {}
            <div className="px-[14px] py-[8px] bg-m3-surface-container flex justify-between rounded-b-panel">
                <span className="font-mono text-[0.5rem] text-m3-on-surface-variant">WGS84 · DATUM</span>
                <span className="font-mono text-[0.5rem] text-m3-on-surface-variant">SATS: {satsTxt}</span>
            </div>
        </div>
    );
}
