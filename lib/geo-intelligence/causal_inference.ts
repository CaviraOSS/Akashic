import { prismaProxy as prisma } from "@/lib/db/prisma"




export interface causal_node {
  event_id: string
  event_title: string
  base_probability: number
}

export interface causal_edge {
  cause_id: string
  effect_id: string
  conditional_probability: number
}

export interface causal_dag {
  nodes: causal_node[]
  edges: causal_edge[]
}

export const build_causal_dag = async (): Promise<causal_dag> => {

  const events = await prisma.event.findMany({
    orderBy: { created_at: "desc" },
    take: 100
  }) as any[]

  if (events.length === 0) return { nodes: [], edges: [] }





  const nodes: causal_node[] = []
  const edges: causal_edge[] = []

  const cats = Array.from(new Set<string>(events.map(e => e.category || "unknown")))

  cats.forEach(cat => {
    const cat_events = events.filter(e => (e.category || "unknown") === cat)
    const base_p = cat_events.length / events.length


    const rep = cat_events[0]
    nodes.push({
      event_id: rep.id,
      event_title: `[${cat.toUpperCase()}] ${rep.title}`,
      base_probability: parseFloat(base_p.toFixed(4))
    })
  })


  for (const node_a of nodes) {
    const cat_a = node_a.event_title.split("]")[0].replace("[", "").toLowerCase()
    const events_a = events.filter(e => (e.category || "unknown").toLowerCase() === cat_a)

    for (const node_b of nodes) {
      if (node_a.event_id === node_b.event_id) continue

      const cat_b = node_b.event_title.split("]")[0].replace("[", "").toLowerCase()

      let cause_count = 0
      for (const ea of events_a) {
        // find if B occurs after A
        const subsequent_b = events.find(eb =>
          (eb.category || "unknown").toLowerCase() === cat_b &&
          new Date(eb.created_at) > new Date(ea.created_at)
        )
        if (subsequent_b) cause_count++
      }

      const p_b_given_a = events_a.length > 0 ? (cause_count / events_a.length) : 0


      if (p_b_given_a > 0.1) {
        edges.push({
          cause_id: node_a.event_id,
          effect_id: node_b.event_id,
          conditional_probability: parseFloat(p_b_given_a.toFixed(4))
        })
      }
    }
  }



  const final_edges: causal_edge[] = []
  const edge_set = new Set<string>()

  edges.sort((a, b) => b.conditional_probability - a.conditional_probability).forEach(e => {
    if (!edge_set.has(`${e.effect_id}->${e.cause_id}`)) {
      final_edges.push(e)
      edge_set.add(`${e.cause_id}->${e.effect_id}`)
    }
  })

  return { nodes, edges: final_edges }
}
