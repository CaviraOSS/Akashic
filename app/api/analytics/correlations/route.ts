export const dynamic = "force-dynamic";



import { NextResponse } from "next/server"
import { detect_correlations } from "@/lib/geo-intelligence/correlation_engine"
export async function GET(req: Request) {
  try {
    const alerts = await detect_correlations()
    return NextResponse.json({ success: true, correlations: alerts })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
