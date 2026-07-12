import { geo_intel_event } from './types';

export const fetchLiveFlights = async (): Promise<geo_intel_event[]> => {
  try {
    const res = await fetch('https://api.adsb.lol/v2/point/0/0/25000', { 
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const data = await res.json();
    
    if (!data.ac || !Array.isArray(data.ac)) return [];

    
    const active = data.ac.filter((a: any) => 
      a.lat !== undefined && a.lon !== undefined && a.alt_baro !== 'ground'
    );
    
    
    const sorted = active
      .sort((a: any, b: any) => (b.alt_baro || 0) - (a.alt_baro || 0))
      .slice(0, 50);

    return sorted.map((a: any) => ({
      id: `flight-${a.hex}-${Date.now()}`,
      title: `RADAR: Flight ${a.flight ? a.flight.trim() : a.hex} from ${a.r || 'Unknown'}`,
      summary: `Altitude: ${Math.round(a.alt_baro || 0)}ft | Speed: ${Math.round(a.gs || 0)}kt`,
      category: "aviation" as const,
      severity: "info" as const,
      confidence: 0.99,
      location_name: "Global Airspace",
      country_iso2: "Global",
      lat: a.lat,
      lng: a.lon,
      entities: ["radar", "ads-b"],
      source_name: "ADS-B Exchange (adsb.lol)",
      source_url: "https://adsb.lol",
      published_at: new Date().toISOString(),
      detected_at: new Date().toISOString()
    }));
  } catch (err) {
    console.error("Flights fetch failed", err);
    return [];
  }
}
