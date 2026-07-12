import { prismaProxy as prisma } from "@/lib/db/prisma"




export interface entity_embedding {
  entity_id: string
  vector: number[]
}

export const generate_embeddings = async (dimensions = 32, walks_per_node = 10, walk_length = 5): Promise<entity_embedding[]> => {
  const entities = await prisma.entity.findMany() as any[]
  const rels = await prisma.relationship.findMany() as any[]

  const n = entities.length
  if (n === 0) return []

  const adj = new Map<string, string[]>()
  entities.forEach(e => adj.set(e.id, []))

  rels.forEach(r => {
    if (adj.has(r.src_id)) adj.get(r.src_id)!.push(r.dst_id)
    if (adj.has(r.dst_id)) adj.get(r.dst_id)!.push(r.src_id)
  })

  const embeddings: entity_embedding[] = []


  entities.forEach(ent => {
    const visits = new Map<string, number>()


    for (let w = 0; w < walks_per_node; w++) {
      let curr = ent.id
      for (let step = 0; step < walk_length; step++) {
        const neighbors = adj.get(curr) || []
        if (neighbors.length === 0) break
        curr = neighbors[Math.floor(Math.random() * neighbors.length)]
        visits.set(curr, (visits.get(curr) || 0) + 1)
      }
    }


    const vec = new Array(dimensions).fill(0)
    for (const [visited_id, count] of visits.entries()) {

      let hash = 0
      for (let i = 0; i < visited_id.length; i++) {
        hash = (Math.imul(31, hash) + visited_id.charCodeAt(i)) | 0
      }
      const dim = Math.abs(hash) % dimensions
      vec[dim] += count
    }


    let norm = 0
    for (let i = 0; i < dimensions; i++) norm += vec[i] * vec[i]
    norm = Math.sqrt(norm) || 1

    for (let i = 0; i < dimensions; i++) vec[i] = parseFloat((vec[i] / norm).toFixed(4))

    embeddings.push({
      entity_id: ent.id,
      vector: vec
    })
  })

  return embeddings
}
