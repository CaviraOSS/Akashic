


import { prismaProxy as prisma } from "@/lib/db/prisma"
import { JaroWinklerDistance } from "natural"


export type claim_matrix = {
  claim_id: string
  text: string
  source_bias: number
  source_reliability: number
  prior_prob: number
  posterior_prob: number
  contradicts: string[]
  supports: string[]
  entities_mentioned: string[]
}



const vectorize = (text: string): Map<string, number> => {
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(x => x.length > 2)
  const vec = new Map<string, number>()
  for (const t of tokens) vec.set(t, (vec.get(t) || 0) + 1)
  return vec
}

const cosine_sim = (v1: Map<string, number>, v2: Map<string, number>) => {
  let dot = 0, n1 = 0, n2 = 0
  for (const [k, v] of v1.entries()) { dot += v * (v2.get(k) || 0); n1 += v * v }
  for (const v of v2.values()) n2 += v * v
  if (n1 === 0 || n2 === 0) return 0
  return dot / (Math.sqrt(n1) * Math.sqrt(n2))
}

// sentiment inversion detector (detects if two highly similar claims have opposing polarity words)
const is_contradiction = (text1: string, text2: string) => {
  const v1 = vectorize(text1)
  const v2 = vectorize(text2)
  const sim = cosine_sim(v1, v2)

  // if they are talking about completely different things, no contradiction
  if (sim < 0.3) return false

  // opposing polarity terms
  const neg = ["not", "deny", "false", "fake", "prevent", "fail", "destroy", "none", "never", "refute"]
  const pos = ["confirm", "true", "success", "achieve", "build", "verify", "all", "always", "prove"]

  let p1_score = 0, p2_score = 0
  for (const n of neg) {
    if (v1.has(n)) p1_score -= 1
    if (v2.has(n)) p2_score -= 1
  }
  for (const p of pos) {
    if (v1.has(p)) p1_score += 1
    if (v2.has(p)) p2_score += 1
  }

  // if they are highly similar but polarity is inverted, it's a contradiction
  return (p1_score > 0 && p2_score < 0) || (p1_score < 0 && p2_score > 0)
}




export const compute_veracity_matrix = async (event_id: string) => {
  const claims = await prisma.claim.findMany({
    where: { event_id },
    include: {
      evidences: { include: { evidence: { include: { source: true } } } },
      entities: { include: { entity: true } }
    }
  }) as any[]

  if (!claims.length) return []

  const matrix: claim_matrix[] = []
  const cluster_map = new Map<string, Set<string>>()


  for (const c of claims) {
    let max_rel = 10
    let max_bias = 50
    for (const ev of c.evidences) {
      if (ev.evidence.source) {
        if (ev.evidence.source.reliability > max_rel) max_rel = ev.evidence.source.reliability
        if (ev.evidence.source.bias_risk === "high") max_bias = 90
        else if (ev.evidence.source.bias_risk === "low") max_bias = 10
      }
    }


    const prior = Math.max(0.01, Math.min(0.99, max_rel / 100))

    matrix.push({
      claim_id: c.id,
      text: c.summary || c.text,
      source_bias: max_bias,
      source_reliability: max_rel,
      prior_prob: prior,
      posterior_prob: prior,
      contradicts: [],
      supports: [],
      entities_mentioned: (c.entities as any[]).map(e => e.entity.id)
    })
  }


  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < matrix.length; j++) {
      const c1 = matrix[i]
      const c2 = matrix[j]

      const is_contra = is_contradiction(c1.text, c2.text)
      const sim = cosine_sim(vectorize(c1.text), vectorize(c2.text))

      if (is_contra) {
        c1.contradicts.push(c2.claim_id)
        c2.contradicts.push(c1.claim_id)
      } else if (sim > 0.75) {
        c1.supports.push(c2.claim_id)
        c2.supports.push(c1.claim_id)
      }
    }
  }



  for (let iter = 0; iter < 3; iter++) {
    const new_probs = new Map<string, number>()

    for (const m of matrix) {
      let p_h = m.prior_prob


      let p_e_given_h = 1.0
      let p_e_given_not_h = 1.0

      for (const sup_id of m.supports) {
        const sup = matrix.find(x => x.claim_id === sup_id)!

        const rel = sup.source_reliability / 100
        p_e_given_h *= (0.5 + (rel / 2))
        p_e_given_not_h *= (1.0 - (rel / 2))
      }

      for (const con_id of m.contradicts) {
        const con = matrix.find(x => x.claim_id === con_id)!
        const rel = con.source_reliability / 100

        p_e_given_h *= (1.0 - (rel / 2))
        p_e_given_not_h *= (0.5 + (rel / 2))
      }


      const p_e = (p_e_given_h * p_h) + (p_e_given_not_h * (1 - p_h))
      let posterior = (p_e === 0) ? p_h : (p_e_given_h * p_h) / p_e


      posterior = Math.max(0.01, Math.min(0.99, posterior))
      new_probs.set(m.claim_id, posterior)
    }

    for (const m of matrix) {
      m.posterior_prob = new_probs.get(m.claim_id)!
      m.prior_prob = m.posterior_prob
    }
  }


  for (const m of matrix) {
    let status = "unverified"
    if (m.posterior_prob > 0.8) status = "confirmed"
    else if (m.posterior_prob < 0.2) status = "false"
    else if (m.contradicts.length > 0) status = "disputed"

    await prisma.claim.update({
      where: { id: m.claim_id },
      data: {
        confidence: m.posterior_prob * 100,
        status: status
      }
    })
  }

  return matrix
}



export const detect_disinformation_campaigns = async (hours = 24) => {
  const cutoff = new Date(Date.now() - (hours * 3600000))
  const claims = await prisma.claim.findMany({
    where: { first_seen: { gte: cutoff } },
    include: { evidences: { include: { evidence: { include: { source: true } } } } }
  }) as any[]


  const clusters = new Map<string, { count: number, sources: Set<string>, avg_conf: number }>()

  for (const c of claims) {
    const v = vectorize(c.text)
    let matched = false
    for (const [k, cl] of clusters.entries()) {
      if (cosine_sim(v, vectorize(k)) > 0.85) {
        cl.count++
          ; (c.evidences as any[]).forEach(e => e.evidence.source && cl.sources.add(e.evidence.source.id))
        cl.avg_conf = (cl.avg_conf + c.confidence) / 2
        matched = true
        break
      }
    }
    if (!matched) {
      const s = new Set<string>()
        ; (c.evidences as any[]).forEach(e => e.evidence.source && s.add(e.evidence.source.id))
      clusters.set(c.text, { count: 1, sources: s, avg_conf: c.confidence })
    }
  }

  const campaigns = []
  for (const [text, cl] of clusters.entries()) {
    if (cl.count > 5 && cl.avg_conf < 30 && cl.sources.size > 2) {
      campaigns.push({ text, instances: cl.count, unique_sources: cl.sources.size, credibility: cl.avg_conf })
    }
  }
  return campaigns
}

