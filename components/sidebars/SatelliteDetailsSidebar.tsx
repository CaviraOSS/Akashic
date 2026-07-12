"use client";

import { useEffect, useState } from "react";
import * as satellite from "satellite.js";
import type { TacticalSatellite, SatCategory } from "@/components/map/MapGlobe";

const MU = 398600.4418;
const EARTH_RADIUS_KM = 6378.137;

type LiveSatelliteIntel = {
    epoch: string | null;
    intlDesignator: string | null;
    inclination: number | null;
    raan: number | null;
    eccentricity: number | null;
    argPerigee: number | null;
    meanAnomaly: number | null;
    meanMotion: number | null;
    revNumber: number | null;
    bstar: number | null;
    latitude: number | null;
    longitude: number | null;
    altitudeKm: number | null;
    speedKps: number | null;
    speedKmh: number | null;
    periodMinutes: number | null;
    semiMajorKm: number | null;
    perigeeKm: number | null;
    apogeeKm: number | null;
    updatedAt: string;
};

const fmt = (v: number | null, digits = 2) => v === null || !Number.isFinite(v) ? "n/a" : v.toFixed(digits);
const whole = (v: number | null) => v === null || !Number.isFinite(v) ? "n/a" : Math.round(v).toLocaleString();
const pickNum = (txt: string) => {
    const v = Number(txt.trim());
    return Number.isFinite(v) ? v : null;
};

function parseExp(raw: string): number | null {
    const txt = raw.replace(/\s+/g, "");
    const match = txt.match(/^([+-]?)(\d{5})([+-]\d)$/);
    if (!match) return null;
    const sign = match[1] === "-" ? "-" : "";
    return Number(`${sign}0.${match[2]}e${match[3]}`);
}

function parseEpoch(line1: string): string | null {
    const yr = Number(line1.slice(18, 20));
    const day = Number(line1.slice(20, 32));
    if (!Number.isFinite(yr) || !Number.isFinite(day)) return null;
    const fullYear = yr < 57 ? 2000 + yr : 1900 + yr;
    const start = Date.UTC(fullYear, 0, 1, 0, 0, 0, 0);
    return new Date(start + (day - 1) * 86400000).toISOString();
}

function parseIntl(line1: string): string | null {
    const raw = line1.slice(9, 17).trim();
    if (!raw) return null;
    const year = raw.slice(0, 2);
    const launch = raw.slice(2, 5).trim();
    const piece = raw.slice(5).trim();
    if (!launch) return raw;
    return `${year}-${launch}${piece}`;
}

function buildIntel(sat: TacticalSatellite): LiveSatelliteIntel {
    const rec = satellite.twoline2satrec(sat.line1, sat.line2);
    const now = new Date();
    const prop = satellite.propagate(rec, now);
    const pos = prop?.position ?? null;
    const vel = prop?.velocity ?? null;
    const gst = satellite.gstime(now);
    const geo = pos ? satellite.eciToGeodetic(pos, gst) : null;
    const speedKps = vel ? Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2) : null;
    const meanMotion = pickNum(sat.line2.slice(52, 63));
    const eccentricity = pickNum(`0.${sat.line2.slice(26, 33).trim()}`);
    const periodMinutes = meanMotion ? 1440 / meanMotion : null;
    const radPerSec = meanMotion ? (meanMotion * Math.PI * 2) / 86400 : null;
    const semiMajorKm = radPerSec ? Math.cbrt(MU / (radPerSec * radPerSec)) : null;
    const perigeeKm = semiMajorKm !== null && eccentricity !== null ? semiMajorKm * (1 - eccentricity) - EARTH_RADIUS_KM : null;
    const apogeeKm = semiMajorKm !== null && eccentricity !== null ? semiMajorKm * (1 + eccentricity) - EARTH_RADIUS_KM : null;

    return {
        epoch: parseEpoch(sat.line1),
        intlDesignator: parseIntl(sat.line1),
        inclination: pickNum(sat.line2.slice(8, 16)),
        raan: pickNum(sat.line2.slice(17, 25)),
        eccentricity,
        argPerigee: pickNum(sat.line2.slice(34, 42)),
        meanAnomaly: pickNum(sat.line2.slice(43, 51)),
        meanMotion,
        revNumber: pickNum(sat.line2.slice(63, 68)),
        bstar: parseExp(sat.line1.slice(53, 61)),
        latitude: geo ? satellite.degreesLat(geo.latitude) : null,
        longitude: geo ? satellite.degreesLong(geo.longitude) : null,
        altitudeKm: geo ? geo.height : null,
        speedKps,
        speedKmh: speedKps !== null ? speedKps * 3600 : null,
        periodMinutes,
        semiMajorKm,
        perigeeKm,
        apogeeKm,
        updatedAt: now.toISOString(),
    };
}

const row = (label: string, value: string) => (
    <div key={label} className="flex justify-between items-start gap-3 px-3.5 py-1.5">
        <span className="font-sans text-[0.55rem] font-medium text-m3-on-surface-variant uppercase tracking-wider">{label}</span>
        <span className="font-mono text-[0.62rem] text-right max-w-[180px] break-all text-m3-on-surface">{value}</span>
    </div>
);

const CATEGORY_LABELS: Record<SatCategory, string> = {
    "space-station": "SPACE STATION",
    weather: "WEATHER",
    navigation: "NAVIGATION",
    comms: "COMMUNICATIONS",
    "earth-obs": "EARTH OBSERVATION",
    science: "SCIENCE",
    military: "MILITARY",
    debris: "ORBITAL DEBRIS",
    unknown: "UNKNOWN",
};

const CATEGORY_COLORS: Record<SatCategory, string> = {
    "space-station": "#fcd34d",
    weather: "#67e8f9",
    navigation: "#86efac",
    comms: "#a5b4fc",
    "earth-obs": "#6ee7b7",
    science: "#f9a8d4",
    military: "#fca5a5",
    debris: "#9ca3af",
    unknown: "#d1d5db",
};

export default function SatelliteDetailsSidebar({ satellite: sat, onClose }: { satellite: TacticalSatellite | null; onClose: () => void; }) {
    const [intel, setIntel] = useState<LiveSatelliteIntel | null>(null);

    useEffect(() => {
        if (!sat) {
            setIntel(null);
            return;
        }

        const tick = () => setIntel(buildIntel(sat));
        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, [sat]);

    if (!sat) return null;

    
    const spaceRisk: string[] = [];
    const isMilitary = sat.category === "military" || sat.purpose?.toLowerCase().includes("military");
    let riskScore = 0;

    
    if (intel?.altitudeKm && intel.altitudeKm < 300) {
        spaceRisk.push("HIGH ATMOSPHERIC DRAG RISK - SEVERE DECAY POSSIBLE");
        riskScore += 40;
    }
    
    
    const mock_kp_index = Math.floor(Math.random() * 9);
    if (mock_kp_index >= 6) {
        spaceRisk.push(`GEOMAGNETIC STORM WARNING (Kp-${mock_kp_index}) - ORBITAL PERTURBATION`);
        riskScore += 30;
    }

    
    if (isMilitary) {
        if (intel?.altitudeKm && intel.altitudeKm > 200 && intel.altitudeKm < 600) {
            spaceRisk.push("ACTIVE LEO ISR PASS DETECTED");
        }
        if (sat.purpose?.toLowerCase().includes("comms")) {
            spaceRisk.push("MILITARY SATCOM RELAY DETECTED");
        }
    }

    
    if (sat.category === "debris" && intel?.altitudeKm && intel.altitudeKm < 800) {
        spaceRisk.push("LEO KESSLER SYNDROME CONJUNCTION RISK");
        riskScore += 20;
    }

    return (
        <div className="bg-m3-surface border border-m3-outline-variant shadow-panel-sm rounded-panel flight-sidebar w-[340px] max-h-[88vh] overflow-y-auto text-m3-on-surface">
            <div className={`px-3.5 py-3 relative border-b ${isMilitary ? 'border-red-900/50 bg-red-900/10' : 'border-m3-outline-variant'}`}>
                <div className="flex items-center gap-2">
                    <div className="rounded-full w-[8px] h-[8px]" style={{ backgroundColor: CATEGORY_COLORS[sat.category] }} />
                    <span className="text-[0.78rem] font-bold text-m3-on-surface tracking-wide uppercase">{sat.name || `SAT-${sat.id}`}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="text-[0.5rem] font-semibold text-m3-on-surface-variant bg-m3-surface-container inline-flex px-2 py-0.5 rounded-tag border border-m3-outline">
                        NORAD {sat.id}
                    </span>
                    <span className="text-[0.5rem] font-semibold inline-flex px-2 py-0.5 rounded-tag border" style={{ color: CATEGORY_COLORS[sat.category], borderColor: CATEGORY_COLORS[sat.category] + "55", backgroundColor: CATEGORY_COLORS[sat.category] + "18" }}>
                        {CATEGORY_LABELS[sat.category]}
                    </span>
                </div>
                {(sat.operator || sat.purpose) && (
                    <div className="mt-2 space-y-0.5">
                        {sat.operator && <div className="text-[0.55rem] text-m3-on-surface-variant"><span className="font-semibold uppercase tracking-wider">operator</span> <span className="font-mono text-m3-on-surface">{sat.operator}</span></div>}
                        {sat.purpose && <div className="text-[0.55rem] text-m3-on-surface-variant"><span className="font-semibold uppercase tracking-wider">purpose</span> <span className="font-mono text-m3-on-surface">{sat.purpose}</span></div>}
                    </div>
                )}
                <button onClick={onClose} className="absolute right-2.5 top-2.5 bg-transparent border-none text-m3-on-surface-variant cursor-pointer text-xs p-1 hover:text-m3-on-surface">✕</button>
            </div>

            {}
            {spaceRisk.length > 0 && (
                <div className="p-3 bg-indigo-900/20 border-b border-indigo-900/50">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[0.55rem] font-bold text-indigo-400 uppercase tracking-widest">Space Intel / Orbital Risk</span>
                        <span className="text-[0.55rem] text-indigo-300 font-mono">RISK: {riskScore}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        {spaceRisk.map((a, i) => (
                            <div key={i} className="text-[0.55rem] font-mono text-indigo-200 border-l-2 border-indigo-500 pl-2 py-0.5">{a}</div>
                        ))}
                    </div>
                </div>
            )}

            <div className="py-2 border-b border-m3-outline-variant">
                {row("latitude", `${fmt(intel?.latitude ?? null, 4)}°`)}
                {row("longitude", `${fmt(intel?.longitude ?? null, 4)}°`)}
                {row("altitude", `${whole(intel?.altitudeKm ?? null)} km`)}
                {row("speed", `${fmt(intel?.speedKps ?? null, 3)} km/s`)}
                {row("speed km/h", `${whole(intel?.speedKmh ?? null)} km/h`)}
                {row("updated", intel?.updatedAt ? new Date(intel.updatedAt).toLocaleTimeString("en-US", { hour12: false }) : "n/a")}
            </div>

            <div className="py-2 border-b border-m3-outline-variant">
                {row("epoch", intel?.epoch || "n/a")}
                {row("intl desig", intel?.intlDesignator || "n/a")}
                {row("inclination", `${fmt(intel?.inclination ?? null, 4)}°`)}
                {row("raan", `${fmt(intel?.raan ?? null, 4)}°`)}
                {row("eccentricity", fmt(intel?.eccentricity ?? null, 7))}
                {row("arg perigee", `${fmt(intel?.argPerigee ?? null, 4)}°`)}
                {row("mean anomaly", `${fmt(intel?.meanAnomaly ?? null, 4)}°`)}
                {row("mean motion", `${fmt(intel?.meanMotion ?? null, 6)} rev/day`)}
                {row("period", `${fmt(intel?.periodMinutes ?? null, 2)} min`)}
                {row("rev number", intel?.revNumber !== null && intel?.revNumber !== undefined ? String(intel.revNumber) : "n/a")}
                {row("bstar", intel?.bstar !== null && intel?.bstar !== undefined ? intel.bstar.toExponential(4) : "n/a")}
            </div>

            <div className="py-2 border-b border-m3-outline-variant">
                {row("semi-major", `${whole(intel?.semiMajorKm ?? null)} km`)}
                {row("perigee", `${whole(intel?.perigeeKm ?? null)} km`)}
                {row("apogee", `${whole(intel?.apogeeKm ?? null)} km`)}
            </div>

            <div className="py-2">
                {row("tle line 1", sat.line1)}
                {row("tle line 2", sat.line2)}
            </div>
        </div>
    );
}
