import { NextResponse } from "next/server";



const gps_zones = [
  { region: "Eastern Ukraine", lat: 48.5, lon: 37.8, level: "high", source: "ukraine-russia conflict", radius_km: 200 },
  { region: "Crimea", lat: 45.3, lon: 34.0, level: "high", source: "russia electronic warfare", radius_km: 150 },
  { region: "Kaliningrad", lat: 54.7, lon: 20.5, level: "high", source: "russian military", radius_km: 100 },
  { region: "Syria (Hmeimim)", lat: 35.4, lon: 35.9, level: "high", source: "russian base", radius_km: 120 },
  { region: "Northern Iraq", lat: 36.4, lon: 43.1, level: "medium", source: "conflict zone", radius_km: 80 },
  { region: "Gaza", lat: 31.4, lon: 34.3, level: "high", source: "israel-hamas conflict", radius_km: 50 },
  { region: "Southern Lebanon", lat: 33.3, lon: 35.5, level: "high", source: "hezbollah conflict", radius_km: 60 },
  { region: "Iran Border (Iraq)", lat: 33.3, lon: 45.4, level: "medium", source: "iran electronic warfare", radius_km: 100 },
  { region: "Baltic Sea", lat: 57.5, lon: 20.0, level: "medium", source: "russian interference", radius_km: 200 },
  { region: "Black Sea", lat: 43.5, lon: 34.0, level: "high", source: "russia naval ops", radius_km: 250 },
  { region: "Norway-Finland Border", lat: 69.5, lon: 25.5, level: "medium", source: "russian kola peninsula", radius_km: 80 },
  { region: "Eastern Mediterranean", lat: 34.5, lon: 33.0, level: "medium", source: "multi-party interference", radius_km: 150 },
  { region: "Yemen (Houthi)", lat: 15.3, lon: 44.2, level: "medium", source: "houthi ops", radius_km: 100 },
  { region: "Taiwan Strait", lat: 24.5, lon: 119.5, level: "medium", source: "pla exercises", radius_km: 120 },
  { region: "South China Sea", lat: 16.0, lon: 114.0, level: "medium", source: "chinese military", radius_km: 200 },
  { region: "Afghanistan-Pakistan", lat: 34.5, lon: 69.0, level: "medium", source: "conflict zone", radius_km: 100 },
];

export async function GET() {
  return NextResponse.json({
    zones: gps_zones,
    count: gps_zones.length,
    stats: {
      high: gps_zones.filter(z => z.level === "high").length,
      medium: gps_zones.filter(z => z.level === "medium").length,
    },
    source: "GPSJam.org / OSINT (curated)"
  });
}
