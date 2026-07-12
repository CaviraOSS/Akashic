


import { prismaProxy as prisma } from "@/lib/db/prisma"
const W_SEVERITY = 0.35
const W_PROXIMITY = 0.25
const W_VELOCITY = 0.20
const W_VERACITY = 0.20


export const calculate_asset_risk = async () => {
  
  const assets = await prisma.asset.findMany({ include: { location: true } })
  const recent_events = await prisma.event.findMany({
    where: { 
      status: "active",
      start_time: { gte: new Date(Date.now() - 72 * 3600000) } 
    },
    include: { location: true, claims: true }
  })
  
  if(!recent_events.length) return

  
  const risk_updates = []

  for(const a of assets){
    if(!a.location?.lat || !a.location?.lng) continue

    let total_risk = 0
    let max_sev = 0
    let closest_dist = 9999
    let claim_conf_sum = 0
    let claim_count = 0
    let velocity = 0

    
    for(const ev of recent_events){
      if(!ev.location?.lat || !ev.location?.lng) continue
      
      
      const dx = ev.location.lat - a.location.lat
      const dy = ev.location.lng - a.location.lng
      const dist_km = Math.sqrt(dx*dx + dy*dy) * 111.0
      
      if(dist_km < 100){
        
        const sev_val = ev.severity === "critical" ? 100 : ev.severity === "high" ? 75 : 50
        if(sev_val > max_sev) max_sev = sev_val
        if(dist_km < closest_dist) closest_dist = dist_km
        
        
        for(const c of ev.claims){
          claim_conf_sum += c.confidence
          claim_count++
        }
        
        
        const age_hrs = (Date.now() - new Date(ev.start_time!).getTime()) / 3600000
        if(age_hrs < 4) velocity += 20
        else if(age_hrs < 12) velocity += 10
      }
    }

    if(max_sev === 0) continue 

    
    const prox_score = Math.max(0, 100 - closest_dist)
    const ver_score = claim_count > 0 ? (claim_conf_sum / claim_count) : 50
    const vel_score = Math.min(100, velocity)
    
    total_risk = (max_sev * W_SEVERITY) + 
                 (prox_score * W_PROXIMITY) + 
                 (vel_score * W_VELOCITY) + 
                 (ver_score * W_VERACITY)

    const trend = velocity > 15 ? "rising" : velocity < 5 ? "falling" : "stable"
    const severity_label = total_risk > 80 ? "critical" : total_risk > 60 ? "high" : "elevated"

    risk_updates.push({
      asset_id: a.id,
      score: total_risk,
      severity: severity_label,
      confidence: ver_score,
      velocity: vel_score,
      trend: trend,
      explanation: `Risk elevated by proximity (${closest_dist.toFixed(1)}km) to severe events.`
    })
  }

  
  for(const update of risk_updates){
    
    const existing = await prisma.risk_score.findFirst({ where: { asset_id: update.asset_id } })
    if(existing){
      await prisma.risk_score.update({ where: { id: existing.id }, data: update })
    } else {
      await prisma.risk_score.create({ data: update })
    }
  }
}


export const calculate_entity_risk = async () => {
  const entities = await prisma.entity.findMany({
    where: { events: { some: {} } },
    include: { events: { include: { event: true } }, claims: { include: { claim: true } } }
  })

  for(const e of entities){
    let max_sev = 0
    let velocity = 0
    let active_events = 0
    let ver_sum = 0
    
    for(const ev_link of e.events){
      const ev = ev_link.event
      if(ev.status === "active"){
        active_events++
        const sev_val = ev.severity === "critical" ? 100 : ev.severity === "high" ? 75 : 50
        if(sev_val > max_sev) max_sev = sev_val
        
        const age_hrs = (Date.now() - new Date(ev.start_time!).getTime()) / 3600000
        if(age_hrs < 12) velocity += 15
      }
    }
    
    for(const cl_link of e.claims){
      ver_sum += cl_link.claim.confidence
    }

    if(active_events === 0) continue

    const vel_score = Math.min(100, velocity)
    const ver_score = e.claims.length > 0 ? ver_sum / e.claims.length : 50
    const exposure_score = Math.min(100, active_events * 20)

    const total_risk = (max_sev * 0.4) + (exposure_score * 0.3) + (vel_score * 0.2) + (ver_score * 0.1)

    const trend = velocity > 20 ? "rising" : "stable"
    const severity_label = total_risk > 80 ? "critical" : total_risk > 60 ? "high" : "elevated"

    const existing = await prisma.risk_score.findFirst({ where: { entity_id: e.id } })
    const data = {
      entity_id: e.id,
      score: total_risk,
      severity: severity_label,
      confidence: ver_score,
      velocity: vel_score,
      trend,
      explanation: `Entity exposed to ${active_events} active events.`
    }

    if(existing) await prisma.risk_score.update({ where: { id: existing.id }, data })
    else await prisma.risk_score.create({ data })
  }
}

