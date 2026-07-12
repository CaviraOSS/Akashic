export const dynamic = "force-dynamic";



import { NextResponse } from "next/server"
import { compute_veracity_matrix, detect_disinformation_campaigns } from "@/lib/geo-intelligence/claims_veracity"
import { prismaProxy as prisma } from "@/lib/db/prisma"
export async function GET(req: Request) {
  const url = new URL(req.url)
  const event_id = url.searchParams.get("event_id")
  const mode = url.searchParams.get("mode") || "event"
  try {
    if (mode === "disinfo") {
      const campaigns = await detect_disinformation_campaigns(48)
      return NextResponse.json({ success: true, campaigns })
    }
    if (!event_id) {
      return NextResponse.json({ success: false, error: "missing event_id" }, { status: 400 })
    }
    
    const matrix = await compute_veracity_matrix(event_id)
    
    
    const event = await prisma.event.findUnique({
      where: { id: event_id },
      include: { 
        claims: { include: { evidences: { include: { evidence: { include: { source: true } } } } } }
      }
    })
    return NextResponse.json({ success: true, matrix, event })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
