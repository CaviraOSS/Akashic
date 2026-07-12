import { NextResponse } from "next/server";




const nuclear_sites = [
  { name: "Zaporizhzhia NPP", country: "Ukraine", lat: 47.507, lon: 34.585, type: "NPP", status: "occupied", reactors: 6 },
  { name: "Chernobyl", country: "Ukraine", lat: 51.389, lon: 30.099, type: "decommissioned", status: "exclusion_zone", reactors: 0 },
  { name: "Fukushima Daiichi", country: "Japan", lat: 37.421, lon: 141.033, type: "decommissioned", status: "decommissioning", reactors: 0 },
  { name: "Bushehr NPP", country: "Iran", lat: 28.831, lon: 50.886, type: "NPP", status: "operational", reactors: 1 },
  { name: "Natanz", country: "Iran", lat: 33.724, lon: 51.727, type: "enrichment", status: "operational", reactors: 0 },
  { name: "Fordow", country: "Iran", lat: 34.882, lon: 51.259, type: "enrichment", status: "operational", reactors: 0 },
  { name: "Yongbyon", country: "North Korea", lat: 39.795, lon: 125.755, type: "research", status: "active", reactors: 1 },
  { name: "Dimona", country: "Israel", lat: 31.001, lon: 35.145, type: "research", status: "classified", reactors: 1 },
  { name: "Barakah NPP", country: "UAE", lat: 23.959, lon: 52.253, type: "NPP", status: "operational", reactors: 4 },
  { name: "Kudankulam NPP", country: "India", lat: 8.168, lon: 77.709, type: "NPP", status: "operational", reactors: 4 },
  { name: "Hinkley Point C", country: "UK", lat: 51.209, lon: -3.129, type: "NPP", status: "construction", reactors: 2 },
  { name: "Flamanville EPR", country: "France", lat: 49.538, lon: -1.882, type: "NPP", status: "construction", reactors: 1 },
  { name: "Akkuyu NPP", country: "Turkey", lat: 36.144, lon: 33.533, type: "NPP", status: "construction", reactors: 4 },
  { name: "Rooppur NPP", country: "Bangladesh", lat: 24.065, lon: 89.048, type: "NPP", status: "construction", reactors: 2 },
  { name: "Olkiluoto 3", country: "Finland", lat: 61.235, lon: 21.448, type: "NPP", status: "operational", reactors: 3 },
  { name: "Vogtle 3&4", country: "USA", lat: 33.141, lon: -81.763, type: "NPP", status: "operational", reactors: 4 },
  { name: "Bruce NPP", country: "Canada", lat: 44.326, lon: -81.598, type: "NPP", status: "operational", reactors: 8 },
  { name: "Taishan NPP", country: "China", lat: 21.917, lon: 112.982, type: "NPP", status: "operational", reactors: 2 },
  { name: "Kursk NPP", country: "Russia", lat: 51.674, lon: 35.603, type: "NPP", status: "operational", reactors: 4 },
  { name: "Kozloduy NPP", country: "Bulgaria", lat: 43.746, lon: 23.765, type: "NPP", status: "operational", reactors: 2 },
  { name: "Cernavoda NPP", country: "Romania", lat: 44.319, lon: 28.058, type: "NPP", status: "operational", reactors: 2 },
  { name: "Paks NPP", country: "Hungary", lat: 46.573, lon: 18.854, type: "NPP", status: "operational", reactors: 4 },
  { name: "Mochovce NPP", country: "Slovakia", lat: 48.276, lon: 18.440, type: "NPP", status: "operational", reactors: 4 },
  { name: "Dukovany NPP", country: "Czech Republic", lat: 51.087, lon: 16.148, type: "NPP", status: "operational", reactors: 4 },
  { name: "Koeberg NPP", country: "South Africa", lat: -33.677, lon: 18.433, type: "NPP", status: "operational", reactors: 2 },
  { name: "Laguna Verde NPP", country: "Mexico", lat: 19.719, lon: -96.405, type: "NPP", status: "operational", reactors: 2 },
  { name: "Angra NPP", country: "Brazil", lat: -23.008, lon: -44.457, type: "NPP", status: "operational", reactors: 2 },
  { name: "Atucha NPP", country: "Argentina", lat: -33.967, lon: -59.208, type: "NPP", status: "operational", reactors: 2 },
  { name: "Karachi NPP", country: "Pakistan", lat: 24.842, lon: 66.780, type: "NPP", status: "operational", reactors: 3 },
  { name: "Tianwan NPP", country: "China", lat: 34.687, lon: 119.462, type: "NPP", status: "operational", reactors: 8 },
];

export async function GET() {
  return NextResponse.json({
    sites: nuclear_sites,
    count: nuclear_sites.length,
    source: "IAEA PRIS (curated)"
  });
}
