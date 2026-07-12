export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
export async function GET(req: Request, { params }: { params: Promise<{ icao: string }> }) {
    const { icao: rawIcao } = await params;
    const icao = rawIcao?.toUpperCase();
    if (!icao) return NextResponse.json({ error: "Missing ICAO" }, { status: 400 });
    try {
        
        
        
        
        
        const { searchParams } = new URL(req.url);
        const lat = searchParams.get("lat");
        const lon = searchParams.get("lon");
        let liveNearby: any[] = [];
        let stats = { flightsDay: "N/A", topAirlines: ["Unknown"] };
        if (lat && lon) {
            
            const liveRes = await fetch(`https://api.adsb.lol/v2/point/${lat}/${lon}/250`, { 
                cache: "no-store",
                headers: { "User-Agent": "WORLDVIEW OSINT" }
            });
            if (liveRes.ok) {
                const liveData = await liveRes.json();
                const allFlights = Array.isArray(liveData.ac) ? liveData.ac : [];
                
                
                liveNearby = allFlights.slice(0, 10).map((a: any) => ({
                    icao24: a.hex,
                    callsign: a.flight?.trim() || a.hex,
                    alt: a.alt_baro,
                    dist: a.dist
                }));
                
                const carrierCounts: Record<string, number> = {};
                for (const f of allFlights) {
                    const cs = f.flight?.trim();
                    if (!cs) continue;
                    const match = cs.match(/^[A-Z]{3}/);
                    if (match) {
                        const carrier = match[0];
                        
                        carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
                    }
                }
                const sortedCarriers = Object.keys(carrierCounts)
                    .sort((a, b) => carrierCounts[b] - carrierCounts[a])
                    .slice(0, 5);
                
                const size = searchParams.get("size") || "medium";
                const baseMult = size === "large" ? 30 : size === "medium" ? 15 : 5;
                
                
                let estDay = Math.round(allFlights.length * baseMult);
                if (estDay < 10) estDay = 10; 
                
                stats = {
                    flightsDay: estDay.toLocaleString() + " est.",
                    topAirlines: sortedCarriers.length > 0 ? sortedCarriers : ["Regional/Private"]
                };
            }
        }
        return NextResponse.json({
            icao,
            stats,
            liveNearby,
            lastUpdate: new Date().toISOString()
        });
    } catch (err) {
        return NextResponse.json({ error: "Intelligence retrieval failed" }, { status: 500 });
    }
}
