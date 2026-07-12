import { NextResponse } from "next/server"
import { prismaProxy as prisma } from "@/lib/db/prisma"
import { similarity_score } from "@/lib/resolution/fuzzy_match"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    
    const entities = await prisma.entity.findMany({
      where: { is_canonical: true },
      select: { id: true, name: true, type: true, aliases: true }
    })

    const candidates = []
    const threshold = 75 

    
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const a = entities[i], b = entities[j]
        
        
        const type_boost = a.type === b.type ? 5 : 0
        const score = similarity_score(a.name, b.name) + type_boost

        if (score >= threshold) {
          candidates.push({
            score: Math.min(100, score),
            a: { id: a.id, name: a.name, type: a.type, aliases: JSON.parse(a.aliases || "[]") },
            b: { id: b.id, name: b.name, type: b.type, aliases: JSON.parse(b.aliases || "[]") }
          })
        }
      }
    }

    
    candidates.sort((x, y) => y.score - x.score)

    return NextResponse.json({ success: true, candidates: candidates.slice(0, 50) }) 
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

