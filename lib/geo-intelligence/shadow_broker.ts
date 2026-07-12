import { prismaProxy as prisma } from "@/lib/db/prisma"




export interface shadow_broker_result {
  entity_id: string
  entity_name: string
  centrality_score: number
  risk_score: number
  shadow_ratio: number
}

export const run_shadow_broker_analysis = async (iterations = 50): Promise<shadow_broker_result[]> => {
  const entities = await prisma.entity.findMany() as any[]
  const rels = await prisma.relationship.findMany() as any[]
  const risks = await prisma.risk_score.findMany({ orderBy: { generated_at: "desc" } }) as any[]

  const n = entities.length
  if (n === 0) return []

  const id_to_idx = new Map<string, number>()
  const idx_to_id = new Map<number, string>()

  entities.forEach((e, i) => {
    id_to_idx.set(e.id, i)
    idx_to_id.set(i, e.id)
  })


  const adj = Array.from({ length: n }, () => new Float64Array(n))

  rels.forEach(r => {
    const i = id_to_idx.get(r.src_id)
    const j = id_to_idx.get(r.dst_id)
    if (i !== undefined && j !== undefined) {
      const weight = r.confidence ? r.confidence / 100 : 1
      adj[i][j] = weight
      adj[j][i] = weight
    }
  })


  let v = new Float64Array(n).fill(1.0 / Math.sqrt(n))
  let next_v = new Float64Array(n)

  for (let iter = 0; iter < iterations; iter++) {

    for (let i = 0; i < n; i++) {
      let sum = 0
      for (let j = 0; j < n; j++) {
        sum += adj[i][j] * v[j]
      }
      next_v[i] = sum
    }


    let norm = 0
    for (let i = 0; i < n; i++) norm += next_v[i] * next_v[i]
    norm = Math.sqrt(norm)
    if (norm === 0) break

    for (let i = 0; i < n; i++) v[i] = next_v[i] / norm
  }


  const results: shadow_broker_result[] = []

  for (let i = 0; i < n; i++) {
    const ent_id = idx_to_id.get(i)!
    const ent = entities[i]


    const ent_risk = risks.find(r => r.entity_id === ent_id)
    const raw_risk = ent_risk ? ent_risk.score : 1.0
    const clamped_risk = Math.max(0.1, raw_risk)

    const centrality = v[i]

    const shadow_ratio = centrality / clamped_risk

    results.push({
      entity_id: ent_id,
      entity_name: ent.name || "unknown",
      centrality_score: parseFloat((centrality * 100).toFixed(4)),
      risk_score: parseFloat(raw_risk.toFixed(2)),
      shadow_ratio: parseFloat((shadow_ratio * 1000).toFixed(4))
    })
  }


  return results.sort((a, b) => b.shadow_ratio - a.shadow_ratio).slice(0, 10)
}
