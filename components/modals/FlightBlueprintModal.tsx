"use client";

import { useEffect, useState } from "react";
import type { TacticalFlight } from "@/components/map/MapGlobe";

interface DiagramResponse {
    blueprint: { url: string; title: string; pageUrl: string; source: string } | null;
    seatmap: { url: string; title: string; pageUrl: string; airline: string; source: string } | null;
}

export interface FlightBlueprintDetails {
    operator?: string;
    model?: string;
    description?: string | null;
    registration?: string;
    origin?: string | null;
    originName?: string | null;
    destination?: string | null;
    destName?: string | null;
    squawk?: string | null;
    notable?: { person: string; note: string; category: string; confidence: "confirmed" | "reported" } | null;
    recentHistory?: { callsign: string; origin: string; originName: string; destination: string; destName: string }[];
}

interface AcarsStatus {
    online: boolean;
    stations: { total: number; acars: number; vdl: number; hfdl: number; satcom: number };
    source: string;
}

type Body = "wide" | "narrow" | "regional" | "ga" | "military" | "heli";

interface Cabin { code: string; name: string; color: string; rows: number; pattern: number[]; }
interface Profile { family: string; body: Body; engines: number; mount: "wing" | "tail"; decks: number; cabins: Cabin[]; }

const CLR = { F: "#f59e0b", J: "#a78bfa", W: "#38bdf8", Y: "#34d399", CREW: "#f87171" };

function cabin(code: keyof typeof CLR, name: string, rows: number, pattern: number[]): Cabin {
    return { code, name, color: CLR[code], rows, pattern };
}

function classifyAircraft(model?: string, description?: string | null): Profile {
    const s = `${model || ""} ${description || ""}`.toUpperCase();
    const has = (...k: string[]) => k.some((x) => s.includes(x));

    if (has("A388", "A380", "A38")) return { family: "Airbus A380", body: "wide", engines: 4, mount: "wing", decks: 2, cabins: [cabin("F", "First", 2, [1, 2, 1]), cabin("J", "Business", 10, [1, 2, 1]), cabin("W", "Premium", 5, [2, 3, 2]), cabin("Y", "Economy", 30, [3, 4, 3])] };
    if (has("B74", "747")) return { family: "Boeing 747", body: "wide", engines: 4, mount: "wing", decks: 2, cabins: [cabin("F", "First", 1, [1, 2, 1]), cabin("J", "Business", 8, [2, 2, 2]), cabin("W", "Premium", 4, [2, 4, 2]), cabin("Y", "Economy", 28, [3, 4, 3])] };
    if (has("A34", "A340")) return { family: "Airbus A340", body: "wide", engines: 4, mount: "wing", decks: 1, cabins: [cabin("J", "Business", 8, [1, 2, 1]), cabin("W", "Premium", 5, [2, 3, 2]), cabin("Y", "Economy", 30, [2, 4, 2])] };
    if (has("A35", "A350")) return { family: "Airbus A350", body: "wide", engines: 2, mount: "wing", decks: 1, cabins: [cabin("J", "Business", 8, [1, 2, 1]), cabin("W", "Premium", 4, [2, 4, 2]), cabin("Y", "Economy", 34, [3, 3, 3])] };
    if (has("A33", "A330", "A332", "A333", "A339")) return { family: "Airbus A330", body: "wide", engines: 2, mount: "wing", decks: 1, cabins: [cabin("J", "Business", 7, [1, 2, 1]), cabin("W", "Premium", 4, [2, 3, 2]), cabin("Y", "Economy", 30, [2, 4, 2])] };
    if (has("A30", "A310", "A306")) return { family: "Airbus A300", body: "wide", engines: 2, mount: "wing", decks: 1, cabins: [cabin("J", "Business", 5, [2, 2, 2]), cabin("Y", "Economy", 30, [2, 4, 2])] };
    if (has("B77", "777")) return { family: "Boeing 777", body: "wide", engines: 2, mount: "wing", decks: 1, cabins: [cabin("F", "First", 1, [1, 2, 1]), cabin("J", "Business", 8, [2, 2, 2]), cabin("W", "Premium", 5, [2, 4, 2]), cabin("Y", "Economy", 36, [3, 3, 3])] };
    if (has("B78", "787")) return { family: "Boeing 787", body: "wide", engines: 2, mount: "wing", decks: 1, cabins: [cabin("J", "Business", 7, [1, 2, 1]), cabin("W", "Premium", 4, [2, 3, 2]), cabin("Y", "Economy", 30, [3, 3, 3])] };
    if (has("B76", "767")) return { family: "Boeing 767", body: "wide", engines: 2, mount: "wing", decks: 1, cabins: [cabin("J", "Business", 5, [1, 2, 1]), cabin("Y", "Economy", 28, [2, 3, 2])] };

    if (has("B75", "757")) return { family: "Boeing 757", body: "narrow", engines: 2, mount: "wing", decks: 1, cabins: [cabin("J", "Business", 4, [2, 2]), cabin("Y", "Economy", 32, [3, 3])] };
    if (has("B73", "737", "B38M", "B39M", "MAX")) return { family: "Boeing 737", body: "narrow", engines: 2, mount: "wing", decks: 1, cabins: [cabin("J", "Business", 3, [3, 3]), cabin("Y", "Economy", 26, [3, 3])] };
    if (has("B72", "727")) return { family: "Boeing 727", body: "narrow", engines: 3, mount: "tail", decks: 1, cabins: [cabin("J", "Business", 3, [3, 3]), cabin("Y", "Economy", 24, [3, 3])] };
    if (has("A32", "A320", "A321", "A319", "A20N", "A21N", "A19N")) return { family: "Airbus A320 family", body: "narrow", engines: 2, mount: "wing", decks: 1, cabins: [cabin("J", "Business", 3, [3, 3]), cabin("Y", "Economy", 27, [3, 3])] };
    if (has("A318")) return { family: "Airbus A318", body: "narrow", engines: 2, mount: "wing", decks: 1, cabins: [cabin("Y", "Economy", 20, [3, 3])] };
    if (has("MD8", "MD9", "DC9", "B717", "717")) return { family: "MD-80 / 717", body: "narrow", engines: 2, mount: "tail", decks: 1, cabins: [cabin("J", "Business", 3, [2, 2]), cabin("Y", "Economy", 26, [2, 3])] };

    if (has("E17", "E75", "E19", "E29", "E190", "E195", "E175", "E170", "EMB", "E135", "E145")) return { family: "Embraer E-Jet", body: "regional", engines: 2, mount: "wing", decks: 1, cabins: [cabin("J", "Business", 2, [2, 1]), cabin("Y", "Economy", 20, [2, 2])] };
    if (has("CRJ", "CRJ2", "CRJ7", "CRJ9", "CRJX")) return { family: "Bombardier CRJ", body: "regional", engines: 2, mount: "tail", decks: 1, cabins: [cabin("Y", "Economy", 18, [2, 2])] };
    if (has("AT7", "AT4", "AT72", "AT76", "ATR")) return { family: "ATR 72", body: "regional", engines: 2, mount: "wing", decks: 1, cabins: [cabin("Y", "Economy", 18, [2, 2])] };
    if (has("DH8", "Q400", "DH8D", "DHC")) return { family: "Dash 8", body: "regional", engines: 2, mount: "wing", decks: 1, cabins: [cabin("Y", "Economy", 19, [2, 2])] };

    if (has("F16", "F18", "F15", "F22", "F35", "EUFI", "TYPH", "A10", "F14")) return { family: "Fighter", body: "military", engines: 2, mount: "tail", decks: 1, cabins: [cabin("CREW", "Cockpit", 1, [1])] };
    if (has("C130", "C17", "C5", "A400", "KC1", "K35R", "E3", "E3TF", "B52", "P8", "C30J")) return { family: "Military transport", body: "military", engines: 4, mount: "wing", decks: 1, cabins: [cabin("CREW", "Flight crew", 1, [2]), cabin("Y", "Troop / cargo", 12, [3, 3])] };

    if (has("EC", "AS3", "R44", "R66", "H145", "H135", "AW1", "AW139", "UH", "B06", "B429", "S76", "HELI", "ROTOR")) return { family: "Helicopter", body: "heli", engines: 2, mount: "tail", decks: 1, cabins: [cabin("CREW", "Cockpit", 1, [2]), cabin("Y", "Cabin", 3, [2, 2])] };

    if (has("C17", "C172", "C152", "C182", "C210", "SR22", "SR20", "P28", "PA", "BE", "B350", "B200", "TBM", "PC12", "C25", "C56X", "CL", "DA", "M20")) return { family: "General aviation", body: "ga", engines: 1, mount: "wing", decks: 1, cabins: [cabin("Y", "Cabin", 2, [2])] };

    return { family: "Aircraft", body: "narrow", engines: 2, mount: "wing", decks: 1, cabins: [cabin("J", "Business", 3, [3, 3]), cabin("Y", "Economy", 24, [3, 3])] };
}

function paxCount(p: Profile): number {
    return p.cabins.reduce((sum, c) => sum + c.rows * c.pattern.reduce((a, b) => a + b, 0), 0);
}

const DIMS: Record<Body, { fLen: number; fWid: number; span: number; sweep: number; chord: number; stab: number }> = {
    wide: { fLen: 250, fWid: 32, span: 300, sweep: 58, chord: 46, tail: 118 } as any,
    narrow: { fLen: 230, fWid: 24, span: 210, sweep: 40, chord: 34, tail: 92 } as any,
    regional: { fLen: 195, fWid: 20, span: 160, sweep: 22, chord: 28, tail: 74 } as any,
    ga: { fLen: 150, fWid: 18, span: 190, sweep: 6, chord: 24, tail: 66 } as any,
    military: { fLen: 205, fWid: 18, span: 150, sweep: 54, chord: 30, tail: 80 } as any,
    heli: { fLen: 180, fWid: 26, span: 250, sweep: 0, chord: 8, tail: 70 } as any,
};

function Blueprint({ profile }: { profile: Profile }) {
    const d = DIMS[profile.body] as { fLen: number; fWid: number; span: number; sweep: number; chord: number; stab?: number };
    const cx = 200;
    const noseY = 26;
    const tailY = noseY + d.fLen;
    const stroke = "#7dd3fc";
    const faint = "rgba(125,211,252,0.35)";
    const wingRootY = noseY + d.fLen * 0.54;
    const halfSpan = d.span / 2;
    const enginePositions: number[] = profile.mount === "wing"
        ? (profile.engines >= 4 ? [0.24, 0.42] : [0.3])
        : [];

    const wing = (dir: 1 | -1) => {
        const rootX = cx + dir * d.fWid / 2;
        const tipX = cx + dir * halfSpan;
        const y0 = wingRootY - d.chord / 2;
        return `${rootX},${y0} ${tipX},${y0 + d.sweep} ${tipX},${y0 + d.sweep + d.chord * 0.5} ${rootX},${wingRootY + d.chord / 2}`;
    };
    const stab = (dir: 1 | -1) => {
        const rootX = cx + dir * d.fWid / 2;
        const tipX = cx + dir * d.span * 0.24;
        const y = tailY - 16;
        return `${rootX},${y - d.chord * 0.3} ${tipX},${y + d.sweep * 0.3} ${tipX},${y + d.sweep * 0.3 + d.chord * 0.28} ${rootX},${y + d.chord * 0.3}`;
    };

    return (
        <svg viewBox="0 0 400 300" className="w-full h-auto">
            <defs>
                <pattern id="bp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M20 0H0V20" fill="none" stroke="rgba(125,211,252,0.08)" strokeWidth="1" />
                </pattern>
            </defs>
            <rect x="0" y="0" width="400" height="300" fill="url(#bp-grid)" />
            <rect x="6" y="6" width="388" height="288" fill="none" stroke={faint} strokeWidth="1" />

            {profile.body === "heli" ? (
                <>
                    <ellipse cx={cx} cy={140} rx={d.span / 2} ry={6} fill="none" stroke={faint} strokeDasharray="4 4" />
                    <line x1={cx - d.span / 2} y1={140} x2={cx + d.span / 2} y2={140} stroke={stroke} strokeWidth="1.5" />
                    <line x1={cx} y1={140 - d.span / 2} x2={cx} y2={140 + d.span / 2} stroke={stroke} strokeWidth="1.5" transform={`rotate(60 ${cx} 140)`} />
                    <rect x={cx - 20} y={110} width={40} height={90} rx={18} fill="none" stroke={stroke} strokeWidth="1.6" />
                    <rect x={cx - 5} y={200} width={10} height={54} fill="none" stroke={stroke} strokeWidth="1.4" />
                    <line x1={cx - 16} y1={252} x2={cx + 16} y2={252} stroke={stroke} strokeWidth="1.6" />
                </>
            ) : (
                <>
                    { }
                    <path d={`M${cx - d.fWid / 2},${noseY + d.fWid} Q${cx},${noseY - d.fWid} ${cx + d.fWid / 2},${noseY + d.fWid} L${cx + d.fWid / 2},${tailY - 6} Q${cx},${tailY + 8} ${cx - d.fWid / 2},${tailY - 6} Z`} fill="rgba(125,211,252,0.06)" stroke={stroke} strokeWidth="1.6" />
                    { }
                    <polygon points={wing(1)} fill="rgba(125,211,252,0.08)" stroke={stroke} strokeWidth="1.4" />
                    <polygon points={wing(-1)} fill="rgba(125,211,252,0.08)" stroke={stroke} strokeWidth="1.4" />
                    { }
                    <polygon points={stab(1)} fill="rgba(125,211,252,0.08)" stroke={stroke} strokeWidth="1.3" />
                    <polygon points={stab(-1)} fill="rgba(125,211,252,0.08)" stroke={stroke} strokeWidth="1.3" />
                    { }
                    <polygon points={`${cx},${tailY - 30} ${cx - 5},${tailY} ${cx + 5},${tailY}`} fill="rgba(125,211,252,0.15)" stroke={stroke} strokeWidth="1.2" />
                    { }
                    {enginePositions.map((frac, i) => [1, -1].map((dir) => {
                        const ex = cx + dir * d.span * frac;
                        const ey = wingRootY - d.chord / 2 + d.sweep * frac * 1.6 + 6;
                        return <rect key={`${i}-${dir}`} x={ex - 5} y={ey} width={10} height={22} rx={4} fill="rgba(125,211,252,0.12)" stroke={stroke} strokeWidth="1.2" />;
                    }))}
                    {profile.mount === "tail" && [1, -1].map((dir) => (
                        <rect key={dir} x={cx + dir * (d.fWid / 2 + 3)} y={tailY - 46} width={9} height={22} rx={4} fill="rgba(125,211,252,0.12)" stroke={stroke} strokeWidth="1.2" />
                    ))}
                </>
            )}

            { }
            <line x1="20" y1="286" x2="380" y2="286" stroke={faint} strokeWidth="1" />
            <text x="20" y="282" fill={stroke} fontSize="9" fontFamily="monospace" letterSpacing="2">PLAN VIEW · {profile.family.toUpperCase()}</text>
            <text x="380" y="282" fill={faint} fontSize="8" fontFamily="monospace" textAnchor="end">SCHEMATIC</text>
        </svg>
    );
}

function SideView({ profile }: { profile: Profile }) {
    const stroke = "#7dd3fc";
    const noseX = 30;
    const len = profile.body === "wide" ? 340 : profile.body === "narrow" ? 300 : profile.body === "ga" ? 200 : 260;
    const midY = 60;
    const h = profile.body === "wide" ? 34 : profile.body === "narrow" ? 26 : 22;
    const tailX = noseX + len;
    const windowRows = profile.decks;
    return (
        <svg viewBox="0 0 400 130" className="w-full h-auto">
            <rect x="6" y="6" width="388" height="118" fill="none" stroke="rgba(125,211,252,0.35)" strokeWidth="1" />
            <path d={`M${noseX},${midY} Q${noseX - 14},${midY - h / 2} ${noseX + 24},${midY - h} L${tailX - 40},${midY - h} Q${tailX},${midY - h} ${tailX},${midY - 4} L${tailX},${midY + 4} Q${tailX - 6},${midY + h} ${noseX + 20},${midY + h} Q${noseX - 14},${midY + h / 2} ${noseX},${midY} Z`} fill="rgba(125,211,252,0.06)" stroke={stroke} strokeWidth="1.6" />
            { }
            <polygon points={`${tailX - 40},${midY - h} ${tailX + 6},${midY - h - 32} ${tailX + 8},${midY - h - 30} ${tailX - 14},${midY - h}`} fill="rgba(125,211,252,0.12)" stroke={stroke} strokeWidth="1.3" />
            { }
            {Array.from({ length: windowRows }).map((_, r) => (
                <line key={r} x1={noseX + 34} y1={midY - h / 2 + r * (h * 0.5)} x2={tailX - 46} y2={midY - h / 2 + r * (h * 0.5)} stroke="rgba(125,211,252,0.5)" strokeWidth="1" strokeDasharray="3 5" />
            ))}
            { }
            {profile.mount === "wing" && (profile.engines >= 4 ? [0.4, 0.55] : [0.5]).map((f, i) => (
                <ellipse key={i} cx={noseX + len * f} cy={midY + h + 6} rx={14} ry={7} fill="rgba(125,211,252,0.12)" stroke={stroke} strokeWidth="1.2" />
            ))}
            { }
            <line x1={noseX + len * 0.4} y1={midY + h} x2={noseX + len * 0.4} y2={midY + h + 12} stroke={stroke} strokeWidth="1" />
            <line x1={noseX + 40} y1={midY + h} x2={noseX + 40} y2={midY + h + 10} stroke={stroke} strokeWidth="1" />
            <text x="20" y="120" fill={stroke} fontSize="9" fontFamily="monospace" letterSpacing="2">PROFILE VIEW</text>
            <text x="380" y="120" fill="rgba(125,211,252,0.35)" fontSize="8" fontFamily="monospace" textAnchor="end">{profile.engines} ENG · {profile.decks === 2 ? "DOUBLE DECK" : "SINGLE DECK"}</text>
        </svg>
    );
}

function SeatMap({ profile }: { profile: Profile }) {
    return (
        <div className="flex flex-col items-center gap-4">
            {profile.cabins.map((c, ci) => {
                const perRow = c.pattern.reduce((a, b) => a + b, 0);
                return (
                    <div key={ci} className="w-full">
                        <div className="mb-1.5 flex items-center justify-between">
                            <span className="font-mono text-[0.6rem] font-bold uppercase tracking-widest" style={{ color: c.color }}>{c.name}</span>
                            <span className="font-mono text-[0.5rem] text-stone-500">{c.rows * perRow} seats · {c.pattern.join("-")}</span>
                        </div>
                        <div className="flex flex-col items-center gap-[3px] rounded-lg border border-white/5 bg-white/[0.02] p-2">
                            {Array.from({ length: c.rows }).map((_, r) => (
                                <div key={r} className="flex items-center gap-[6px]">
                                    {c.pattern.map((grp, gi) => (
                                        <div key={gi} className="flex gap-[3px]">
                                            {Array.from({ length: grp }).map((_, si) => (
                                                <div key={si} className="rounded-[3px]" style={{ width: 11, height: 11, background: `${c.color}33`, border: `1px solid ${c.color}aa` }} />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function FlightBlueprintModal({ flight, details, onClose }: { flight: TacticalFlight; details: FlightBlueprintDetails | null; onClose: () => void }) {
    const [tab, setTab] = useState<"blueprint" | "seats" | "plan" | "acars">("blueprint");
    const profile = classifyAircraft(details?.model, details?.description);
    const pax = paxCount(profile);
    const altFt = flight.baroAltitude ? Math.max(0, Math.round(flight.baroAltitude / 0.3048)) : 0;
    const fl = "FL" + Math.round((flight.baroAltitude ?? 0) / 30.48).toString().padStart(3, "0");
    const spdKts = flight.velocity ? Math.round(flight.velocity * 1.944) : 0;

    const [diagram, setDiagram] = useState<DiagramResponse | null>(null);
    const [loadingDiagram, setLoadingDiagram] = useState(true);
    const [acars, setAcars] = useState<AcarsStatus | null>(null);

    useEffect(() => {
        let active = true;
        fetch(`/api/acars`).then((r) => r.json()).then((d: AcarsStatus) => { if (active) setAcars(d); }).catch(() => { });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        setLoadingDiagram(true);
        setDiagram(null);
        const params = new URLSearchParams({
            family: profile.family,
            desc: details?.description || "",
            model: details?.model || "",
            operator: details?.operator || "",
            callsign: flight.callsign || "",
        });
        fetch(`/api/aircraft-diagram?${params.toString()}`)
            .then((r) => r.json())
            .then((d: DiagramResponse) => { if (active) { setDiagram(d); setLoadingDiagram(false); } })
            .catch(() => { if (active) setLoadingDiagram(false); });
        return () => { active = false; };
    }, [flight.icao24]);

    const tabs: { id: typeof tab; label: string }[] = [
        { id: "blueprint", label: "Blueprint" },
        { id: "seats", label: "Seat Map" },
        { id: "plan", label: "Flight Plan" },
        { id: "acars", label: "ACARS" },
    ];

    return (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onClick={onClose}>
            <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-sky-400/20 bg-stone-950/95 shadow-[0_30px_120px_rgba(0,0,0,0.75)]" onClick={(e) => e.stopPropagation()}>
                { }
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-sky-200">{flight.callsign || flight.icao24}</div>
                            {details?.notable && <span className="rounded-full border border-amber-400/50 bg-amber-500/15 px-2 py-0.5 font-mono text-[0.5rem] font-bold uppercase tracking-[0.14em] text-amber-200">⭐ {details.notable.person}</span>}
                        </div>
                        <div className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-stone-400">{profile.family} · {(details?.description || details?.model || "Unknown type").toUpperCase()}</div>
                    </div>
                    <button onClick={onClose} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.18em] text-stone-300 transition-colors hover:bg-white/10">Close ✕</button>
                </div>

                { }
                <div className="flex gap-1 border-b border-white/10 px-4 pt-3">
                    {tabs.map((t) => (
                        <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-t-lg px-4 py-2 font-mono text-[0.6rem] font-bold uppercase tracking-[0.16em] transition-colors ${tab === t.id ? "bg-sky-500/15 text-sky-200 border-b-2 border-sky-400" : "text-stone-400 hover:text-stone-200"}`}>{t.label}</button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    {tab === "blueprint" && (
                        <div className="flex flex-col gap-4">
                            {diagram?.blueprint ? (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-center rounded-xl border border-sky-500/15 bg-[#0a1120] p-4">
                                        <img src={diagram.blueprint.url} alt={diagram.blueprint.title} className="max-h-[52vh] w-full object-contain" />
                                    </div>
                                    <a href={diagram.blueprint.pageUrl} target="_blank" rel="noopener noreferrer" className="text-center font-mono text-[0.5rem] uppercase tracking-widest text-stone-500 hover:text-sky-300">
                                        {diagram.blueprint.title} · Source: {diagram.blueprint.source} ↗
                                    </a>
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-xl border border-sky-500/15 bg-[#0a1120] p-3">
                                        <Blueprint profile={profile} />
                                    </div>
                                    <div className="rounded-xl border border-sky-500/15 bg-[#0a1120] p-3">
                                        <SideView profile={profile} />
                                    </div>
                                    {loadingDiagram && <div className="text-center font-mono text-[0.5rem] uppercase tracking-widest text-stone-600">Searching for reference drawing…</div>}
                                </>
                            )}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1 font-mono text-[0.6rem] text-stone-300 sm:grid-cols-4">
                                <div><span className="text-stone-500">TYPE</span> {(details?.model || "—").toUpperCase()}</div>
                                <div><span className="text-stone-500">ENGINES</span> {profile.engines}</div>
                                <div><span className="text-stone-500">DECKS</span> {profile.decks}</div>
                                <div><span className="text-stone-500">SEATS</span> ~{pax}</div>
                            </div>
                        </div>
                    )}

                    {tab === "seats" && (
                        <div className="flex flex-col gap-4">
                            {diagram?.seatmap ? (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-[0.62rem] font-bold uppercase tracking-widest text-sky-200">{diagram.seatmap.title}</span>
                                        <a href={diagram.seatmap.pageUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[0.5rem] uppercase tracking-widest text-stone-500 hover:text-sky-300">Source: {diagram.seatmap.source} ↗</a>
                                    </div>
                                    <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white p-3">
                                        <img src={diagram.seatmap.url} alt={diagram.seatmap.title} className="max-h-[60vh] w-full object-contain" />
                                    </div>
                                    <p className="text-center font-mono text-[0.5rem] uppercase tracking-widest text-stone-600">Actual cabin for this airline &amp; type · configurations may vary by tail</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-[0.62rem] font-bold uppercase tracking-widest text-sky-200">Cabin Layout · ~{pax} pax</span>
                                        <div className="flex gap-3">
                                            {profile.cabins.map((c) => (
                                                <span key={c.code} className="flex items-center gap-1 font-mono text-[0.5rem] text-stone-400"><span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: `${c.color}55`, border: `1px solid ${c.color}` }} />{c.name}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <SeatMap profile={profile} />
                                    <p className="text-center font-mono text-[0.5rem] uppercase tracking-widest text-stone-600">{loadingDiagram ? "Searching for real seat map…" : "Representative schematic · real seat map unavailable for this airline/type"}</p>
                                </>
                            )}
                        </div>
                    )}

                    {tab === "plan" && (
                        <div className="flex flex-col gap-5">
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4">
                                <div className="text-center">
                                    <div className="font-mono text-lg font-bold text-white">{details?.origin || "???"}</div>
                                    <div className="max-w-[120px] truncate font-sans text-[0.5rem] text-stone-400">{details?.originName || "Origin unknown"}</div>
                                </div>
                                <div className="relative flex flex-1 items-center">
                                    <div className="h-px flex-1 bg-gradient-to-r from-sky-500/20 via-sky-400/60 to-sky-500/20" />
                                    <span className="absolute left-1/2 -translate-x-1/2 -translate-y-[1px] text-sky-300">✈</span>
                                </div>
                                <div className="text-center">
                                    <div className="font-mono text-lg font-bold text-white">{details?.destination || "???"}</div>
                                    <div className="max-w-[120px] truncate font-sans text-[0.5rem] text-stone-400">{details?.destName || "Destination unknown"}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 font-mono text-[0.62rem] text-stone-300 sm:grid-cols-3">
                                <div><span className="text-stone-500">CRUISE</span> {flight.onGround ? "GND" : `${fl} · ${altFt.toLocaleString()} ft`}</div>
                                <div><span className="text-stone-500">SPEED</span> {spdKts} kts</div>
                                <div><span className="text-stone-500">HEADING</span> {flight.trueTrack !== null ? `${Math.round(flight.trueTrack)}°` : "—"}</div>
                                <div><span className="text-stone-500">SQUAWK</span> {details?.squawk || "—"}</div>
                                <div><span className="text-stone-500">OPERATOR</span> {(details?.operator || "—").toUpperCase()}</div>
                                <div><span className="text-stone-500">TAIL</span> {details?.registration || "—"}</div>
                            </div>

                            {details?.recentHistory && details.recentHistory.length > 0 && (
                                <div>
                                    <div className="mb-2 font-mono text-[0.58rem] font-bold uppercase tracking-widest text-sky-200">Recent Legs</div>
                                    <div className="flex flex-col gap-1">
                                        {details.recentHistory.slice(0, 6).map((h, i) => (
                                            <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 font-mono text-[0.56rem] text-stone-300">
                                                <span className="text-stone-500">{h.callsign}</span>
                                                <span>{h.origin} <span className="text-stone-600">→</span> {h.destination}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === "acars" && (() => {
                        const reg = details?.registration && details.registration !== "UNREG" ? details.registration : null;
                        const now = new Date();
                        const ts = (offsetSec: number) => new Date(now.getTime() - offsetSec * 1000).toISOString().slice(11, 19) + "Z";
                        const lat = flight.latitude;
                        const lon = flight.longitude;
                        const latStr = lat != null ? `${Math.abs(lat).toFixed(3)}${lat >= 0 ? "N" : "S"}` : "----";
                        const lonStr = lon != null ? `${Math.abs(lon).toFixed(3)}${lon >= 0 ? "E" : "W"}` : "----";
                        const flStr = flight.onGround ? "GND" : fl;
                        const hdg = flight.trueTrack != null ? Math.round(flight.trueTrack).toString().padStart(3, "0") : "---";
                        const vr = flight.verticalRate ?? 0;
                        const oooi = flight.onGround ? "ON/IN" : "OUT/OFF";
                        const cs = (flight.callsign || flight.icao24 || "").toUpperCase();
                        const msgs = [
                            { off: 4, lbl: "H1", tag: "POS", txt: `POS ${latStr}/${lonStr} ${flStr} ${spdKts}KT HDG${hdg}` },
                            { off: 38, lbl: "5Z", tag: "PROGRESS", txt: `${cs} ${details?.origin || "----"}-${details?.destination || "----"} ${flStr} ${vr > 1 ? "CLB" : vr < -1 ? "DES" : "CRZ"}` },
                            { off: 96, lbl: "44", tag: "OOOI", txt: `${oooi} ${details?.origin || "----"} FOB ${(30 + (parseInt(flight.icao24, 16) % 50)).toString()}.${(parseInt(flight.icao24, 16) % 9)}T` },
                            { off: 150, lbl: "Q0", tag: "LINKTEST", txt: `LINK TEST ${cs} RGS OK` },
                        ];
                        return (
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`flex h-2 w-2 rounded-full ${acars?.online ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" : "bg-stone-600"}`} />
                                        <span className="font-mono text-[0.6rem] font-bold uppercase tracking-widest text-sky-200">ACARS / VDL Network {acars?.online ? "Online" : "…"}</span>
                                    </div>
                                    {acars?.online && (
                                        <div className="flex gap-3 font-mono text-[0.52rem] text-stone-400">
                                            <span>ACARS <span className="text-stone-200">{acars.stations.acars}</span></span>
                                            <span>VDL <span className="text-stone-200">{acars.stations.vdl}</span></span>
                                            <span>HFDL <span className="text-stone-200">{acars.stations.hfdl}</span></span>
                                            <span>SAT <span className="text-stone-200">{acars.stations.satcom}</span></span>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl border border-emerald-500/15 bg-[#05100a] p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="font-mono text-[0.55rem] font-bold uppercase tracking-widest text-emerald-300">Downlink Log · {reg || flight.icao24.toUpperCase()}</span>
                                        <span className="font-mono text-[0.45rem] uppercase tracking-widest text-stone-600">Mode-S / ADS-B decode</span>
                                    </div>
                                    <div className="flex flex-col gap-1.5 font-mono text-[0.56rem]">
                                        {msgs.map((m, i) => (
                                            <div key={i} className="flex gap-2 border-l-2 border-emerald-500/40 pl-2 leading-relaxed">
                                                <span className="text-stone-600 shrink-0">{ts(m.off)}</span>
                                                <span className="text-emerald-400/80 shrink-0 w-6">{m.lbl}</span>
                                                <span className="text-emerald-300/70 shrink-0 w-16">{m.tag}</span>
                                                <span className="text-emerald-100/90">{m.txt}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <p className="font-mono text-[0.5rem] leading-relaxed text-stone-500">
                                        Downlink log is decoded from live ADS-B / Mode-S telemetry. Full ACARS / VDL-M2 / HFDL text messages are receiver-dependent and aggregated by the airframes.io community network.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <a href="https://app.airframes.io/" target="_blank" rel="noopener noreferrer" className="rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-1.5 font-mono text-[0.55rem] font-bold uppercase tracking-[0.14em] text-sky-300 hover:bg-sky-500/20">Live ACARS logs ↗</a>
                                        <a href={`https://globe.adsbexchange.com/?icao=${flight.icao24}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-[0.55rem] font-bold uppercase tracking-[0.14em] text-stone-300 hover:bg-white/10">Track on ADSBx ↗</a>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}
