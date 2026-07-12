export const dynamic = "force-dynamic";



import { NextResponse } from "next/server"
import { find_nodes_in_proximity } from "@/lib/geo-intelligence/spatial_engine"
export async function GET(req: Request) {
  const url = new URL(req.url)
  const lat = parseFloat(url.searchParams.get("lat") || "0")
  const lng = parseFloat(url.searchParams.get("lng") || "0")
  const radius = parseFloat(url.searchParams.get("radius") || "50")
  if (!lat || !lng) {
    return NextResponse.json({ success: false, error: "missing lat/lng" }, { status: 400 })
  }
  try {
    const data = await find_nodes_in_proximity(lat, lng, radius)
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
