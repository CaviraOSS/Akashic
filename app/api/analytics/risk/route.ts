export const dynamic = "force-dynamic";



import { NextResponse } from "next/server"
import { prismaProxy as prisma } from "@/lib/db/prisma"
import { calculate_asset_risk, calculate_entity_risk } from "@/lib/geo-intelligence/risk_scoring"
export async function GET(req: Request) {
  try {
    
    
    await calculate_asset_risk()
    await calculate_entity_risk()
    
    const scores = await prisma.risk_score.findMany({
      orderBy: { score: 'desc' },
      take: 50,
      include: { entity: true, asset: { include: { location: true } }, event: true }
    })
    const total_assets = await prisma.asset.count()
    const total_entities = await prisma.entity.count()
    return NextResponse.json({ success: true, scores, total_assets, total_entities })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
