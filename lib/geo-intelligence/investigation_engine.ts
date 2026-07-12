


import { prismaProxy as prisma } from "@/lib/db/prisma"
const TIME_WINDOW_HOURS = 4
const ANOMALY_SEVERITY_THRESHOLD = 3
const CROSS_DOMAIN_THRESHOLD = 2


export const spawn_investigations_from_anomalies = async () => {
  const cutoff = new Date(Date.now() - (TIME_WINDOW_HOURS * 3600000))


  const recent_events = await prisma.event.findMany({
    where: {
      start_time: { gte: cutoff },
      severity: { in: ['critical', 'high'] }
    },
    include: { location: true, entities: true }
  }) as any[]

  if (recent_events.length < ANOMALY_SEVERITY_THRESHOLD) return null



  const clusters: any[][] = []
  const visited = new Set<string>()

  for (const e of recent_events) {
    if (visited.has(e.id)) continue

    const cluster = [e]
    visited.add(e.id)

    for (const other of recent_events) {
      if (visited.has(other.id)) continue


      let dist = 9999
      if (e.location?.lat && e.location?.lng && other.location?.lat && other.location?.lng) {
        dist = Math.sqrt(Math.pow(e.location.lat - other.location.lat, 2) + Math.pow(e.location.lng - other.location.lng, 2))
      }


      const e_ent = new Set((e.entities as any[]).map(x => x.entity_id))
      const o_ent = new Set((other.entities as any[]).map(x => x.entity_id))
      const intersection = new Set([...e_ent].filter(x => o_ent.has(x)))


      if (dist < 5.0 || intersection.size > 0) {
        cluster.push(other)
        visited.add(other.id)
      }
    }

    if (cluster.length >= ANOMALY_SEVERITY_THRESHOLD) {
      clusters.push(cluster)
    }
  }

  const generated = []


  for (const cluster of clusters) {
    const categories = new Set(cluster.map(x => x.category))
    if (categories.size < CROSS_DOMAIN_THRESHOLD) continue


    const primary_cat = [...categories][0]
    const title = `AUTO-INV: Multi-domain Anomaly involving ${primary_cat.toUpperCase()}`


    const existing = await prisma.investigation.findFirst({
      where: { title, created_at: { gte: new Date(Date.now() - 86400000) } }
    })
    if (existing) continue


    const inv = await prisma.investigation.create({
      data: {
        title,
        description: `Automated investigation spawned due to ${cluster.length} critical events across domains: ${[...categories].join(', ')}`,
        status: "active"
      }
    })


    for (const e of cluster) {
      await prisma.investigation_event.create({
        data: {
          invest_id: inv.id,
          event_id: e.id
        }
      })
    }

    generated.push(inv)
  }

  return generated
}



export const expand_active_investigations = async () => {
  const active = await prisma.investigation.findMany({
    where: { status: 'active' },
    include: { events: true, entities: true, claims: true }
  }) as any[]

  for (const inv of active) {
    const event_ids = (inv.events as any[]).map(e => e.event_id)


    const linked_claims = await prisma.claim.findMany({
      where: { event_id: { in: event_ids } }
    })

    const existing_claims = new Set((inv.claims as any[]).map(c => c.claim_id))

    for (const c of linked_claims) {
      if (!existing_claims.has(c.id)) {
        await prisma.investigation_claim.create({
          data: {
            invest_id: inv.id,
            claim_id: c.id
          }
        })
      }
    }



  }
}
