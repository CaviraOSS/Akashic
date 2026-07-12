import { NextResponse } from "next/server";


const spaceports = [
  { name: "Cape Canaveral SFS", country: "USA", lat: 28.488, lon: -80.577, operator: "USSF/ULA", status: "active" },
  { name: "Vandenberg SFB", country: "USA", lat: 34.742, lon: -120.572, operator: "USSF/SpaceX", status: "active" },
  { name: "Baikonur Cosmodrome", country: "Kazakhstan", lat: 45.965, lon: 63.305, operator: "Roscosmos", status: "active" },
  { name: "Vostochny Cosmodrome", country: "Russia", lat: 51.884, lon: 128.333, operator: "Roscosmos", status: "active" },
  { name: "Plesetsk Cosmodrome", country: "Russia", lat: 62.927, lon: 40.577, operator: "Russian MoD", status: "active" },
  { name: "Jiuquan Satellite Center", country: "China", lat: 40.958, lon: 100.291, operator: "CNSA", status: "active" },
  { name: "Xichang Satellite Center", country: "China", lat: 28.246, lon: 102.027, operator: "CNSA", status: "active" },
  { name: "Wenchang Space Launch", country: "China", lat: 19.614, lon: 110.951, operator: "CNSA", status: "active" },
  { name: "Taiyuan Satellite Center", country: "China", lat: 38.849, lon: 111.608, operator: "CNSA", status: "active" },
  { name: "Satish Dhawan (SHAR)", country: "India", lat: 13.720, lon: 80.230, operator: "ISRO", status: "active" },
  { name: "Tanegashima Space Center", country: "Japan", lat: 30.400, lon: 131.000, operator: "JAXA", status: "active" },
  { name: "Guiana Space Centre", country: "French Guiana", lat: 5.232, lon: -52.769, operator: "ESA/Arianespace", status: "active" },
  { name: "Naro Space Center", country: "South Korea", lat: 34.432, lon: 127.535, operator: "KARI", status: "active" },
  { name: "Mahia Peninsula", country: "New Zealand", lat: -39.262, lon: 177.864, operator: "Rocket Lab", status: "active" },
  { name: "Alcântara Launch Center", country: "Brazil", lat: -2.373, lon: -44.396, operator: "AEB", status: "active" },
  { name: "Semnan Launch Site", country: "Iran", lat: 35.235, lon: 53.921, operator: "ISA", status: "active" },
  { name: "Sohae Satellite Station", country: "North Korea", lat: 39.660, lon: 124.705, operator: "NADA", status: "active" },
  { name: "Palmachim AFB", country: "Israel", lat: 31.897, lon: 34.691, operator: "ISA", status: "active" },
  { name: "Starbase Boca Chica", country: "USA", lat: 25.997, lon: -97.157, operator: "SpaceX", status: "active" },
];

export async function GET() {
  return NextResponse.json({
    spaceports,
    count: spaceports.length,
    source: "FAA/ESA/CNSA (curated)"
  });
}
