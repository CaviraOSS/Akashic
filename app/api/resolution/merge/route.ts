import { NextResponse } from "next/server"
import { prismaProxy as prisma } from "@/lib/db/prisma"

export async function POST(req: Request) {
  try {
    const { primary_id, secondary_id } = await req.json()
    if (!primary_id || !secondary_id) return NextResponse.json({ error: "missing ids" }, { status: 400 })

    const [primary, secondary] = await Promise.all([
      prisma.entity.findUnique({ where: { id: primary_id } }),
      prisma.entity.findUnique({ where: { id: secondary_id } })
    ])

    if (!primary || !secondary) return NextResponse.json({ error: "entity not found" }, { status: 404 })

    
    const p_aliases = new Set(JSON.parse(primary.aliases || "[]"))
    const s_aliases = JSON.parse(secondary.aliases || "[]")
    
    p_aliases.add(secondary.name)
    s_aliases.forEach((a: string) => p_aliases.add(a))

    
    await prisma.$transaction([
      
      prisma.entity.update({
        where: { id: primary_id },
        data: { aliases: JSON.stringify(Array.from(p_aliases)) }
      }),
      
      prisma.entity.update({
        where: { id: secondary_id },
        data: { is_canonical: false, merged_into: primary_id }
      }),
      
      prisma.relationship.updateMany({
        where: { src_id: secondary_id },
        data: { src_id: primary_id }
      }),
      
      prisma.relationship.updateMany({
        where: { dst_id: secondary_id },
        data: { dst_id: primary_id }
      })
    ])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

