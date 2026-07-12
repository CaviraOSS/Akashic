export const dynamic = "force-dynamic";



import { NextResponse } from "next/server"
import { prismaProxy as prisma } from "@/lib/db/prisma"
export async function GET(req: Request) {
  const url = new URL(req.url)
  const inv_id = url.searchParams.get("id")
  try {
    if (inv_id) {
      const inv = await prisma.investigation.findUnique({
        where: { id: inv_id },
        include: {
          events: { include: { event: true } },
          entities: { include: { entity: true } },
          claims: { include: { claim: { include: { evidences: { include: { evidence: { include: { source: true } } } } } } } }
        }
      })
      return NextResponse.json({ success: true, investigation: inv })
    } else {
      const invs = await prisma.investigation.findMany({
        orderBy: { updated_at: 'desc' },
        take: 50
      })
      return NextResponse.json({ success: true, investigations: invs })
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, inv_id, target_id, type } = body
    
    if (action === "create") {
      const inv = await prisma.investigation.create({
        data: { title: body.title || "New Investigation", status: "draft" }
      })
      return NextResponse.json({ success: true, investigation: inv })
    }
    
    if (!inv_id || !target_id || !type) {
      return NextResponse.json({ success: false, error: "missing fields" }, { status: 400 })
    }
    if (action === "pin") {
      if (type === "event") await prisma.investigation_event.create({ data: { invest_id: inv_id, event_id: target_id } })
      if (type === "entity") await prisma.investigation_entity.create({ data: { invest_id: inv_id, entity_id: target_id } })
      if (type === "claim") await prisma.investigation_claim.create({ data: { invest_id: inv_id, claim_id: target_id } })
    }
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
