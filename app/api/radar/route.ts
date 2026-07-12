export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { get_adsb_snapshot } from "@/lib/live/adsb-live";

export const maxDuration = 300;
export interface TacticalFlight {
    icao24: string;
    callsign: string;
    registration: string | null;
    modelType: string | null;
    description: string | null;
    squawk: string | null;
    category: string; 
    longitude: number;
    latitude: number;
    baroAltitude: number | null;
    velocity: number | null;
    trueTrack: number | null;
    verticalRate: number | null;
    onGround: boolean;
    lastContact: number | null;
}
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const filter = searchParams.get("filter") || "all";
        const lat = parseFloat(searchParams.get("lat") || "0");
        const lon = parseFloat(searchParams.get("lon") || "0");
        const radius = parseFloat(searchParams.get("radius") || "250");
        
        const snap = await get_adsb_snapshot(filter, lat, lon, radius);
        const flights = snap.aircraft.map((a): TacticalFlight => ({
            icao24: a.hex,
            callsign: a.flight,
            registration: a.registration,
            modelType: a.model_type,
            description: a.description,
            squawk: a.squawk,
            category: a.category,
            longitude: a.lon,
            latitude: a.lat,
            baroAltitude: a.alt_baro === null ? null : a.alt_baro * 0.3048,
            velocity: a.ground_speed === null ? null : a.ground_speed / 1.94384,
            trueTrack: a.track,
            verticalRate: a.baro_rate === null ? null : a.baro_rate * 0.00508,
            onGround: a.alt_baro === 0 || (a.ground_speed === 0 && a.alt_baro !== null && a.alt_baro < 100),
            lastContact: a.last_contact,
        }));
        return NextResponse.json({
            fetchedAt: snap.fetched_at,
            count: flights.length,
            stale: snap.stale,
            source: snap.source,
            flights,
        });
    } catch (err) {
        return NextResponse.json({
            error: err instanceof Error ? err.message : "intelligence retrieval failed",
            fetchedAt: new Date().toISOString(),
            count: 0,
            flights: [],
        }, { status: 502 });
    }
}
