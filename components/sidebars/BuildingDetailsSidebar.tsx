"use client";

import { useEffect, useState } from "react";
import BuildingDeepScanModal from "@/components/modals/BuildingDeepScanModal";

export interface BuildingData {
    lat: number;
    lon: number;
    name?: string;
}

interface BuildingApiResponse {
    found: boolean;
    source: string;
    name: string;
    address: string | null;
    levels: string | null;
    height: string | null;
    architect: string | null;
    type: string;
    operator: string | null;
    amenity: string | null;
    wikidata: string | null;
    wikipedia: string | null;
    lat: number;
    lon: number;
    wikiImage: string | null;
    description: string | null;
    structuralDetails: {
        architect?: string;
        materials?: string;
        inception?: string;
        floors?: string;
        height?: string;
        website?: string;
        style?: string;
        engineer?: string;
        contractor?: string;
        cost?: string;
        elevators?: string;
    } | null;
    rankedDeepScanUrl?: string | null;
    rankedDeepScanSource?: string | null;
    webDiscoveries?: Array<{title: string, snippet: string, link: string}>;
}

interface Props {
    buildingCoord: BuildingData | null;
    onClose: () => void;
}

export default function BuildingDetailsSidebar({ buildingCoord, onClose }: Props) {
    const [data, setData] = useState<BuildingApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [prevKey, setPrevKey] = useState("");
    const [deepScanUrl, setDeepScanUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!buildingCoord) return;
        const key = `${buildingCoord.lat},${buildingCoord.lon}`;
        if (key === prevKey && data) return;
        setPrevKey(key);
        setLoading(true);
        setData(null);

        const ctrl = new AbortController();
        fetch(`/api/wm/building?lat=${buildingCoord.lat}&lon=${buildingCoord.lon}`, { signal: ctrl.signal })
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(err => { if (err.name !== "AbortError") { console.error("[BuildingPanel] error:", err); setLoading(false); } });

        return () => ctrl.abort();
    }, [buildingCoord]);

    if (!buildingCoord) return null;

    const row = (label: string, value: string) => (
        <div key={label} className="flex items-center justify-between px-3.5 py-1.5 border-b border-m3-outline-variant/50 last:border-0">
            <span className="font-sans text-[0.55rem] font-medium uppercase tracking-wider text-m3-on-surface-variant">{label}</span>
            <span className="max-w-[165px] truncate text-right font-mono text-[0.62rem] text-m3-on-surface" title={value}>{value}</span>
        </div>
    );

    const section = (title: string, children: React.ReactNode) => (
        <div className="border-b border-m3-outline-variant">
            <div className="px-3.5 pb-1 pt-2.5">
                <span className="font-sans text-[0.5rem] font-semibold uppercase tracking-widest text-m3-primary">{title}</span>
            </div>
            <div className="px-3.5 py-1 flex flex-col gap-0.5">
                {children}
            </div>
            <div className="pb-2" />
        </div>
    );

    const formatYear = (dateStr?: string) => {
        if (!dateStr) return null;
        try {
            return new Date(dateStr).getFullYear().toString();
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="max-h-[88vh] w-[300px] overflow-y-auto rounded-panel border border-m3-outline-variant bg-m3-surface text-m3-on-surface shadow-panel-sm relative">
            <div className="relative border-b border-m3-outline-variant px-3.5 py-3 bg-m3-surface-container-low">
                <div className="flex items-center gap-2 pr-5">
                    <div className="h-4 w-4 shrink-0 rounded-sm bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-[0.5rem]">🏢</div>
                    <span className="truncate text-[0.8rem] font-bold uppercase tracking-wide text-m3-on-surface">
                        {data?.name || buildingCoord.name || "Unknown Structure"}
                    </span>
                </div>
                <div className="mt-0.5 text-[0.55rem] text-m3-on-surface-variant truncate">
                    {data?.address || `${buildingCoord.lat.toFixed(4)}, ${buildingCoord.lon.toFixed(4)}`}
                </div>
                <button onClick={onClose} className="absolute right-2.5 top-2.5 cursor-pointer border-none bg-transparent p-1 text-xs text-m3-on-surface-variant hover:text-m3-on-surface">x</button>
            </div>

            {loading && (
                <div className="px-3.5 py-6 flex flex-col items-center justify-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-spin" />
                    <span className="animate-pulse text-[0.55rem] text-m3-on-surface-variant">Scanning geographic footprints...</span>
                </div>
            )}

            {!loading && data && !data.found && (
                <div className="px-3.5 py-4 text-center">
                    <span className="text-[0.55rem] text-m3-on-surface-variant">No significant building intelligence found at these coordinates.</span>
                </div>
            )}

            {!loading && data && data.found && (
                <>
                    {data.wikiImage && (
                        <div className="px-3 pb-1 pt-3">
                            <img src={data.wikiImage} alt={data.name} className="max-h-[180px] w-full rounded-card border border-m3-outline/40 object-cover" />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 border-b border-m3-outline-variant px-3 py-3">
                        <div className="rounded-card border border-m3-outline bg-m3-surface-container p-2.5 text-center">
                            <div className="mb-1 font-sans text-[0.5rem] font-medium uppercase tracking-wider text-m3-on-surface-variant">Type</div>
                            <div className="font-mono text-[0.7rem] font-bold text-sky-300 truncate">
                                {data.type.replace(/_/g, " ").toUpperCase()}
                            </div>
                        </div>
                        <div className="rounded-card border border-m3-outline bg-m3-surface-container p-2.5 text-center">
                            <div className="mb-1 font-sans text-[0.5rem] font-medium uppercase tracking-wider text-m3-on-surface-variant">Source</div>
                            <div className="font-mono text-[0.65rem] font-bold text-emerald-400 truncate">
                                {data.source.toUpperCase()}
                            </div>
                        </div>
                    </div>

                    {section("Structural Intelligence", <>
                        {data.structuralDetails?.height || data.height ? row("Height", `${data.structuralDetails?.height || data.height} m`) : null}
                        {data.structuralDetails?.floors || data.levels ? row("Levels", `${data.structuralDetails?.floors || data.levels}`) : null}
                        {data.structuralDetails?.materials && row("Materials", data.structuralDetails.materials)}
                        {data.structuralDetails?.architect || data.architect ? row("Architect", data.structuralDetails?.architect || data.architect || "") : null}
                        {data.structuralDetails?.engineer && row("Structural Engineer", data.structuralDetails.engineer)}
                        {data.structuralDetails?.contractor && row("Contractor", data.structuralDetails.contractor)}
                        {data.structuralDetails?.style && row("Arch. Style", data.structuralDetails.style)}
                        {data.structuralDetails?.cost && row("Cost", data.structuralDetails.cost)}
                        {data.structuralDetails?.elevators && row("Elevators", data.structuralDetails.elevators)}
                        {data.structuralDetails?.inception && row("Completed", formatYear(data.structuralDetails.inception) || "")}
                    </>)}

                    {section("Entity Details", <>
                        {data.operator && row("Operator", data.operator)}
                        {data.amenity && row("Amenity", data.amenity.replace(/_/g, " "))}
                        {data.structuralDetails?.website && (
                            <div className="flex items-center justify-between px-1 py-1.5 border-b border-m3-outline-variant/50 last:border-0">
                                <span className="font-sans text-[0.55rem] font-medium uppercase tracking-wider text-m3-on-surface-variant">Website</span>
                                <a href={data.structuralDetails.website} target="_blank" rel="noopener noreferrer" className="max-w-[145px] truncate font-mono text-[0.55rem] text-blue-400 hover:underline">
                                    {(() => { try { return new URL(data.structuralDetails.website).hostname; } catch { return data.structuralDetails.website; } })()}
                                </a>
                            </div>
                        )}
                        {row("Coordinates", `${data.lat.toFixed(5)}, ${data.lon.toFixed(5)}`)}
                    </>)}

                    {data.description && (
                        <div className="border-b border-m3-outline-variant">
                            <div className="px-3.5 pb-1 pt-2.5">
                                <span className="font-sans text-[0.5rem] font-semibold uppercase tracking-widest text-m3-primary">Background Narrative</span>
                            </div>
                            <div className="px-3.5 py-2">
                                <p className="line-clamp-8 text-[0.55rem] leading-relaxed text-m3-on-surface-variant">
                                    {data.description}
                                </p>
                            </div>
                        </div>
                    )}

                    {data.webDiscoveries && data.webDiscoveries.length > 0 && section("OSINT Web Discovery", <>
                        {data.webDiscoveries.map((discovery, idx) => (
                            <div key={idx} className="flex flex-col gap-1 px-1 py-2 border-b border-m3-outline-variant/50 last:border-0">
                                <a href={discovery.link} target="_blank" rel="noopener noreferrer" className="font-sans text-[0.6rem] font-bold text-blue-400 hover:underline line-clamp-1">
                                    {discovery.title}
                                </a>
                                <p className="font-sans text-[0.5rem] text-m3-on-surface-variant line-clamp-2 leading-relaxed">
                                    {discovery.snippet}
                                </p>
                                <span className="font-mono text-[0.45rem] text-m3-on-surface-variant opacity-60 truncate">
                                    {(() => { try { return new URL(discovery.link).hostname; } catch { return discovery.link; } })()}
                                </span>
                            </div>
                        ))}
                    </>)}

                    {data.rankedDeepScanUrl && (
                        <div className="px-3.5 py-4 border-b border-m3-outline-variant">
                            <button 
                                onClick={() => data.rankedDeepScanSource === "archdaily search"
                                    ? window.open(data.rankedDeepScanUrl!, "_blank", "noopener,noreferrer")
                                    : setDeepScanUrl(data.rankedDeepScanUrl!)}
                                className="w-full rounded bg-emerald-500/20 px-4 py-2.5 font-mono text-[0.65rem] font-bold tracking-widest text-emerald-400 transition-colors hover:bg-emerald-500/30 flex justify-center items-center gap-2 border border-emerald-500/40"
                            >
                                VIEW MORE IN {data.rankedDeepScanSource?.toUpperCase()} <span className="text-[0.55rem]">↗</span>
                            </button>
                        </div>
                    )}

                    {section("External Property Databases", <>
                        <a href={`https://www.archdaily.com/search/projects?text=${encodeURIComponent(data.address || data.name)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-1 py-2 border-b border-m3-outline-variant/50 last:border-0 hover:bg-m3-surface-variant/30 transition-colors">
                            <span className="font-sans text-[0.6rem] font-medium text-m3-on-surface">ArchDaily Projects</span>
                            <span className="font-mono text-[0.55rem] text-blue-400">Search ↗</span>
                        </a>
                        <a href={`https://www.google.com/search?q=${encodeURIComponent((data.address || data.name) + " local government parcel database tax assessor property record")}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-1 py-2 border-b border-m3-outline-variant/50 last:border-0 hover:bg-m3-surface-variant/30 transition-colors">
                            <span className="font-sans text-[0.6rem] font-medium text-m3-on-surface">Local Government / Parcel DB</span>
                            <span className="font-mono text-[0.55rem] text-blue-400">Search ↗</span>
                        </a>
                        <a href={`https://www.google.com/search?q=${encodeURIComponent((data.address || data.name) + " property real estate details")}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-1 py-2 border-b border-m3-outline-variant/50 last:border-0 hover:bg-m3-surface-variant/30 transition-colors">
                            <span className="font-sans text-[0.6rem] font-medium text-m3-on-surface">Public Real Estate Records</span>
                            <span className="font-mono text-[0.55rem] text-blue-400">Search ↗</span>
                        </a>
                    </>)}
                </>
            )}

            {deepScanUrl && (
                <BuildingDeepScanModal url={deepScanUrl} onClose={() => setDeepScanUrl(null)} />
            )}
        </div>
    );
}
