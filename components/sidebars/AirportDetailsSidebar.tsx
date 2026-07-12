"use client";

import { useEffect, useState } from "react";

interface Props {
    airport: { iata: string; icao?: string; name: string; lat: string; lon: string; size: string } | null;
    onClose: () => void;
}

export default function AirportDetailsSidebar({ airport, onClose }: Props) {
    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!airport) { setDetails(null); return; }
        
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/airports/${airport.iata}?lat=${airport.lat}&lon=${airport.lon}&size=${airport.size || "medium"}`);
                if (res.ok) {
                    const data = await res.json();
                    setDetails(data);
                }
            } catch (err) {
                console.error("Airport fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchDetails();
        const t = setInterval(fetchDetails, 60000);
        return () => clearInterval(t);
    }, [airport]);

    if (!airport) return null;

    return (
        <div className="bg-m3-surface border border-m3-outline-variant shadow-panel-sm rounded-panel w-[320px] text-m3-on-surface animate-in fade-in slide-in-from-right duration-300">
            {}
            <div className="px-4 py-3 border-b border-m3-outline-variant flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="rounded-full w-[8px] h-[8px] bg-m3-primary" />
                    <span className="font-mono font-medium text-[0.75rem] text-m3-on-surface tracking-wider">AIRPORT INTEL</span>
                </div>
                <button onClick={onClose} className="text-m3-on-surface-variant hover:text-m3-on-surface text-[0.8rem] transition-colors leading-none">✕</button>
            </div>

            <div className="px-4 py-5">
                {}
                <div className="mb-5">
                    <div className="flex items-center gap-3 mb-1.5">
                        <span className="font-mono font-bold text-[1.4rem] text-m3-on-surface leading-none">{airport.iata}</span>
                        {airport.icao && <span className="font-mono text-[0.8rem] text-m3-on-surface-variant mt-1">/ {airport.icao}</span>}
                        <span className="ml-auto font-sans text-[0.6rem] font-medium text-m3-on-surface bg-m3-surface-container px-2.5 py-1 rounded-tag border border-m3-outline uppercase tracking-wider">
                            {airport.size?.toUpperCase() || "FACILITY"}
                        </span>
                    </div>
                    <div className="font-sans text-[0.9rem] font-medium text-m3-on-surface leading-snug">
                        {airport.name || "UNNAMED AERODROME"}
                    </div>
                </div>

                {loading && !details ? (
                    <div className="font-mono text-[0.6rem] text-m3-on-surface-variant uppercase">FETCHING INTELLIGENCE...</div>
                ) : (
                    <>
                        {}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-m3-surface-container border border-m3-outline p-3 rounded-card text-center">
                                <div className="font-sans text-[0.55rem] font-medium text-m3-on-surface-variant uppercase tracking-wider mb-1.5">FLTS / DAY</div>
                                <div className="font-mono font-bold text-[1.1rem] text-m3-on-surface">{details?.stats?.flightsDay || "—"}</div>
                            </div>
                            <div className="bg-m3-surface-container border border-m3-outline p-3 rounded-card text-center">
                                <div className="font-sans text-[0.55rem] font-medium text-m3-on-surface-variant uppercase tracking-wider mb-1.5">OPS STATUS</div>
                                <div className="font-mono font-bold text-[0.9rem] text-m3-on-surface pt-[2px]">NOMINAL</div>
                            </div>
                        </div>

                        {}
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-2.5">
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="text-m3-on-surface-variant">
                                    <path d="M1 1h8v1H1zM1 4h8v1H1zM1 7h8v1H1z" />
                                </svg>
                                <span className="font-sans text-[0.55rem] font-medium text-m3-on-surface-variant uppercase tracking-wider">MAIN CARRIERS</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {details?.stats?.topAirlines?.map((a: string) => (
                                    <span key={a} className="font-mono text-[0.6rem] text-m3-on-surface bg-m3-surface-container px-2 py-1 rounded-tag border border-m3-outline">
                                        {a}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {}
                        <div>
                            <div className="flex items-center gap-2 mb-2.5">
                                <div className="rounded-full w-[6px] h-[6px] bg-m3-primary" />
                                <span className="font-sans text-[0.55rem] font-medium text-m3-on-surface-variant uppercase tracking-wider">TACTICAL ARRIVAL BOARD</span>
                                <span className="ml-auto font-mono text-[0.5rem] text-m3-on-surface-variant uppercase tracking-wider">LIVE</span>
                            </div>
                            
                            <div className="flex flex-col border border-m3-outline rounded-card overflow-hidden">
                                {details?.liveNearby?.length > 0 ? details.liveNearby.map((f: any, i: number) => (
                                    <div key={f.icao24} className={`grid grid-cols-3 gap-2 p-2.5 bg-m3-surface-container ${i > 0 ? 'border-t border-m3-outline' : ''}`}>
                                        <span className="font-mono font-bold text-[0.68rem] text-m3-on-surface">{f.callsign}</span>
                                        <span className="font-mono text-[0.62rem] text-m3-on-surface-variant text-right">{f.alt ? f.alt + "ft" : "N/A"}</span>
                                        <span className="font-mono text-[0.62rem] text-m3-on-surface text-right">{Math.round(f.dist || 0)}nm</span>
                                    </div>
                                )) : (
                                    <div className="p-4 bg-m3-surface-container text-center font-mono text-[0.6rem] text-m3-on-surface-variant uppercase">
                                        NO TARGETS IN VICINITY
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {}
            <div className="px-4 py-2.5 bg-m3-surface-container border-t border-m3-outline flex justify-between rounded-b-panel">
                <span className="font-mono text-[0.5rem] text-m3-on-surface-variant">SOURCE: ADS-B/OSINT</span>
                <span className="font-mono text-[0.5rem] text-m3-on-surface-variant">REFRESH: 60s</span>
            </div>
        </div>
    );
}
