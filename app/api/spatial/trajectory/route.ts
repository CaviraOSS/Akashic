export const dynamic = "force-dynamic";



import { NextResponse } from "next/server"
import { scan_global_interceptions } from "@/lib/geo-intelligence/route_risk"
export async function GET(req: Request) {
  const url = new URL(req.url)
  const hours = parseFloat(url.searchParams.get("hours") || "2.0")
  const radius = parseFloat(url.searchParams.get("radius") || "50.0")
  try {
    const warnings = await scan_global_interceptions(hours, radius)
    return NextResponse.json({ success: true, warnings })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
