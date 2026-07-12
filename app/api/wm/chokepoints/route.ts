import { NextResponse } from "next/server";


const chokepoints = [
  { name: "Strait of Hormuz", lat: 26.567, lon: 56.250, daily_barrels_m: 21, pct_global_oil: 21, width_nm: 21, countries: ["Iran", "Oman", "UAE"], risk: "critical" },
  { name: "Strait of Malacca", lat: 2.5, lon: 101.2, daily_barrels_m: 16, pct_global_oil: 16, width_nm: 1.5, countries: ["Malaysia", "Indonesia", "Singapore"], risk: "high" },
  { name: "Suez Canal", lat: 30.458, lon: 32.349, daily_barrels_m: 5.5, pct_global_oil: 9, width_nm: 0.12, countries: ["Egypt"], risk: "high" },
  { name: "Bab el-Mandeb", lat: 12.583, lon: 43.333, daily_barrels_m: 6.2, pct_global_oil: 9, width_nm: 18, countries: ["Yemen", "Djibouti", "Eritrea"], risk: "critical" },
  { name: "Turkish Straits (Bosphorus)", lat: 41.119, lon: 29.074, daily_barrels_m: 2.9, pct_global_oil: 3, width_nm: 0.4, countries: ["Turkey"], risk: "moderate" },
  { name: "Panama Canal", lat: 9.08, lon: -79.68, daily_barrels_m: 0.9, pct_global_oil: 5, width_nm: 0.018, countries: ["Panama"], risk: "moderate" },
  { name: "Cape of Good Hope", lat: -34.357, lon: 18.474, daily_barrels_m: 6, pct_global_oil: 9, width_nm: 999, countries: ["South Africa"], risk: "low" },
  { name: "Danish Straits", lat: 55.683, lon: 12.583, daily_barrels_m: 3.2, pct_global_oil: 3, width_nm: 2.5, countries: ["Denmark", "Sweden"], risk: "low" },
  { name: "Strait of Gibraltar", lat: 35.967, lon: -5.583, daily_barrels_m: 3.0, pct_global_oil: 5, width_nm: 7.7, countries: ["Spain", "Morocco"], risk: "low" },
  { name: "Taiwan Strait", lat: 24.5, lon: 119.5, daily_barrels_m: 5.3, pct_global_oil: 0, width_nm: 80, countries: ["China", "Taiwan"], risk: "critical" },
  { name: "Lombok Strait", lat: -8.467, lon: 115.733, daily_barrels_m: 1.5, pct_global_oil: 2, width_nm: 11, countries: ["Indonesia"], risk: "moderate" },
  { name: "Mozambique Channel", lat: -18.0, lon: 42.0, daily_barrels_m: 0.5, pct_global_oil: 1, width_nm: 250, countries: ["Mozambique", "Madagascar"], risk: "low" },
];

export async function GET() {
  return NextResponse.json({
    chokepoints,
    count: chokepoints.length,
    source: "EIA / IHS Markit (curated)"
  });
}
