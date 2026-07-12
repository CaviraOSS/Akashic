"use client";

import { useEffect, useState } from "react";
import { geo_intel_event, geo_intel_feed_response } from "@/lib/geo-intelligence/types";
import { build_country_domain_summary, build_country_intel } from "@/lib/geo-intelligence/live-deck-core";
import ParliamentChart from "./ParliamentChart";

interface CountryIntel {
    name: string;
    formalName: string;
    iso2: string;
    iso3: string;
    continent: string;
    region: string;
    subregion: string;
    capital: string;
    languages: string[];
    currencies: string[];
    borders: string[];
    area: number;
    population: number;
    flag: string;
    publicHealth: {
        cases: number;
        deaths: number;
        tests: number;
        recovered: number;
        active: number;
        critical: number;
        casesPerMillion: number;
        deathsPerMillion: number;
        testsPerMillion: number;
        activePerMillion: number;
        recoveredPerMillion: number;
        criticalPerMillion: number;
    };
    economy: {
        gdp: number;
        inflation: number;
        unemployment: number;
    };
    military: {
        armySize: number;
    };
    factbook?: any;
    intro?: string;
    latestNews?: geo_intel_event[];
}

const TABS = ["OVERVIEW", "GEOGRAPHY", "SOCIETY", "GOVERNMENT", "ECONOMY", "ENERGY", "INFRA", "SECURITY", "GEO-INTEL"] as const;
type Tab = typeof TABS[number];

export default function CountryDashboard({ iso, geoIntel, onClose }: { iso: string | null; geoIntel?: geo_intel_feed_response | null; onClose: () => void }) {
    const [data, setData] = useState<CountryIntel | null>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<Tab>("OVERVIEW");
    const [local_geo, set_local_geo] = useState<geo_intel_feed_response | null>(null);
    
    
    const [popup, setPopup] = useState<{ title: string; content: React.ReactNode } | null>(null);

    useEffect(() => {
        if (!iso) { setData(null); setPopup(null); return; }
        let active = true;
        setLoading(true);
        setData(null);
        setPopup(null);
        setTab("OVERVIEW");
        fetch(`/api/countries/${encodeURIComponent(iso)}`, { cache: 'no-store' })
            .then(async r => {
                if (!r.ok) throw new Error("not found");
                return r.json();
            })
            .then(d => { if (active) { setData(d); setLoading(false); } })
            .catch(() => { if (active) { setData(null); setLoading(false); } });
        return () => { active = false; };
    }, [iso]);

    useEffect(() => {
        if (!iso || geoIntel) {
            set_local_geo(null);
            return;
        }
        let active = true;
        fetch("/api/geo-intelligence", { cache: "no-store" })
            .then(r => {
                if (!r.ok) throw new Error("geo-intelligence unavailable");
                return r.json();
            })
            .then(feed => { if (active) set_local_geo(feed); })
            .catch(() => { if (active) set_local_geo(null); });
        return () => { active = false; };
    }, [iso, geoIntel]);

    if (!iso) return null;
    const active_geo = geoIntel || local_geo;

    const row = (label: string, value: string | number | undefined, accent?: string) => (
        <div className="flex justify-between items-start py-1.5 px-1 border-b border-m3-outline-variant/30 last:border-0 gap-4">
            <span className="font-sans text-[0.6rem] font-medium text-m3-on-surface-variant uppercase tracking-wider shrink-0">{label}</span>
            <span className={`font-mono text-[0.65rem] text-right ${accent || "text-m3-on-surface"}`} dangerouslySetInnerHTML={{ __html: String(value || "N/A") }} />
        </div>
    );

    const textBlock = (title: string, text: string | undefined, truncateLines?: number) => {
        if (!text) return null;
        return (
            <div className="pt-2 pb-1 border-b border-m3-outline-variant/30 last:border-0 relative group">
                <div className="font-sans text-[0.55rem] font-semibold text-m3-primary uppercase tracking-widest mb-1 px-1 flex justify-between items-center">
                    {title}
                    {truncateLines && (
                        <button 
                            onClick={() => setPopup({ title, content: <div className="text-[0.65rem] font-mono leading-relaxed text-justify whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: text }} /> })}
                            className="text-[0.5rem] bg-m3-surface-variant text-m3-on-surface-variant px-2 py-0.5 rounded cursor-pointer hover:bg-m3-primary hover:text-m3-on-primary transition-colors shrink-0"
                        >
                            READ FULL
                        </button>
                    )}
                </div>
                <div className={`font-mono text-[0.6rem] text-m3-on-surface leading-relaxed px-1 text-justify ${truncateLines ? `line-clamp-${truncateLines}` : ''}`} dangerouslySetInnerHTML={{ __html: text }} />
            </div>
        );
    };

    const pill = (text: string, color?: string) => (
        <span key={text} className={`text-[0.5rem] font-mono px-2 py-0.5 rounded-tag border ${color || "text-m3-on-surface bg-m3-surface-container border-m3-outline"}`}>{text}</span>
    );

    const formatGdp = (val: number) => {
        if (!val) return "N/A";
        if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
        if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
        return `$${(val / 1e6).toFixed(2)}M`;
    };

    const format_age = (value: string) => {
        const mins = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60000));
        if (!Number.isFinite(mins)) return "pending";
        if (mins < 60) return `${mins}m ago`;
        if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
        return `${Math.floor(mins / 1440)}d ago`;
    };

    const country_live = data ? build_country_intel(
        active_geo || { events: [] },
        { name: data.name, iso2: data.iso2, iso3: data.iso3 },
        data.latestNews || [],
    ) : null;
    const energy_live = build_country_domain_summary(country_live?.events || [], "energy");
    const infra_live = build_country_domain_summary(country_live?.events || [], "infrastructure");
    const security_live = build_country_domain_summary(country_live?.events || [], "security");
    const join_html = (...parts: Array<string | undefined>) => parts.filter(Boolean).join("<br/><br/>");
    const tab_counts: Partial<Record<Tab, number>> = {
        ENERGY: energy_live.count,
        INFRA: infra_live.count,
        SECURITY: security_live.count,
    };

    const render_domain_live = (
        title: string,
        summary: ReturnType<typeof build_country_domain_summary>,
        tone: "amber" | "cyan" | "red",
    ) => {
        const colors = {
            amber: {
                border: "border-amber-500/30",
                text: "text-amber-400",
                chip: "border-amber-500/30 bg-amber-500/10",
            },
            cyan: {
                border: "border-cyan-500/30",
                text: "text-cyan-400",
                chip: "border-cyan-500/30 bg-cyan-500/10",
            },
            red: {
                border: "border-red-500/30",
                text: "text-red-400",
                chip: "border-red-500/30 bg-red-500/10",
            },
        }[tone];
        return (
            <div className={`mb-4 border ${colors.border} bg-m3-surface-container/70 p-3 rounded-card`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <span className={`font-sans text-[0.55rem] font-bold uppercase tracking-widest ${colors.text}`}>{title}</span>
                    <span className={`shrink-0 border px-1.5 py-0.5 font-mono text-[0.42rem] uppercase ${colors.chip} ${colors.text}`}>
                        {summary.count} active
                    </span>
                </div>
                <div className="mb-2 grid grid-cols-3 gap-2">
                    {[
                        ["critical", summary.critical, "text-red-400"],
                        ["high", summary.high, "text-orange-400"],
                        ["sources", summary.sources, "text-emerald-400"],
                    ].map(([label, value, color]) => (
                        <div key={label} className="border border-m3-outline-variant/50 bg-m3-surface px-2 py-1.5 text-center rounded-card">
                            <div className={`font-mono text-[0.78rem] font-bold ${color}`}>{value}</div>
                            <div className="text-[0.4rem] uppercase tracking-wider text-m3-on-surface-variant">{label}</div>
                        </div>
                    ))}
                </div>
                <div className="space-y-1">
                    {summary.events.length ? summary.events.slice(0, 5).map(event => (
                        <a
                            key={event.id}
                            href={event.source_url || "#"}
                            target={event.source_url ? "_blank" : undefined}
                            rel="noreferrer"
                            className="block border-l-2 border-m3-outline bg-m3-surface px-2 py-1.5 hover:bg-m3-surface-variant"
                        >
                            <div className="line-clamp-2 font-mono text-[0.55rem] leading-snug text-m3-on-surface">{event.title}</div>
                            <div className="mt-1 flex justify-between gap-2 text-[0.4rem] uppercase text-m3-on-surface-variant">
                                <span className="truncate">{event.source_name || "live feed"}</span>
                                <span className="shrink-0">{format_age(event.published_at)}</span>
                            </div>
                        </a>
                    )) : (
                        <div className="py-2 text-center font-mono text-[0.5rem] text-m3-on-surface-variant">
                            no country-scoped live reports in the current feed
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderOverview = () => {
        if (!data) return null;
        
        const openHealthPopup = () => {
            setPopup({
                title: "PUBLIC HEALTH INTEL",
                content: (
                    <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="bg-m3-surface-container border border-amber-500/30 p-2 rounded-card text-center">
                                <div className="text-[0.5rem] text-amber-500 font-bold uppercase">ACTIVE</div>
                                <div className="font-mono text-xs text-m3-on-surface">{data.publicHealth.active.toLocaleString()}</div>
                            </div>
                            <div className="bg-m3-surface-container border border-red-500/30 p-2 rounded-card text-center">
                                <div className="text-[0.5rem] text-red-500 font-bold uppercase">CRITICAL</div>
                                <div className="font-mono text-xs text-m3-on-surface">{data.publicHealth.critical.toLocaleString()}</div>
                            </div>
                            <div className="bg-m3-surface-container border border-green-500/30 p-2 rounded-card text-center">
                                <div className="text-[0.5rem] text-green-500 font-bold uppercase">RECOVERED</div>
                                <div className="font-mono text-xs text-m3-on-surface">{data.publicHealth.recovered.toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            {row("TOTAL CASES", data.publicHealth.cases.toLocaleString(), "text-amber-400")}
                            {row("CASES PER MILLION", data.publicHealth.casesPerMillion.toLocaleString())}
                            {row("TOTAL DEATHS", data.publicHealth.deaths.toLocaleString(), "text-red-400")}
                            {row("DEATHS PER MILLION", data.publicHealth.deathsPerMillion.toLocaleString())}
                            {row("TOTAL TESTS", data.publicHealth.tests.toLocaleString(), "text-cyan-400")}
                            {row("TESTS PER MILLION", data.publicHealth.testsPerMillion.toLocaleString())}
                        </div>
                    </div>
                )
            });
        };

        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: "POPULATION", value: data.population?.toLocaleString() || "N/A" },
                        { label: "CONTINENT", value: data.continent }
                    ].map(m => (
                        <div key={m.label} className="bg-m3-surface-container border border-m3-outline p-2 rounded-card text-center">
                            <div className="font-sans text-[0.45rem] font-medium text-m3-on-surface-variant uppercase tracking-wider mb-1">{m.label}</div>
                            <div className="font-mono font-bold text-[0.8rem] text-m3-on-surface">{m.value}</div>
                        </div>
                    ))}
                </div>

                {country_live && (
                    <div className="space-y-2 border-y border-m3-outline-variant/40 py-3">
                        <div className="flex items-center justify-between">
                            <span className="font-sans text-[0.52rem] font-semibold uppercase tracking-widest text-orange-400">Live situation</span>
                            <span className="text-[0.45rem] font-mono text-m3-on-surface-variant">{country_live.sources} active sources</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                ["risk", country_live.risk_score, "text-orange-400"],
                                ["ongoing", country_live.events.length, "text-cyan-400"],
                                ["critical", country_live.critical, "text-red-400"],
                            ].map(([label, value, color]) => (
                                <div key={label} className="rounded-card border border-m3-outline bg-m3-surface-container p-2 text-center">
                                    <div className={`font-mono text-[0.9rem] font-bold ${color}`}>{value}</div>
                                    <div className="text-[0.42rem] uppercase tracking-wider text-m3-on-surface-variant">{label}</div>
                                </div>
                            ))}
                        </div>
                        {country_live.latest_news.slice(0, 3).map(news => (
                            <a key={news.id} href={news.source_url || "#"} target={news.source_url ? "_blank" : undefined} rel="noreferrer" className="block border-l-2 border-cyan-500/50 bg-m3-surface-container px-2 py-1.5 hover:bg-m3-surface-variant">
                                <div className="line-clamp-2 text-[0.56rem] font-mono leading-snug text-m3-on-surface">{news.title}</div>
                                <div className="mt-1 text-[0.42rem] uppercase text-m3-on-surface-variant">{news.source_name} | {format_age(news.published_at)}</div>
                            </a>
                        ))}
                    </div>
                )}

                <div className="space-y-1">
                    {row("CAPITAL", data.capital)}
                    {row("REGION", `${data.region} · ${data.subregion}`)}
                    {row("AREA", data.area ? `${data.area.toLocaleString()} km²` : "N/A")}
                    {row("CURRENCIES", data.currencies?.join(", ") || "N/A")}
                    {row("BORDERS", data.borders?.join(", ") || "None")}
                    <div className="pt-2">
                        <div className="font-sans text-[0.5rem] font-semibold text-m3-primary uppercase tracking-widest mb-2 px-1">LANGUAGES</div>
                        <div className="flex flex-wrap gap-1 px-1">{data.languages?.map(l => pill(l)) || pill("N/A")}</div>
                    </div>
                </div>

                {data.intro && textBlock("BACKGROUND", data.intro, 3)}

                <div className="pt-2 border-t border-m3-outline-variant/30 space-y-1">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <span className="font-sans text-[0.5rem] font-semibold text-cyan-500 uppercase tracking-widest">PUBLIC HEALTH</span>
                        <button onClick={openHealthPopup} className="text-[0.5rem] bg-cyan-900/40 text-cyan-400 px-2 py-0.5 rounded hover:bg-cyan-800 transition-colors">DEEP DIVE</button>
                    </div>
                    {row("TOTAL CASES", data.publicHealth?.cases?.toLocaleString() || "N/A", "text-amber-400")}
                    {row("TOTAL DEATHS", data.publicHealth?.deaths?.toLocaleString() || "N/A", "text-red-400")}
                </div>
            </div>
        );
    };

    const renderGeography = () => {
        if (!data?.factbook?.Geography) return <div className="text-center py-8 text-[0.6rem] text-m3-on-surface-variant">NO DATA</div>;
        const g = data.factbook.Geography;
        return (
            <div className="space-y-2">
                {textBlock("LOCATION", g['Location']?.text, 3)}
                {textBlock("AREA & BOUNDARIES", g['Area']?.text + '<br/><br/>' + (g['Land boundaries']?.text || ''), 3)}
                {textBlock("CLIMATE", g['Climate']?.text)}
                {textBlock("TERRAIN & ELEVATION", g['Terrain']?.text + '<br/><br/>' + (g['Elevation']?.text || ''), 3)}
                {textBlock("NATURAL RESOURCES", g['Natural resources']?.text)}
                {textBlock("NATURAL HAZARDS", g['Natural hazards']?.text, 3)}
                {textBlock("ENVIRONMENTAL ISSUES", g['Environment - current issues']?.text, 3)}
            </div>
        );
    };

    const renderSociety = () => {
        if (!data?.factbook?.['People and Society']) return <div className="text-center py-8 text-[0.6rem] text-m3-on-surface-variant">NO DATA</div>;
        const p = data.factbook['People and Society'];
        return (
            <div className="space-y-2">
                {textBlock("ETHNIC GROUPS", p['Ethnic groups']?.text)}
                {textBlock("LANGUAGES", p['Languages']?.text)}
                {textBlock("RELIGIONS", p['Religions']?.text)}
                {textBlock("AGE STRUCTURE", p['Age structure']?.text, 3)}
                {textBlock("URBANIZATION", p['Urbanization']?.text)}
                {textBlock("LIFE EXPECTANCY", p['Life expectancy at birth']?.text)}
                {textBlock("INFANT MORTALITY", p['Infant mortality rate']?.text)}
                {textBlock("LITERACY", p['Literacy']?.text)}
            </div>
        );
    };

    const renderGovernment = () => {
        if (!data?.factbook?.Government) return <div className="text-center py-8 text-[0.6rem] text-m3-on-surface-variant">CLASSIFIED / UNAVAILABLE</div>;
        const gov = data.factbook.Government;
        
        const openChamberPopup = (name: string, title: string, chamber: any) => {
            if (!chamber) return;
            const textContent = 
                `<strong>Name:</strong> ${chamber['chamber name']?.text || chamber['legislature name']?.text || 'Unknown'}<br/>` +
                (chamber['number of seats']?.text ? `<strong>Seats:</strong> ${chamber['number of seats'].text}<br/>` : '') +
                (chamber['description']?.text ? `<strong>Description:</strong> ${chamber['description'].text}<br/>` : '') +
                (chamber['electoral system']?.text ? `<strong>Electoral System:</strong> ${chamber['electoral system'].text}<br/>` : '') +
                (chamber['elections']?.text ? `<strong>Elections:</strong> ${chamber['elections'].text}<br/>` : '') +
                (chamber['election results']?.text ? `<strong>Results:</strong> ${chamber['election results'].text}<br/>` : '') +
                (chamber['parties elected and seats per party']?.text ? `<strong>Parties:</strong> ${chamber['parties elected and seats per party'].text}<br/>` : '') +
                (chamber['percentage of women in chamber']?.text ? `<strong>Women (%):</strong> ${chamber['percentage of women in chamber'].text}<br/>` : '');

            setPopup({
                title: `${name.toUpperCase()} ASSEMBLY`,
                content: (
                    <div className="space-y-4">
                        <div className="text-[0.65rem] font-mono leading-relaxed text-justify whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: textContent }} />
                        <ParliamentChart text={chamber['parties elected and seats per party']?.text || chamber['election results']?.text || ''} />
                    </div>
                )
            });
        };

        const openExecutivePopup = () => {
            setPopup({
                title: "EXECUTIVE BRANCH",
                content: (
                    <div className="space-y-3">
                        {row("CHIEF OF STATE", gov['Executive branch']?.['chief of state']?.text)}
                        {row("HEAD OF GOV", gov['Executive branch']?.['head of government']?.text)}
                        {row("CABINET", gov['Executive branch']?.['cabinet']?.text)}
                        {row("ELECTIONS", gov['Executive branch']?.['elections/appointments']?.text)}
                        {row("ELECTION RESULTS", gov['Executive branch']?.['election results']?.text)}
                    </div>
                )
            });
        };

        
        const hasLegacyAssembly = !!gov['Legislative branch']?.['description'];
        const hasUpperChamber = !!gov['Legislative branch - upper chamber'];
        const hasLowerChamber = !!gov['Legislative branch - lower chamber'];
        const hasSingleChamber = !!gov['Legislative branch - single chamber'];

        return (
            <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-m3-surface-container border border-m3-outline p-2 rounded-card">
                        <div className="font-sans text-[0.45rem] font-medium text-m3-on-surface-variant uppercase tracking-wider mb-1">GOV TYPE</div>
                        <div className="font-mono text-[0.6rem] text-m3-on-surface truncate" dangerouslySetInnerHTML={{ __html: gov['Government type']?.text || "Unknown" }} />
                    </div>
                    <div className="bg-m3-surface-container border border-m3-outline p-2 rounded-card">
                        <div className="font-sans text-[0.45rem] font-medium text-m3-on-surface-variant uppercase tracking-wider mb-1">LEGAL SYSTEM</div>
                        <div className="font-mono text-[0.6rem] text-m3-on-surface truncate" dangerouslySetInnerHTML={{ __html: gov['Legal system']?.text?.split(';')[0] || "Unknown" }} />
                    </div>
                </div>

                <div className="space-y-2 mb-3">
                    <button onClick={openExecutivePopup} className="w-full bg-m3-primary/10 border border-m3-primary/30 p-3 rounded-card text-left hover:bg-m3-primary/20 transition-colors">
                        <div className="text-[0.55rem] font-bold text-m3-primary uppercase mb-1">EXECUTIVE BRANCH (PRESIDENT / PM)</div>
                        <div className="text-[0.6rem] font-mono text-m3-on-surface line-clamp-2" dangerouslySetInnerHTML={{ __html: gov['Executive branch']?.['chief of state']?.text || gov['Executive branch']?.['head of government']?.text || 'Classified' }} />
                    </button>
                    
                    {hasLegacyAssembly && (
                        <button onClick={() => openChamberPopup("Legislative", "Legislative", gov['Legislative branch'])} className="w-full bg-m3-primary/10 border border-m3-primary/30 p-3 rounded-card text-left hover:bg-m3-primary/20 transition-colors">
                            <div className="text-[0.55rem] font-bold text-m3-primary uppercase mb-1">LEGISLATIVE ASSEMBLY</div>
                            <div className="text-[0.6rem] font-mono text-m3-on-surface line-clamp-1" dangerouslySetInnerHTML={{ __html: gov['Legislative branch']?.['description']?.text || 'Classified' }} />
                        </button>
                    )}
                    {hasSingleChamber && (
                        <button onClick={() => openChamberPopup("National", "National", gov['Legislative branch - single chamber'])} className="w-full bg-m3-primary/10 border border-m3-primary/30 p-3 rounded-card text-left hover:bg-m3-primary/20 transition-colors">
                            <div className="text-[0.55rem] font-bold text-m3-primary uppercase mb-1">NATIONAL ASSEMBLY (SINGLE CHAMBER)</div>
                            <div className="text-[0.6rem] font-mono text-m3-on-surface line-clamp-1" dangerouslySetInnerHTML={{ __html: gov['Legislative branch - single chamber']?.['chamber name']?.text || 'Classified' }} />
                        </button>
                    )}
                    {hasLowerChamber && (
                        <button onClick={() => openChamberPopup("Lower", "Lower", gov['Legislative branch - lower chamber'])} className="w-full bg-m3-primary/10 border border-m3-primary/30 p-3 rounded-card text-left hover:bg-m3-primary/20 transition-colors">
                            <div className="text-[0.55rem] font-bold text-m3-primary uppercase mb-1">HOUSE / COMMONS (LOWER CHAMBER)</div>
                            <div className="text-[0.6rem] font-mono text-m3-on-surface line-clamp-1" dangerouslySetInnerHTML={{ __html: gov['Legislative branch - lower chamber']?.['chamber name']?.text || 'Classified' }} />
                        </button>
                    )}
                    {hasUpperChamber && (
                        <button onClick={() => openChamberPopup("Upper", "Upper", gov['Legislative branch - upper chamber'])} className="w-full bg-m3-primary/10 border border-m3-primary/30 p-3 rounded-card text-left hover:bg-m3-primary/20 transition-colors">
                            <div className="text-[0.55rem] font-bold text-m3-primary uppercase mb-1">SENATE / LORDS (UPPER CHAMBER)</div>
                            <div className="text-[0.6rem] font-mono text-m3-on-surface line-clamp-1" dangerouslySetInnerHTML={{ __html: gov['Legislative branch - upper chamber']?.['chamber name']?.text || 'Classified' }} />
                        </button>
                    )}
                </div>

                {textBlock("POLITICAL PARTIES", gov['Political parties and leaders']?.text || gov['Political parties']?.text, 4)}
                {textBlock("JUDICIAL BRANCH", gov['Judicial branch']?.text, 3)}
                {textBlock("ADMINISTRATIVE DIVISIONS", gov['Administrative divisions']?.text, 3)}
                {textBlock("DEPENDENT AREAS", gov['Dependent areas']?.text, 3)}
                {textBlock("CONSTITUTION", gov['Constitution']?.text, 3)}
            </div>
        );
    };

    const renderEconomy = () => {
        const e = data?.factbook?.Economy;
        return (
            <div className="space-y-1">
                {row("GDP TOTAL (WB)", formatGdp(data?.economy?.gdp || 0))}
                {row("UNEMPLOYMENT (WB)", data?.economy?.unemployment ? `${data.economy.unemployment.toFixed(1)}%` : "N/A")}
                {row("INFLATION (WB)", data?.economy?.inflation ? `${data.economy.inflation.toFixed(1)}%` : "N/A")}
                {e && (
                    <div className="mt-4 space-y-2 border-t border-m3-outline-variant/30 pt-4">
                        <div className="font-sans text-[0.6rem] font-bold text-m3-primary uppercase mb-2">FACTBOOK ECONOMY</div>
                        {textBlock("OVERVIEW", e['Economy - overview']?.text, 3)}
                        {textBlock("REAL GDP GROWTH", e['Real GDP growth rate']?.text)}
                        {textBlock("GDP PER CAPITA", e['Real GDP per capita']?.text)}
                        {textBlock("LABOR FORCE", e['Labor force']?.text)}
                        {textBlock("INDUSTRIES", e['Industries']?.text, 2)}
                        {textBlock("EXPORTS", e['Exports']?.text)}
                        {textBlock("EXPORTS PARTNERS", e['Exports - partners']?.text)}
                        {textBlock("IMPORTS", e['Imports']?.text)}
                        {textBlock("IMPORTS PARTNERS", e['Imports - partners']?.text)}
                    </div>
                )}
            </div>
        );
    };

    const renderEnergy = () => {
        const e = data?.factbook?.Energy;
        const renewable = [
            ["Nuclear", e?.['Electricity generation sources']?.['nuclear']?.text],
            ["Solar", e?.['Electricity generation sources']?.['solar']?.text],
            ["Wind", e?.['Electricity generation sources']?.['wind']?.text],
        ].filter((entry): entry is [string, string] => Boolean(entry[1])).map(([label, value]) => `${label}: ${value}`).join("<br/>");
        return (
            <div className="space-y-2">
                {render_domain_live("LIVE ENERGY SIGNALS", energy_live, "amber")}
                {active_geo?.energy_prices?.length ? (
                    <div className="mb-4">
                        <div className="mb-2 font-sans text-[0.55rem] font-bold uppercase tracking-widest text-m3-primary">GLOBAL ENERGY MARKET CONTEXT</div>
                        <div className="grid grid-cols-2 gap-2">
                            {active_geo.energy_prices.slice(0, 6).map(market => (
                                <div key={market.id} className="border border-m3-outline-variant/50 bg-m3-surface-container p-2 rounded-card">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate font-mono text-[0.5rem] text-m3-on-surface-variant">{market.symbol}</span>
                                        <span className={`font-mono text-[0.5rem] ${market.change_pct < 0 ? "text-red-400" : market.change_pct > 0 ? "text-emerald-400" : "text-m3-on-surface-variant"}`}>
                                            {market.change_pct > 0 ? "+" : ""}{market.change_pct}%
                                        </span>
                                    </div>
                                    <div className="mt-1 truncate font-mono text-[0.66rem] font-bold text-m3-on-surface">{market.price}</div>
                                    <div className="truncate text-[0.4rem] uppercase text-m3-on-surface-variant">{market.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
                {e ? (
                    <>
                        {textBlock("ELECTRICITY ACCESS", e['Electricity access']?.text)}
                        {textBlock("PRODUCTION / CONSUMPTION", join_html(e['Electricity']?.['production']?.text, e['Electricity']?.['consumption']?.text))}
                        {textBlock("FOSSIL FUELS", e['Electricity generation sources']?.['fossil fuels']?.text)}
                        {textBlock("RENEWABLES", renewable)}
                        {textBlock("CRUDE OIL", e['Crude oil']?.['production']?.text)}
                        {textBlock("NATURAL GAS", e['Natural gas']?.['production']?.text)}
                    </>
                ) : (
                    <div className="py-3 text-center font-mono text-[0.5rem] text-m3-on-surface-variant">reference energy profile unavailable</div>
                )}
            </div>
        );
    };

    const renderInfra = () => {
        const c = data?.factbook?.Communications;
        const t = data?.factbook?.Transportation;
        return (
            <div className="space-y-2">
                {render_domain_live("LIVE INFRASTRUCTURE SIGNALS", infra_live, "cyan")}
                {c ? (
                    <>
                        <div className="font-sans text-[0.6rem] font-bold text-m3-primary uppercase mb-2">COMMUNICATIONS</div>
                        {textBlock("TELEPHONES", join_html(c['Telephones - fixed lines']?.text, c['Telephones - mobile cellular']?.text))}
                        {textBlock("BROADCAST MEDIA", c['Broadcast media']?.text, 3)}
                        {textBlock("INTERNET", c['Internet users']?.text)}
                    </>
                ) : null}
                {t ? (
                    <>
                        <div className="font-sans text-[0.6rem] font-bold text-m3-primary uppercase mb-2 mt-4 pt-4 border-t border-m3-outline-variant/30">TRANSPORTATION</div>
                        {textBlock("AIRPORTS", t['Airports']?.text)}
                        {textBlock("ROADWAYS & RAILWAYS", join_html(t['Roadways']?.text, t['Railways']?.text))}
                        {textBlock("MERCHANT MARINE", t['Merchant marine']?.text, 3)}
                    </>
                ) : null}
                {!c && !t ? <div className="py-3 text-center font-mono text-[0.5rem] text-m3-on-surface-variant">reference infrastructure profile unavailable</div> : null}
            </div>
        );
    };

    const renderSecurity = () => {
        const m = data?.factbook?.['Military and Security'];
        const t = data?.factbook?.['Transnational Issues'];
        return (
            <div className="space-y-2">
                {render_domain_live("LIVE SECURITY SIGNALS", security_live, "red")}
                {row("ARMED FORCES PERSONNEL (WB)", data?.military?.armySize ? data?.military.armySize.toLocaleString() : "N/A")}
                {m && (
                    <div className="mt-4 space-y-2 border-t border-m3-outline-variant/30 pt-4">
                        <div className="font-sans text-[0.6rem] font-bold text-m3-primary uppercase mb-2">FACTBOOK SECURITY</div>
                        {textBlock("MILITARY FORCES", m['Military and security forces']?.text, 3)}
                        {textBlock("MILITARY EXPENDITURES", m['Military expenditures']?.text)}
                        {textBlock("EQUIPMENT INVENTORIES", m['Military equipment inventories and acquisitions']?.text, 3)}
                        {textBlock("TERRORISM", data?.factbook?.Terrorism?.['Terrorist group(s)']?.text, 3)}
                    </div>
                )}
                {t && (
                    <div className="mt-4 space-y-2 border-t border-m3-outline-variant/30 pt-4">
                        <div className="font-sans text-[0.6rem] font-bold text-m3-primary uppercase mb-2">TRANSNATIONAL ISSUES</div>
                        {textBlock("INTERNATIONAL DISPUTES", t['Disputes - international']?.text, 5)}
                        {textBlock("REFUGEES & IDPS", t['Refugees and internally displaced persons']?.text, 5)}
                        {textBlock("TRAFFICKING IN PERSONS", t['Trafficking in persons']?.text, 5)}
                        {textBlock("ILLICIT DRUGS", t['Illicit drugs']?.text, 5)}
                    </div>
                )}
                {!m && !t ? <div className="py-3 text-center font-mono text-[0.5rem] text-m3-on-surface-variant">reference security profile unavailable</div> : null}
            </div>
        );
    };

    const renderGeoIntel = () => {
        if (!active_geo) return (
            <div className="text-center py-8">
                <div className="font-mono text-[0.6rem] text-m3-on-surface-variant uppercase tracking-wider">NO GEO-INTEL FEED ACTIVE</div>
            </div>
        );
        return (
            <div className="space-y-3 font-mono">
                <div className="flex justify-between items-center bg-stone-900 p-2 border border-stone-800 rounded">
                    <span className="text-[0.6rem] text-stone-400 font-bold uppercase">STRATEGIC RISK SCORE</span>
                    <span className="text-lg font-bold text-red-500">{active_geo.risk.score} <span className="text-[0.5rem] text-stone-500">[{active_geo.risk.trend}]</span></span>
                </div>
                {active_geo.correlations.length > 0 && (
                    <div className="bg-purple-900/20 border border-purple-800/40 p-2 rounded">
                        <span className="text-[0.6rem] text-purple-400 font-bold uppercase block mb-1">CORRELATION</span>
                        <span className="text-[0.6rem] text-stone-300">{active_geo.correlations[0].interpretation}</span>
                    </div>
                )}
                <div className="bg-stone-900 p-2 border border-stone-800 rounded">
                    <span className="text-[0.6rem] text-stone-400 font-bold uppercase block mb-1">LIVE EVENTS</span>
                    <div className="space-y-1">
                        {active_geo.events.slice(0, 10).map(e => (
                            <div key={e.id} className="text-[0.55rem] flex gap-2">
                                <span className={`text-${e.severity === 'critical' ? 'red' : 'orange'}-500 font-bold`}>●</span>
                                <span className="text-stone-300 truncate">{e.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const render_country_intel = () => {
        if (!data || !country_live) return (
            <div className="text-center py-8">
                <div className="font-mono text-[0.6rem] text-m3-on-surface-variant uppercase tracking-wider">NO COUNTRY INTELLIGENCE AVAILABLE</div>
            </div>
        );
        const domainz = Object.entries(country_live.domains).sort((a, b) => b[1] - a[1]);
        const event_ids = new Set(country_live.events.map(event => event.id));
        const categoryz = new Set(country_live.events.map(event => event.category));
        const correlations = (active_geo?.correlations || []).filter(item =>
            item.event_ids.some(id => event_ids.has(id)) || item.categories.some(category => categoryz.has(category))
        );
        return (
            <div className="space-y-4 font-mono">
                <div className="grid grid-cols-4 gap-2">
                    {[
                        ["risk", country_live.risk_score, "text-orange-400"],
                        ["events", country_live.events.length, "text-cyan-400"],
                        ["critical", country_live.critical, "text-red-400"],
                        ["sources", country_live.sources, "text-emerald-400"],
                    ].map(([label, value, color]) => (
                        <div key={label} className="rounded-card border border-stone-800 bg-stone-900 p-2 text-center">
                            <div className={`text-sm font-bold ${color}`}>{value}</div>
                            <div className="text-[0.42rem] uppercase tracking-wider text-stone-500">{label}</div>
                        </div>
                    ))}
                </div>

                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[0.55rem] font-bold uppercase tracking-widest text-amber-400">Active domains</span>
                        <span className="text-[0.42rem] text-stone-600">{domainz.length} monitored</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        {domainz.length ? domainz.map(([domain, count]) => (
                            <div key={domain} className="flex items-center justify-between rounded border border-stone-800 bg-stone-900 px-2 py-1.5">
                                <span className="truncate text-[0.48rem] uppercase text-stone-400">{domain.replaceAll("_", " ")}</span>
                                <span className="text-[0.55rem] font-bold text-amber-400">{count}</span>
                            </div>
                        )) : (
                            <div className="col-span-2 py-2 text-center text-[0.5rem] text-stone-600">No active country-scoped domains.</div>
                        )}
                    </div>
                </div>

                {correlations.length > 0 && (
                    <div>
                        <span className="mb-2 block text-[0.55rem] font-bold uppercase tracking-widest text-purple-400">Cross-domain correlations</span>
                        <div className="space-y-1.5">
                            {correlations.slice(0, 4).map(item => (
                                <div key={item.id} className="rounded border border-purple-800/40 bg-purple-900/20 p-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[0.55rem] font-bold text-purple-300">{item.title}</span>
                                        <span className="text-[0.45rem] text-purple-400">{Math.round(item.confidence * 100)}%</span>
                                    </div>
                                    <div className="mt-1 text-[0.5rem] leading-relaxed text-stone-400">{item.interpretation}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[0.55rem] font-bold uppercase tracking-widest text-cyan-400">Latest news</span>
                        <span className="text-[0.42rem] text-stone-600">{country_live.latest_news.length} reports</span>
                    </div>
                    <div className="space-y-1.5">
                        {country_live.latest_news.length ? country_live.latest_news.map(news => (
                            <a key={news.id} href={news.source_url || "#"} target={news.source_url ? "_blank" : undefined} rel="noreferrer" className="block rounded border border-stone-800 bg-stone-900 p-2 hover:border-cyan-700">
                                <div className="text-[0.56rem] leading-snug text-stone-200">{news.title}</div>
                                <div className="mt-1 flex items-center justify-between gap-2 text-[0.42rem] uppercase text-stone-500">
                                    <span className="truncate">{news.source_name}</span>
                                    <span className="shrink-0">{format_age(news.published_at)}</span>
                                </div>
                            </a>
                        )) : <div className="py-2 text-center text-[0.5rem] text-stone-600">No current country news returned.</div>}
                    </div>
                </div>

                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[0.55rem] font-bold uppercase tracking-widest text-red-400">Ongoing activity</span>
                        <span className="text-[0.42rem] text-stone-600">live + reference signals</span>
                    </div>
                    <div className="space-y-1.5">
                        {country_live.events.length ? country_live.events.slice(0, 25).map(event => (
                            <div key={event.id} className="rounded border border-stone-800 bg-stone-900 p-2">
                                <div className="flex items-start gap-2">
                                    <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${event.severity === "critical" ? "bg-red-500" : event.severity === "high" ? "bg-orange-500" : event.severity === "elevated" ? "bg-amber-500" : "bg-cyan-500"}`} />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[0.56rem] leading-snug text-stone-200">{event.title}</div>
                                        {event.summary && event.summary !== event.title && <div className="mt-1 line-clamp-2 text-[0.48rem] leading-relaxed text-stone-500">{event.summary}</div>}
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.4rem] uppercase text-stone-600">
                                            <span className="border border-stone-700 px-1">{(event.layer_id || event.category || "event").replaceAll("_", " ")}</span>
                                            <span>{event.source_name}</span>
                                            <span>{format_age(event.published_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : <div className="py-2 text-center text-[0.5rem] text-stone-600">No ongoing country-scoped events in the current feed.</div>}
                    </div>
                </div>

                {active_geo?.source_health && (
                    <div className="border-t border-stone-800 pt-3">
                        <div className="mb-2 flex items-center justify-between text-[0.48rem] uppercase">
                            <span className="text-stone-500">Source health</span>
                            <span className="text-emerald-400">{active_geo.source_health.active_sources} live</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {active_geo.source_health.source_groups.map(source => (
                                <span key={source.name} className={`border px-1.5 py-0.5 text-[0.4rem] ${source.status === "live" ? "border-emerald-800 text-emerald-400" : source.status === "delayed" ? "border-amber-800 text-amber-400" : "border-red-800 text-red-400"}`}>
                                    {source.name} {source.count}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const content: Record<Tab, () => React.ReactNode> = {
        OVERVIEW: renderOverview,
        GEOGRAPHY: renderGeography,
        SOCIETY: renderSociety,
        GOVERNMENT: renderGovernment,
        ECONOMY: renderEconomy,
        ENERGY: renderEnergy,
        INFRA: renderInfra,
        SECURITY: renderSecurity,
        "GEO-INTEL": render_country_intel,
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
            {}
            <div className="absolute inset-0 bg-black/50 pointer-events-auto" onClick={() => popup ? setPopup(null) : onClose()} />

            {}
            <div className="relative flex max-h-[90vh] w-[680px] max-w-[94vw] flex-col overflow-hidden rounded-panel border border-m3-outline-variant bg-m3-surface text-m3-on-surface shadow-panel-sm pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
                {}
                <div className="px-5 py-4 border-b border-m3-outline-variant relative shrink-0">
                    <div className="flex items-center gap-3">
                        {data?.flag && <img src={data.flag} alt="" className="w-[36px] h-[24px] object-cover rounded-sm border border-m3-outline/40 shadow-sm" />}
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-[1rem] text-m3-on-surface uppercase tracking-wide truncate">
                                {data?.name || iso.toUpperCase()}
                            </div>
                            {data && (
                                <div className="text-[0.55rem] text-m3-on-surface-variant mt-0.5">
                                    {data.formalName}
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="absolute right-3 top-3 bg-transparent border-none text-m3-on-surface-variant cursor-pointer text-sm p-1.5 hover:text-m3-on-surface transition-colors">✕</button>
                </div>

                {}
                <div className="flex border-b border-m3-outline-variant bg-m3-surface-container/50 overflow-x-auto hide-scrollbar shrink-0">
                    {TABS.map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-none px-3 py-2.5 text-[0.55rem] font-semibold uppercase tracking-wider border-b-2 transition-colors ${tab === t
                                    ? "text-m3-primary border-m3-primary bg-m3-primary/5"
                                    : "text-m3-on-surface-variant border-transparent hover:text-m3-on-surface hover:bg-m3-surface-container"
                                }`}
                        >
                            <span className="flex items-center gap-1.5">
                                {t}
                                {tab_counts[t] !== undefined ? (
                                    <span className="min-w-4 border border-current/25 bg-black/15 px-1 py-0.5 font-mono text-[0.42rem] leading-none">
                                        {tab_counts[t]}
                                    </span>
                                ) : null}
                            </span>
                        </button>
                    ))}
                </div>

                {}
                <div className="relative flex-1 overflow-hidden">
                    <div className="px-5 py-4 overflow-y-auto h-full hide-scrollbar">
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="font-mono text-[0.6rem] text-m3-on-surface-variant uppercase tracking-wider">LOADING SECURE INTEL...</div>
                            </div>
                        ) : data ? (
                            content[tab]()
                        ) : (
                            <div className="text-center py-8">
                                <div className="font-mono text-[0.6rem] text-m3-on-surface-variant uppercase">CLASSIFIED / NO DATA</div>
                            </div>
                        )}
                    </div>

                    {}
                    {popup && (
                        <div className="absolute inset-0 z-50 bg-m3-surface flex flex-col animate-in slide-in-from-bottom-8 duration-200">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-m3-outline-variant bg-m3-surface-container shrink-0">
                                <span className="font-sans text-[0.6rem] font-bold text-m3-on-surface uppercase tracking-widest">{popup.title}</span>
                                <button onClick={() => setPopup(null)} className="text-m3-on-surface-variant hover:text-m3-on-surface text-sm font-bold">✕ CLOSE</button>
                            </div>
                            <div className="px-5 py-4 overflow-y-auto flex-1 hide-scrollbar bg-m3-surface">
                                {popup.content}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
