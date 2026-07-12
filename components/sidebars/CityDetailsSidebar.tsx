"use client";

import { useEffect, useState } from "react";
import { geo_intel_feed_response } from "@/lib/geo-intelligence/types";
import { build_city_unrest } from "@/lib/geo-intelligence/live-deck-core";
import type { TacticalCamera } from "@/lib/live/cameras";
const R = 6371;
export function distanceKm(p1: { lat: number; lon: number }, p2: { lat: number; lon: number }): number {
    const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
    const dLon = (p2.lon - p1.lon) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(p1.lat * (Math.PI / 180)) * Math.cos(p2.lat * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export interface CityData {
    name: string;
    country: string;
    iso: string;
    lat: number;
    lon: number;
    pop: number;
    capital: boolean;
    tier?: 1 | 2 | 3 | 4 | 5;
}

interface WikiInfo {
    title: string;
    extract: string;
    thumbnail: string | null;
    pageUrl: string | null;
}

interface WikidataInfo {
    wikidataId: string;
    population: number | null;
    areaSqKm: number | null;
    elevationM: number | null;
    timezone: string | null;
    officialWebsite: string | null;
    imageUrl: string | null;
}

interface CityApiResponse {
    wiki: WikiInfo | null;
    wikidata: WikidataInfo | null;
}


interface ViolenceIncident {
    id: string;
    date: string;
    type: "shooting" | "bombing" | "armed_attack" | "civil_unrest" | "other";
    fatalities: number;
    injuries: number;
    location: string;
    description: string;
    source: string;
    severity: "critical" | "high" | "moderate" | "low";
}

interface CityViolenceData {
    city: string;
    country: string;
    riskLevel: "critical" | "high" | "moderate" | "low";
    totalIncidents: number;
    totalFatalities: number;
    totalInjuries: number;
    incidents: ViolenceIncident[];
    sources: string[];
    lastUpdated: string;
}

const RISK_STYLES: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
    critical: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]", label: "CRITICAL" },
    high: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", dot: "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]", label: "HIGH" },
    moderate: { bg: "bg-amber-500/10", border: "border-amber-400/30", text: "text-amber-400", dot: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]", label: "MODERATE" },
    low: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]", label: "LOW" },
};

const TYPE_ICONS: Record<string, string> = {
    shooting: "🔫",
    bombing: "💣",
    armed_attack: "⚔️",
    civil_unrest: "📢",
    other: "⚠️",
};

const ISO3_TO_ISO2: Record<string, string> = { AFG: "af", ALB: "al", DZA: "dz", AGO: "ao", ARG: "ar", ARM: "am", AUS: "au", AUT: "at", AZE: "az", BGD: "bd", BLR: "by", BEL: "be", BOL: "bo", BIH: "ba", BRA: "br", BGR: "bg", KHM: "kh", CMR: "cm", CAN: "ca", CHL: "cl", CHN: "cn", COL: "co", COD: "cd", COG: "cg", CRI: "cr", HRV: "hr", CUB: "cu", CYP: "cy", CZE: "cz", DNK: "dk", DOM: "do", ECU: "ec", EGY: "eg", SLV: "sv", EST: "ee", ETH: "et", FIN: "fi", FRA: "fr", GEO: "ge", DEU: "de", GHA: "gh", GRC: "gr", GTM: "gt", HND: "hn", HUN: "hu", ISL: "is", IND: "in", IDN: "id", IRN: "ir", IRQ: "iq", IRL: "ie", ISR: "il", ITA: "it", JAM: "jm", JPN: "jp", JOR: "jo", KAZ: "kz", KEN: "ke", PRK: "kp", KOR: "kr", KWT: "kw", KGZ: "kg", LVA: "lv", LBN: "lb", LBY: "ly", LTU: "lt", LUX: "lu", MYS: "my", MLI: "ml", MEX: "mx", MDA: "md", MNG: "mn", MAR: "ma", MOZ: "mz", MMR: "mm", NPL: "np", NLD: "nl", NZL: "nz", NIC: "ni", NGA: "ng", NOR: "no", OMN: "om", PAK: "pk", PAN: "pa", PRY: "py", PER: "pe", PHL: "ph", POL: "pl", PRT: "pt", QAT: "qa", ROU: "ro", RUS: "ru", SAU: "sa", SEN: "sn", SRB: "rs", SGP: "sg", SVK: "sk", SVN: "si", ZAF: "za", ESP: "es", LKA: "lk", SDN: "sd", SWE: "se", CHE: "ch", SYR: "sy", TWN: "tw", TJK: "tj", TZA: "tz", THA: "th", TUN: "tn", TUR: "tr", TKM: "tm", UGA: "ug", UKR: "ua", ARE: "ae", GBR: "gb", USA: "us", URY: "uy", UZB: "uz", VEN: "ve", VNM: "vn", YEM: "ye", ZMB: "zm", ZWE: "zw", HKG: "hk", MAC: "mo", XKX: "xk", MNE: "me", MKD: "mk", SSD: "ss", ERI: "er", SOM: "so", BEN: "bj", BFA: "bf", TCD: "td", GNQ: "gq", GAB: "ga", GMB: "gm", GIN: "gn", GNB: "gw", LSO: "ls", LBR: "lr", MWI: "mw", MRT: "mr", MUS: "mu", NAM: "na", NER: "ne", RWA: "rw", SLE: "sl", SWZ: "sz", TGO: "tg", CAF: "cf", CIV: "ci", DJI: "dj", COM: "km", CPV: "cv", STP: "st", SYC: "sc", MDG: "mg", BWA: "bw", FJI: "fj", PNG: "pg", SLB: "sb", VUT: "vu", WSM: "ws", TON: "to", KIR: "ki", NRU: "nr", PLW: "pw", MHL: "mh", FSM: "fm", TLS: "tl", BRN: "bn", MDV: "mv", BTN: "bt", BHS: "bs", BRB: "bb", BLZ: "bz", GRD: "gd", GUY: "gy", HTI: "ht", KNA: "kn", LCA: "lc", SUR: "sr", TTO: "tt", VCT: "vc", ATG: "ag", DMA: "dm", PRI: "pr", AND: "ad", LIE: "li", MCO: "mc", SMR: "sm", VAT: "va" };

function fmt(n: number): string {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toLocaleString("en-US");
}

function whole(n: number): string {
    return Math.round(n).toLocaleString("en-US");
}

function compactDensity(n: number): string {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M/km^2";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K/km^2";
    return Math.round(n).toLocaleString("en-US") + "/km^2";
}

interface CityDetailsSidebarProps {
    city: CityData | null;
    onClose: () => void;
    worldMonitorActive?: boolean;
    geoIntel?: geo_intel_feed_response | null;
    onCameraSelect?: (camera: TacticalCamera) => void;
}

export default function CityDetailsSidebar({ city, onClose, worldMonitorActive = false, geoIntel, onCameraSelect }: CityDetailsSidebarProps) {
    const [liveData, setLiveData] = useState<CityApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [cams, setCams] = useState<any[]>([]);
    const [prevCityKey, setPrevCityKey] = useState("");

    // Violence data state
    const [violenceData, setViolenceData] = useState<CityViolenceData | null>(null);
    const [violenceLoading, setViolenceLoading] = useState(false);
    const [violenceExpanded, setViolenceExpanded] = useState(true);
    const [prevViolenceKey, setPrevViolenceKey] = useState("");

    useEffect(() => {
        if (!city) return;
        const key = city.name + "|" + city.iso;
        if (key === prevCityKey && liveData) return;
        setPrevCityKey(key);
        setLoading(true);
        setLiveData(null);
        const ctrl = new AbortController();
        fetch(`/api/city/${encodeURIComponent(city.name)}?country=${encodeURIComponent(city.country)}&iso=${encodeURIComponent(city.iso)}`, { signal: ctrl.signal })
            .then(r => r.json())
            .then((d: CityApiResponse) => { setLiveData(d); setLoading(false); })
            .catch(err => { if (err.name !== "AbortError") { console.error("[CityPanel] fetch error:", err); setLoading(false); } });

        fetch("/markers.json")
            .then(r => r.json())
            .then((d: any[]) => {
                const nearby = d.filter(c => distanceKm({ lat: city.lat, lon: city.lon }, { lat: c.lat, lon: c.lng }) < 100);
                setCams(nearby.slice(0, 4));
            })
            .catch(() => setCams([]));

        return () => ctrl.abort();
    }, [city?.name, city?.iso]);


    useEffect(() => {
        if (!city || !worldMonitorActive) {
            setViolenceData(null);
            return;
        }
        const key = city.name + "|wm";
        if (key === prevViolenceKey && violenceData) return;
        setPrevViolenceKey(key);
        setViolenceLoading(true);
        setViolenceData(null);
        const ctrl = new AbortController();
        fetch(`/api/city-violence/${encodeURIComponent(city.name)}`, { signal: ctrl.signal })
            .then(r => r.json())
            .then((d: CityViolenceData) => { setViolenceData(d); setViolenceLoading(false); })
            .catch(err => { if (err.name !== "AbortError") { console.error("[CityPanel] violence fetch error:", err); setViolenceLoading(false); } });

        return () => ctrl.abort();
    }, [city?.name, worldMonitorActive]);

    if (!city) return null;

    const iso2 = city?.iso && city.iso.length === 3 ? (ISO3_TO_ISO2[city.iso] ?? "xx") : (city?.iso ? city.iso.toLowerCase() : "xx");
    const flagUrl = `https://flagcdn.com/w80/${iso2}.png`;
    const population = liveData?.wikidata?.population ?? city.pop;
    const populationSource = liveData?.wikidata?.population ? "Wikidata" : "GeoNames dataset";
    const areaSqKm = liveData?.wikidata?.areaSqKm ?? null;
    const density = areaSqKm && areaSqKm > 0 ? population / areaSqKm : null;
    const coordinatesLabel = `${city.lat.toFixed(2)}, ${city.lon.toFixed(2)}`;
    const unrest = build_city_unrest(geoIntel?.events || [], city);
    const unrest_style = unrest.score >= 75
        ? { text: "text-red-400", border: "border-red-500/40", bg: "bg-red-500/10", bar: "bg-red-500" }
        : unrest.score >= 50
            ? { text: "text-orange-400", border: "border-orange-500/40", bg: "bg-orange-500/10", bar: "bg-orange-500" }
            : unrest.score >= 25
                ? { text: "text-amber-400", border: "border-amber-500/40", bg: "bg-amber-500/10", bar: "bg-amber-500" }
                : { text: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", bar: "bg-emerald-500" };

    const protest_svg = () => (
        <svg viewBox="0 0 48 48" className="h-11 w-11" fill="none" aria-label="protest activity">
            <path d="M15 5h22v17H15z" className="fill-amber-400/15 stroke-amber-400" strokeWidth="2" />
            <path d="M18 10h16M18 15h11" className="stroke-amber-300" strokeWidth="2" strokeLinecap="round" />
            <path d="M26 22v21" className="stroke-stone-300" strokeWidth="3" strokeLinecap="round" />
            <path d="M7 43v-7c0-3 2-5 5-5h3v12M15 43V29c0-3 2-5 5-5s5 2 5 5v14M25 43V31c0-3 2-5 5-5s5 2 5 5v12M35 43v-8c0-3 2-5 5-5h1v13" className="stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="27" r="3" className="fill-current" />
            <circle cx="20" cy="20" r="3" className="fill-current" />
            <circle cx="30" cy="22" r="3" className="fill-current" />
            <circle cx="40" cy="26" r="3" className="fill-current" />
        </svg>
    );

    const row = (label: string, value: string) => (
        <div key={label} className="flex items-center justify-between px-3.5 py-1.5">
            <span className="font-sans text-[0.55rem] font-medium uppercase tracking-wider text-m3-on-surface-variant">{label}</span>
            <span className="max-w-[165px] truncate text-right font-mono text-[0.62rem] text-m3-on-surface" title={value}>{value}</span>
        </div>
    );

    const section = (title: string, children: React.ReactNode) => (
        <div className="border-b border-m3-outline-variant">
            <div className="px-3.5 pb-1 pt-2.5">
                <span className="font-sans text-[0.5rem] font-semibold uppercase tracking-widest text-m3-primary">{title}</span>
            </div>
            {children}
            <div className="pb-1" />
        </div>
    );

    const markerToCamera = (marker: any): TacticalCamera => ({
        id: String(marker.id || `${marker.lat}-${marker.lng}`),
        name: [marker.city, marker.manufacturer].filter(Boolean).join(" ") || "Public camera",
        status: "active",
        lat: Number(marker.lat),
        lon: Number(marker.lng),
        city: marker.city || city.name,
        region: marker.region || "",
        country: marker.country || city.country,
        categories: ["city-camera"],
        distanceKm: distanceKm({ lat: city.lat, lon: city.lon }, { lat: Number(marker.lat), lon: Number(marker.lng) }),
        thumbnailUrl: marker.stream || null,
        embedUrl: null,
        pageUrl: marker.stream || null,
        lastUpdated: null,
    });

    const riskStyle = violenceData ? RISK_STYLES[violenceData.riskLevel] : null;

    return (
        <div className="max-h-[88vh] w-[300px] overflow-y-auto rounded-panel border border-m3-outline-variant bg-m3-surface text-m3-on-surface shadow-panel-sm">
            <div className="relative border-b border-m3-outline-variant px-3.5 py-3">
                <div className="flex items-center gap-2 pr-5">
                    <img src={flagUrl} alt="" className="h-[15px] w-[22px] rounded-sm border border-m3-outline/40 object-cover" />
                    <span className="truncate text-[0.8rem] font-bold uppercase tracking-wide text-m3-on-surface">{city.name}</span>
                    {city.capital && <span className="rounded-tag border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[0.45rem] font-semibold text-amber-400">CAPITAL</span>}
                </div>
                <div className="mt-0.5 text-[0.55rem] text-m3-on-surface-variant">{city.country}</div>
                <button onClick={onClose} className="absolute right-2.5 top-2.5 cursor-pointer border-none bg-transparent p-1 text-xs text-m3-on-surface-variant hover:text-m3-on-surface">x</button>
            </div>

            {liveData?.wikidata?.imageUrl && (
                <div className="px-3 pb-1 pt-3">
                    <img src={liveData.wikidata.imageUrl} alt={city.name} className="max-h-[160px] w-full rounded-card border border-m3-outline/40 object-cover" />
                </div>
            )}

            {loading && (
                <div className="px-3.5 py-4 text-center">
                    <span className="animate-pulse text-[0.55rem] text-m3-on-surface-variant">Fetching Wikipedia and Wikidata...</span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-2 border-b border-m3-outline-variant px-3 py-3">
                <div className="rounded-card border border-m3-outline bg-m3-surface-container p-2.5 text-center">
                    <div className="mb-1 font-sans text-[0.5rem] font-medium uppercase tracking-wider text-m3-on-surface-variant">Population</div>
                    <div className="font-mono text-[1rem] font-bold text-m3-on-surface">{fmt(population)}</div>
                </div>
                <div className="rounded-card border border-m3-outline bg-m3-surface-container p-2.5 text-center">
                    <div className="mb-1 font-sans text-[0.5rem] font-medium uppercase tracking-wider text-m3-on-surface-variant">{density ? "Density" : "Coordinates"}</div>
                    <div className="font-mono text-[0.86rem] font-bold text-cyan-300">{density ? compactDensity(density) : coordinatesLabel}</div>
                </div>
            </div>

            <div className="border-b border-m3-outline-variant px-3 py-3">
                <div className={`rounded-card border p-3 ${unrest_style.border} ${unrest_style.bg}`}>
                    <div className="flex items-center gap-3">
                        <div className={`shrink-0 ${unrest_style.text}`}>{protest_svg()}</div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-end justify-between gap-2">
                                <div>
                                    <div className="text-[0.5rem] font-semibold uppercase tracking-widest text-m3-on-surface-variant">Civil unrest</div>
                                    <div className={`font-mono text-[1.35rem] font-bold ${unrest_style.text}`}>
                                        {unrest.score}<span className="text-[0.55rem] text-m3-on-surface-variant"> / 100</span>
                                    </div>
                                </div>
                                <span className={`text-[0.45rem] font-bold uppercase tracking-wider ${unrest_style.text}`}>{unrest.label}</span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
                                <div className={`h-full ${unrest_style.bar}`} style={{ width: `${unrest.score}%` }} />
                            </div>
                            <div className="mt-1.5 text-[0.43rem] text-m3-on-surface-variant">
                                {unrest.events.length} sourced signals within 500 km | {unrest.sources} sources
                            </div>
                        </div>
                    </div>
                    {unrest.events.length > 0 ? (
                        <div className="mt-3 space-y-1.5 border-t border-white/10 pt-2">
                            {unrest.events.slice(0, 3).map(event => (
                                <div key={event.id} className="flex gap-2 text-[0.48rem]">
                                    <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${event.severity === "critical" ? "bg-red-500" : event.severity === "high" ? "bg-orange-500" : "bg-amber-500"}`} />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-m3-on-surface">{event.title}</div>
                                        <div className="truncate text-[0.42rem] text-m3-on-surface-variant">{event.source_name} | {event.distance_km} km</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-2 border-t border-white/10 pt-2 text-[0.46rem] text-m3-on-surface-variant">No nearby sourced civil-unrest events in the current feed.</div>
                    )}
                </div>
            </div>

            {section("Verified Facts", <>
                {row("Country", city.country)}
                {row("Population", `${whole(population)} (${populationSource})`)}
                {areaSqKm !== null && areaSqKm !== undefined && row("Area", `${areaSqKm.toLocaleString("en-US")} km^2`)}
                {density !== null && row("Density", `${Math.round(density).toLocaleString("en-US")} people/km^2`)}
                {liveData?.wikidata?.elevationM !== null && liveData?.wikidata?.elevationM !== undefined && row("Elevation", `${liveData.wikidata.elevationM} m`)}
                {liveData?.wikidata?.timezone && row("Timezone", liveData.wikidata.timezone)}
                {liveData?.wikidata?.officialWebsite && (
                    <div className="flex items-center justify-between px-3.5 py-1.5">
                        <span className="font-sans text-[0.55rem] font-medium uppercase tracking-wider text-m3-on-surface-variant">Website</span>
                        <a href={liveData.wikidata.officialWebsite} target="_blank" rel="noopener noreferrer" className="max-w-[145px] truncate font-mono text-[0.55rem] text-blue-400 hover:underline">
                            {(() => { try { return new URL(liveData.wikidata!.officialWebsite!).hostname; } catch { return liveData.wikidata!.officialWebsite; } })()}
                        </a>
                    </div>
                )}
            </>)}

            { }
            {worldMonitorActive && (
                <div className="border-b border-m3-outline-variant">
                    <button
                        onClick={() => setViolenceExpanded(!violenceExpanded)}
                        className="w-full cursor-pointer bg-transparent border-none outline-none"
                    >
                        <div className="px-3.5 pb-1 pt-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-sans text-[0.5rem] font-semibold uppercase tracking-widest text-red-400">Historical Violence</span>
                                {violenceData && riskStyle && (
                                    <span className={`px-1.5 py-0.5 rounded text-[0.4rem] font-bold tracking-wider ${riskStyle.bg} ${riskStyle.border} ${riskStyle.text} border`}>
                                        {riskStyle.label}
                                    </span>
                                )}
                            </div>
                            <svg
                                width="10" height="10" viewBox="0 0 10 10" fill="none"
                                className={`text-m3-on-surface-variant transition-transform duration-200 ${violenceExpanded ? "rotate-180" : ""}`}
                            >
                                <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </button>

                    {violenceExpanded && (
                        <div className="px-3.5 py-2">
                            {violenceLoading && (
                                <div className="py-3 text-center">
                                    <span className="animate-pulse text-[0.55rem] text-m3-on-surface-variant">Loading violence data...</span>
                                </div>
                            )}

                            {violenceData && (
                                <>
                                    { }
                                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                                        <div className={`rounded-lg p-2 text-center ${riskStyle?.bg} border ${riskStyle?.border}`}>
                                            <div className="font-mono text-[0.85rem] font-bold text-red-300">{fmt(violenceData.totalIncidents)}</div>
                                            <div className="text-[0.4rem] font-semibold uppercase tracking-wider text-stone-400 mt-0.5">Incidents</div>
                                        </div>
                                        <div className={`rounded-lg p-2 text-center ${riskStyle?.bg} border ${riskStyle?.border}`}>
                                            <div className="font-mono text-[0.85rem] font-bold text-orange-300">{fmt(violenceData.totalFatalities)}</div>
                                            <div className="text-[0.4rem] font-semibold uppercase tracking-wider text-stone-400 mt-0.5">Fatalities</div>
                                        </div>
                                        <div className={`rounded-lg p-2 text-center ${riskStyle?.bg} border ${riskStyle?.border}`}>
                                            <div className="font-mono text-[0.85rem] font-bold text-amber-300">{fmt(violenceData.totalInjuries)}</div>
                                            <div className="text-[0.4rem] font-semibold uppercase tracking-wider text-stone-400 mt-0.5">Injuries</div>
                                        </div>
                                    </div>

                                    { }
                                    {riskStyle && (
                                        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-3 ${riskStyle.bg} border ${riskStyle.border}`}>
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${riskStyle.dot}`} />
                                            <span className={`text-[0.5rem] font-bold tracking-wider ${riskStyle.text}`}>
                                                THREAT LEVEL: {riskStyle.label}
                                            </span>
                                            <span className="text-[0.45rem] text-stone-500 ml-auto font-mono">
                                                {violenceData.sources.join(" · ")}
                                            </span>
                                        </div>
                                    )}

                                    { }
                                    <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto pr-1 flight-sidebar">
                                        {violenceData.incidents.map((incident) => {
                                            const sev = RISK_STYLES[incident.severity];
                                            return (
                                                <div
                                                    key={incident.id}
                                                    className={`rounded-lg px-2.5 py-2 border transition-all hover:brightness-110 ${sev.bg} ${sev.border}`}
                                                >
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="text-[0.65rem]">{TYPE_ICONS[incident.type] || "⚠️"}</span>
                                                            <span className="text-[0.55rem] font-semibold text-m3-on-surface truncate">
                                                                {incident.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                                                            </span>
                                                        </div>
                                                        <span className="text-[0.45rem] font-mono text-stone-500 flex-shrink-0">
                                                            {incident.date}
                                                        </span>
                                                    </div>
                                                    <p className="text-[0.5rem] text-m3-on-surface-variant leading-relaxed line-clamp-2 mb-1.5">
                                                        {incident.description}
                                                    </p>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[0.45rem] text-stone-500">
                                                            📍 {incident.location}
                                                        </span>
                                                        {incident.fatalities > 0 && (
                                                            <span className="text-[0.45rem] font-mono font-bold text-red-400">
                                                                {incident.fatalities} KIA
                                                            </span>
                                                        )}
                                                        {incident.injuries > 0 && (
                                                            <span className="text-[0.45rem] font-mono font-bold text-amber-400">
                                                                {incident.injuries} WIA
                                                            </span>
                                                        )}
                                                        <span className="text-[0.4rem] font-mono text-stone-600 ml-auto">
                                                            {incident.source}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    { }
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-[0.4rem] font-mono text-stone-600 tracking-wider">
                                            LAST UPDATED: {new Date(violenceData.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        </span>
                                        <span className="text-[0.4rem] font-mono text-red-500/60 tracking-wider font-bold">
                                            TLP:RED
                                        </span>
                                    </div>
                                </>
                            )}

                            {!violenceLoading && !violenceData && (
                                <p className="text-[0.55rem] text-m3-on-surface-variant py-2">
                                    No violence data available for this city.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="border-b border-m3-outline-variant">
                <div className="px-3.5 pb-1 pt-2.5">
                    <span className="font-sans text-[0.5rem] font-semibold uppercase tracking-widest text-m3-primary">About</span>
                </div>
                <div className="px-3.5 py-2">
                    {liveData?.wiki?.extract ? (
                        <>
                            <p className="line-clamp-8 text-[0.55rem] leading-relaxed text-m3-on-surface-variant">{liveData.wiki.extract}</p>
                            {liveData.wiki.pageUrl && (
                                <a href={liveData.wiki.pageUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[0.5rem] text-blue-400 hover:underline">
                                    Read more on Wikipedia
                                </a>
                            )}
                        </>
                    ) : (
                        <p className="text-[0.55rem] leading-relaxed text-m3-on-surface-variant">No verified Wikipedia summary is available for this city.</p>
                    )}
                </div>
            </div>

            <div className="border-b border-m3-outline-variant">
                <div className="px-3.5 pb-1 pt-2.5">
                    <span className="font-sans text-[0.5rem] font-semibold uppercase tracking-widest text-m3-primary">Cameras</span>
                </div>
                <div className="px-3.5 py-2 flex flex-col gap-2">
                    {cams.length > 0 ? cams.map((c, i) => (
                        <button key={c.id + i} type="button" onClick={() => onCameraSelect?.(markerToCamera(c))} className="rounded-card border border-m3-outline/40 overflow-hidden bg-black/50 text-left transition-colors hover:border-cyan-400/50 hover:bg-cyan-400/5">
                            <img src={c.stream} alt={c.city} className="w-full h-auto object-cover opacity-80 hover:opacity-100 transition-opacity" />
                            <div className="px-2 py-1 flex items-center justify-between bg-stone-950">
                                <span className="text-[0.45rem] font-mono text-emerald-400">LIVE</span>
                                <span className="text-[0.45rem] font-sans text-stone-400 truncate max-w-[120px] text-right">{c.manufacturer}</span>
                            </div>
                        </button>
                    )) : (
                        <p className="text-[0.55rem] text-m3-on-surface-variant">No public cameras found nearby.</p>
                    )}
                </div>
            </div>

            <div className="py-1.5">
                {row("Lat", city.lat.toFixed(4))}
                {row("Lon", city.lon.toFixed(4))}
            </div>
        </div>
    );
}
