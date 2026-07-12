


import { prismaProxy as prisma } from "@/lib/db/prisma"
export type correlation_alert = {
  domain_a: string
  domain_b: string
  event_a: any
  event_b: any
  confidence: number
  description: string
}


export const detect_correlations = async (): Promise<correlation_alert[]> => {
  const cutoff = new Date(Date.now() - 48 * 3600000)

  const active_events = await prisma.event.findMany({
    where: { start_time: { gte: cutoff } },
    include: { location: true, entities: true, market_sigs: true }
  }) as any[]

  const alerts: correlation_alert[] = []



  const cyber = active_events.filter(e => e.category === "cyber")
  for (const c of cyber) {
    const ents = new Set((c.entities as any[]).map(x => x.entity_id))


    const shocks = active_events.filter(e => e.category === "market" && (e.market_sigs as any[]).some(m => m.change_pct < -5.0))
    for (const s of shocks) {
      const s_ents = (s.entities as any[]).map(x => x.entity_id)
      const overlap = s_ents.filter(x => ents.has(x))

      if (overlap.length > 0) {

        const gap = Math.abs(new Date(c.start_time!).getTime() - new Date(s.start_time!).getTime()) / 3600000
        if (gap < 24) {
          alerts.push({
            domain_a: "cyber",
            domain_b: "market",
            event_a: c,
            event_b: s,
            confidence: Math.max(50, 100 - (gap * 2)),
            description: `Potential Market Reaction: ${c.title} correlated with ${s.title}`
          })
        }
      }
    }
  }



  const aviation = active_events.filter(e => e.category === "aviation" && e.title.toLowerCase().includes("reroute"))
  const jamming = active_events.filter(e => e.category === "cyber" && e.title.toLowerCase().includes("gps"))

  for (const a of aviation) {
    for (const j of jamming) {
      if (a.location?.lat && a.location?.lng && j.location?.lat && j.location?.lng) {
        const dx = a.location.lat - j.location.lat
        const dy = a.location.lng - j.location.lng
        const dist_km = Math.sqrt(dx * dx + dy * dy) * 111.0

        if (dist_km < 300) {
          const gap = Math.abs(new Date(a.start_time!).getTime() - new Date(j.start_time!).getTime()) / 3600000
          if (gap < 12) {
            alerts.push({
              domain_a: "aviation",
              domain_b: "cyber",
              event_a: a,
              event_b: j,
              confidence: Math.max(50, 100 - (dist_km / 6)),
              description: `Spatial Interference: ${a.title} likely caused by ${j.title}`
            })
          }
        }
      }
    }
  }


  const protests = active_events.filter(e => e.category === "conflict" && e.title.toLowerCase().includes("protest"))
  const outages = active_events.filter(e => e.category === "cyber" && e.title.toLowerCase().includes("outage"))

  for (const p of protests) {
    for (const o of outages) {
      if (p.location?.lat && p.location?.lng && o.location?.lat && o.location?.lng) {
        const dx = p.location.lat - o.location.lat
        const dy = p.location.lng - o.location.lng
        const dist_km = Math.sqrt(dx * dx + dy * dy) * 111.0

        if (dist_km < 100) {
          const gap = Math.abs(new Date(p.start_time!).getTime() - new Date(o.start_time!).getTime()) / 3600000
          if (gap < 24) {
            alerts.push({
              domain_a: "civil unrest",
              domain_b: "infrastructure",
              event_a: p,
              event_b: o,
              confidence: Math.max(60, 100 - (gap * 3)),
              description: `Information Control: ${o.title} highly correlated with ${p.title}`
            })
          }
        }
      }
    }
  }


  alerts.sort((a, b) => b.confidence - a.confidence)
  return alerts
}

