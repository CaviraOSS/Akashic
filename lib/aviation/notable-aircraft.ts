// Curated, verified associations between aircraft and notable owners/operators.
// Each entry was cross-checked against adsbdb (registration -> hex/type/owner).
// "confirmed" = registered owner corroborates the person/organisation.
// "reported"  = widely and publicly reported by aircraft trackers / press.

export interface NotableAircraft {
    hex: string;        // ICAO 24-bit (lowercase)
    reg: string;        // registration / tail (uppercase, no spaces)
    person: string;
    note: string;
    category: "politics" | "music" | "business" | "media" | "sports" | "celebrity" | "government" | "military";
    confidence: "confirmed" | "reported";
}

export const NOTABLE_AIRCRAFT: NotableAircraft[] = [
    { hex: "aa3410", reg: "N757AF", person: "Donald Trump", note: "Boeing 757-200 · \u201cTrump Force One\u201d", category: "politics", confidence: "confirmed" },
    { hex: "ac64c6", reg: "N898TS", person: "Taylor Swift", note: "Dassault Falcon 900 · Firefly Entertainment", category: "music", confidence: "confirmed" },
    { hex: "a835af", reg: "N628TS", person: "Taylor Swift", note: "Gulfstream G650ER", category: "music", confidence: "reported" },
    { hex: "a000e8", reg: "N1KE", person: "Nike / Phil Knight", note: "Gulfstream G650 · Nike Inc", category: "business", confidence: "confirmed" },
    { hex: "a6d9e0", reg: "N540W", person: "Oprah Winfrey", note: "Gulfstream G650ER", category: "media", confidence: "confirmed" },
    { hex: "a988ec", reg: "N713TS", person: "Travis Scott", note: "Embraer Lineage 1000 · \u201cCactus Jack\u201d", category: "music", confidence: "confirmed" },
    { hex: "aa5bc4", reg: "N767CJ", person: "Drake", note: "Boeing 767-200 · \u201cAir Drake\u201d", category: "music", confidence: "reported" },
    { hex: "a21fe6", reg: "N236MJ", person: "Michael Jordan", note: "Gulfstream G550", category: "sports", confidence: "reported" },
    { hex: "ab0a46", reg: "N810KJ", person: "Kylie Jenner", note: "Bombardier Global 7500", category: "celebrity", confidence: "reported" },
    { hex: "ac39d6", reg: "N887WM", person: "Bill Gates", note: "Gulfstream G650ER", category: "business", confidence: "reported" },
    { hex: "a18845", reg: "N1980K", person: "Kim Kardashian", note: "Gulfstream G650", category: "celebrity", confidence: "reported" },
];

const BY_HEX = new Map(NOTABLE_AIRCRAFT.map((a) => [a.hex.toLowerCase(), a]));
const BY_REG = new Map(NOTABLE_AIRCRAFT.map((a) => [a.reg.toUpperCase().replace(/[^A-Z0-9]/g, ""), a]));

export interface NotableMatch {
    person: string;
    note: string;
    category: NotableAircraft["category"];
    confidence: "confirmed" | "reported";
}

// Callsign-based government / military VIP detection (real, deterministic signals).
function callsignRule(callsign: string): NotableMatch | null {
    const cs = callsign.toUpperCase().replace(/\s/g, "");
    if (!cs) return null;
    if (/^(AF1|AF01|AFONE|VENUS\d*)$/.test(cs)) return { person: "US Air Force One (POTUS)", note: "Presidential VC-25 · callsign AF1", category: "government", confidence: "confirmed" };
    if (/^AF2/.test(cs)) return { person: "US Air Force Two (VPOTUS)", note: "Vice-Presidential aircraft", category: "government", confidence: "reported" };
    if (/^SAM\d+/.test(cs)) return { person: "US Special Air Mission", note: "US government VIP transport · SAM", category: "government", confidence: "reported" };
    if (/^EXEC1F?$/.test(cs)) return { person: "US Executive flight", note: "Government executive transport", category: "government", confidence: "reported" };
    if (/^RCH\d+/.test(cs)) return { person: "US Military Airlift (Reach)", note: "USAF AMC transport · RCH", category: "military", confidence: "confirmed" };
    if (/^(NAVY|CNV)\d+/.test(cs)) return { person: "US Navy flight", note: "US Navy aircraft", category: "military", confidence: "reported" };
    return null;
}

export function matchNotable(hex?: string | null, reg?: string | null, callsign?: string | null): NotableMatch | null {
    const h = (hex || "").toLowerCase().trim();
    const r = (reg || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const byHex = h ? BY_HEX.get(h) : undefined;
    const byReg = r ? BY_REG.get(r) : undefined;
    const hit = byHex || byReg;
    if (hit) return { person: hit.person, note: hit.note, category: hit.category, confidence: hit.confidence };
    return callsignRule(callsign || "");
}
