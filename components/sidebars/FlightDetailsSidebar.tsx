"use client";

import { useEffect, useState } from "react";
import type { TacticalFlight } from "@/components/map/MapGlobe";
import { formatDistanceToNow } from "date-fns";

interface DetailedFlightData {
    callsign: string;
    operator: string;
    model: string;
    description: string | null;
    squawk: string | null;
    category: string;
    registration: string;
    origin: string | null;
    originName: string | null;
    destination: string | null;
    destName: string | null;
    photoUrl: string | null;
    photographer: string | null;
    photoLink: string | null;
    oat: number | null;
    tat: number | null;
    mach: number | null;
    tas: number | null;
    ias: number | null;
    windDir: number | null;
    windSpd: number | null;
    navAlt: number | null;
    recentHistory: { callsign: string; origin: string; originName: string; destination: string; destName: string; }[];
}

export default function FlightDetailsSidebar({ flight, onClose }: { flight: TacticalFlight | null; onClose: () => void; }) {
    const [details, setDetails] = useState<DetailedFlightData | null>(null);
    const [loading, setLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        if (!flight) { setDetails(null); return; }
        let active = true;
        setLoading(true);
        setDetails(null);
        fetch(`/api/aircraft/${encodeURIComponent(flight.icao24)}?callsign=${encodeURIComponent(flight.callsign || "")}`)
            .then(res => res.json())
            .then(data => { if (active) { setDetails(data); setLoading(false); } })
            .catch(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [flight?.icao24]);

    if (!flight) return null;

    const alt_m = flight.baroAltitude ?? 0;
    const alt_ft = Math.round(alt_m * 3.281);
    const fl = "FL" + Math.round(alt_m / 30.48).toString().padStart(3, "0");
    const spd_kts = flight.velocity ? Math.round(flight.velocity * 1.944) : 0;
    const vr = flight.verticalRate ?? 0;
    const vrStr = vr > 0.5 ? `↑ ${Math.round(vr * 196.85)} fpm` : vr < -0.5 ? `↓ ${Math.round(Math.abs(vr) * 196.85)} fpm` : "— level";


    const anomalies: string[] = [];
    let isMilitary = false;
    let anomalyScore = 0;


    if (details?.squawk === "7700") anomalies.push("EMERGENCY SQUAWK 7700");
    else if (details?.squawk === "7600") anomalies.push("RADIO FAILURE 7600");
    else if (details?.squawk === "7500") anomalies.push("HIJACKING 7500");
    else if (details?.squawk === "0000" || details?.squawk === "7777") anomalies.push("MILITARY INTERCEPT / INVALID SQUAWK");


    if (alt_ft > 45000 && flight.category !== "MILITARY") anomalies.push("UNUSUAL CIVILIAN ALTITUDE (>45k ft)");
    if (spd_kts > 600 && flight.category !== "MILITARY") anomalies.push("OVERSPEED WARNING (>600kts)");
    if (flight.category === "MILITARY" || details?.operator.toLowerCase().includes("air force") || details?.operator.toLowerCase().includes("navy")) {
        isMilitary = true;
        if (alt_ft > 15000 && alt_ft < 30000 && spd_kts < 300) anomalies.push("POSSIBLE ISR ORBIT DETECTED");
        if (alt_ft > 20000 && spd_kts > 400 && spd_kts < 500) anomalies.push("POSSIBLE AERIAL REFUELING ORBIT");
    }


    if (flight.baroAltitude && details?.navAlt && Math.abs((flight.baroAltitude * 3.281) - details.navAlt) > 2000) {
        anomalies.push(`BARO/NAV DISCREPANCY - POSS SENSOR ANOMALY`);
    }


    const ageSeconds = flight.lastContact ? (Date.now() / 1000) - flight.lastContact : 0;
    if (ageSeconds > 300) anomalies.push(`STALE ADS-B (${Math.round(ageSeconds / 60)}m gap) - POSS DARK FLIGHT`);

    anomalyScore = Math.min(100, anomalies.length * 35);

    const row = (label: string, value: string) => (
        <div key={label} className="flex justify-between items-center px-3.5 py-1.5">
            <span className="font-sans text-[0.55rem] font-medium text-m3-on-surface-variant uppercase tracking-wider">{label}</span>
            <span className="font-mono text-[0.62rem] text-right max-w-[140px] truncate text-m3-on-surface" title={value}>{value}</span>
        </div>
    );

    return (
        <div className="bg-m3-surface border border-m3-outline-variant shadow-panel-sm rounded-panel flight-sidebar w-[280px] max-h-[88vh] overflow-y-auto text-m3-on-surface">
            { }
            <div className={`px-3.5 py-3 relative border-b ${isMilitary ? 'border-red-900/50 bg-red-900/10' : 'border-m3-outline-variant'}`}>
                <div className="flex items-center gap-2">
                    <div className={`rounded-full w-[8px] h-[8px] ${isMilitary ? 'bg-red-500 animate-pulse' : 'bg-m3-primary'}`} />
                    <span className="text-[0.8rem] font-bold text-m3-on-surface tracking-wide uppercase">
                        {(flight.callsign || flight.icao24)}
                    </span>
                    <span className={`text-[0.5rem] font-semibold ml-1 px-2 py-0.5 rounded-tag border ${isMilitary ? 'border-red-500/50 text-red-400 bg-red-900/20' : 'text-m3-on-surface-variant bg-m3-surface-container border-m3-outline'}`}>
                        {isMilitary ? 'MILITARY' : flight.category}
                    </span>
                </div>
                <button onClick={onClose} className="absolute right-2.5 top-2.5 bg-transparent border-none text-m3-on-surface-variant cursor-pointer text-xs p-1 hover:text-m3-on-surface">✕</button>
            </div>

            { }
            {details?.photoUrl && (
                <div className="relative border-b border-m3-outline-variant bg-m3-surface-container">
                    <a href={details.photoLink || "#"} target="_blank" rel="noreferrer">
                        <img src={details.photoUrl} alt="Aircraft" className="w-full max-h-[150px] object-cover block" />
                    </a>
                </div>
            )}

            { }
            {anomalies.length > 0 && (
                <div className="p-3 bg-orange-900/20 border-b border-orange-900/50">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[0.55rem] font-bold text-orange-500 uppercase tracking-widest">Aviation Intel / Anomalies</span>
                        <span className="text-[0.55rem] text-orange-400 font-mono">RISK: {anomalyScore}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        {anomalies.map((a, i) => (
                            <div key={i} className="text-[0.55rem] font-mono text-orange-200 border-l-2 border-orange-500 pl-2 py-0.5">{a}</div>
                        ))}
                    </div>
                </div>
            )}

            { }
            {details && (details.origin || details.destination) && (
                <div className="px-3.5 py-2 bg-m3-surface-container flex justify-between items-center gap-1.5 border-b border-m3-outline-variant">
                    <div className="text-center flex-1 min-w-0">
                        <div className="font-mono text-[0.75rem] text-m3-on-surface font-bold">{details.origin || "???"}</div>
                        <div className="overflow-hidden whitespace-nowrap mt-[-4px] mb-[-4px] w-full">
                            <div className="inline-block pl-full text-[0.45rem] text-m3-on-surface-variant" style={{ animation: "marquee 8s linear infinite" }}>
                                {details.originName || ""}
                            </div>
                        </div>
                    </div>
                    <div className="text-m3-on-surface-variant text-[0.7rem] shrink-0">›</div>
                    <div className="text-center flex-1 min-w-0">
                        <div className="font-mono text-[0.75rem] text-m3-on-surface font-bold">{details.destination || "???"}</div>
                        <div className="overflow-hidden whitespace-nowrap mt-[-4px] mb-[-4px] w-full">
                            <div className="inline-block pl-full text-[0.45rem] text-m3-on-surface-variant" style={{ animation: "marquee 8s linear infinite" }}>
                                {details.destName || ""}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Live telemetry */}
            <div className="py-2 border-b border-m3-outline-variant">
                {row("ICAO HEX", flight.icao24.toUpperCase())}
                {row("STATUS", flight.onGround ? "ON GROUND" : "AIRBORNE")}
                {row("ALTITUDE", flight.onGround ? "GND" : `${fl} · ${alt_ft.toLocaleString()} ft`)}
                {row("SPEED", `${spd_kts} kts`)}
                {row("HEADING", flight.trueTrack !== null ? `${Math.round(flight.trueTrack)}°` : "N/A")}
                {row("VERT RATE", vrStr)}
            </div>

            { }
            <div className="py-2">
                {loading && !details ? (
                    <div className="p-3.5 text-[0.55rem] text-m3-on-surface-variant text-center font-mono">QUERYING INTELLIGENCE SOURCES...</div>
                ) : details ? (
                    <>
                        {row("OPERATOR", (details.operator || "UNKNOWN").toUpperCase())}
                        {row("AIRCRAFT", (details.description || details.model || "UNKNOWN").toUpperCase())}
                        {row("TAIL NO.", details.registration)}
                        {row("SQUAWK", details.squawk || "N/A")}

                        { }
                        {details.mach !== null && row("MACH", `M${details.mach.toFixed(3)}`)}
                        {details.tas !== null && row("TRUE AIRSPEED", `${Math.round(details.tas)} kts`)}
                        {details.oat !== null && row("OAT", `${details.oat}°C`)}
                        {details.windDir !== null && details.windSpd !== null && row("WIND", `${Math.round(details.windDir)}° @ ${Math.round(details.windSpd)} kts`)}
                        {details.navAlt !== null && row("NAV ALT (FMS)", `FL${Math.round(details.navAlt / 100).toString().padStart(3, "0")}`)}
                    </>
                ) : null}
            </div>
            <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }`}</style>
        </div>
    );
}
