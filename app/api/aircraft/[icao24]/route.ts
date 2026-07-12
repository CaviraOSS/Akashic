export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";




export async function GET(request: Request, context: { params: Promise<{ icao24: string }> }) {
    const { icao24 } = await context.params;
    const hex = icao24.toLowerCase();
    const callsign = (new URL(request.url).searchParams.get("callsign") || "").trim().toUpperCase();
    const hdrs = { "User-Agent": "WORLDVIEW OSINT", Accept: "application/json" };
    const [acRes, csRes, histRes, psRes, liveRes] = await Promise.allSettled([
        fetch(`https://api.adsbdb.com/v0/aircraft/${hex}`, { headers: hdrs, cache: "no-store" }),
        callsign ? fetch(`https://api.adsbdb.com/v0/callsign/${callsign}`, { headers: hdrs, cache: "no-store" }) : Promise.resolve(null),
        fetch(`https://api.adsbdb.com/v0/aircraft/${hex}/flightroutes`, { headers: hdrs, cache: "no-store" }),
        fetch(`https://api.planespotters.net/pub/photos/hex/${hex}`, { headers: hdrs }),
        fetch(`https://api.airplanes.live/v2/hex/${hex}`, { headers: hdrs, cache: "no-store" }),
    ]);
    
    let acDb: any = null;
    if (acRes.status === "fulfilled" && acRes.value?.ok) {
        const d = await acRes.value.json();
        acDb = d?.response?.aircraft || null;
    }
    
    let origin: string | null = null;
    let originName: string | null = null;
    let destination: string | null = null;
    let destName: string | null = null;
    if (csRes.status === "fulfilled" && csRes.value && (csRes.value as Response).ok) {
        const d = await (csRes.value as Response).json();
        const fr = d?.response?.flightroute;
        if (fr) {
            origin = fr.origin?.iata_code || fr.origin?.icao_code || null;
            originName = fr.origin?.name || fr.origin?.municipality || null;
            destination = fr.destination?.iata_code || fr.destination?.icao_code || null;
            destName = fr.destination?.name || fr.destination?.municipality || null;
        }
    }
    
    let recentHistory: { callsign: string; origin: string; originName: string; destination: string; destName: string }[] = [];
    if (histRes.status === "fulfilled" && histRes.value?.ok) {
        const d = await histRes.value.json();
        const rows: any[] = Array.isArray(d?.response) ? d.response : [];
        recentHistory = rows.slice(0, 10).map((r: any) => ({
            callsign: r.callsign || "—",
            origin: r.flightroute?.origin?.iata_code || r.flightroute?.origin?.icao_code || "???",
            originName: r.flightroute?.origin?.name || r.flightroute?.origin?.municipality || "",
            destination: r.flightroute?.destination?.iata_code || r.flightroute?.destination?.icao_code || "???",
            destName: r.flightroute?.destination?.name || r.flightroute?.destination?.municipality || "",
        }));
    }
    // -- Photo: prefer adsbdb JetPhotos link, fallback to planespotters --
    let photoUrl: string | null = acDb?.url_photo_thumbnail || null;
    let photoLink: string | null = acDb?.url_photo || null;
    let photographer: string | null = null;
    if (!photoUrl && psRes.status === "fulfilled" && psRes.value?.ok) {
        const pd = await psRes.value.json();
        if (pd.photos?.length > 0) {
            const img = pd.photos[0];
            photoUrl = img.thumbnail_large?.src || img.thumbnail?.src || null;
            photographer = img.photographer || null;
            photoLink = img.link || null;
        }
    }
    
    let liveAc: any = {};
    if (liveRes.status === "fulfilled" && liveRes.value?.ok) {
        const d = await liveRes.value.json();
        if (d?.ac?.length > 0) liveAc = d.ac[0];
    }
    return NextResponse.json({
        icao24: hex.toUpperCase(),
        callsign: callsign || liveAc.flight?.trim() || "UNKNOWN",
        operator: acDb?.registered_owner || liveAc.ownOp || "Unknown Operator",
        model: acDb?.type || liveAc.desc || liveAc.t || "Unknown",
        description: acDb ? `${acDb.manufacturer || ""} ${acDb.type || ""}`.trim() : (liveAc.desc || null),
        registration: acDb?.n_number || liveAc.r || "UNREG",
        squawk: liveAc.squawk || null,
        category: "COMMERCIAL",
        
        origin, originName, destination, destName,
        
        photoUrl, photographer, photoLink,
        
        oat: liveAc.oat ?? null,
        tat: liveAc.tat ?? null,
        mach: liveAc.mach ?? null,
        tas: liveAc.tas ?? null,
        ias: liveAc.ias ?? null,
        windDir: liveAc.wd ?? null,
        windSpd: liveAc.ws ?? null,
        navAlt: liveAc.nav_altitude_fms ?? liveAc.nav_altitude_mcp ?? null,
        recentHistory,
    });
}
