import { prismaProxy as prisma } from "@/lib/db/prisma"




export const generate_daily_sitrep = async (): Promise<string> => {
  const events = await prisma.event.findMany({
    orderBy: { created_at: 'desc' },
    take: 50
  }) as any[]

  if (events.length === 0) return "NO ACTIVE EVENTS DETECTED. GLOBAL BASELINE STABLE."

  const stopwords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "up", "about", "into", "over", "after", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "shall", "should", "can", "could", "may", "might", "must", "it", "this", "that", "these", "those", "not", "no", "as", "if", "then", "else"])
  const docs: string[] = events.map(e => `${e.title} ${e.summary || ""} ${e.category}`)

  const doc_tokens: string[][] = docs.map(d =>
    d.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w))
  )

  const df = new Map<string, number>()
  doc_tokens.forEach(tokens => {
    new Set<string>(tokens).forEach(t => df.set(t, (df.get(t) || 0) + 1))
  })

  const N = docs.length || 1
  const keyword_map = new Map<string, number>()

  doc_tokens.forEach(tokens => {
    const tf = new Map<string, number>()
    tokens.forEach(t => tf.set(t, (tf.get(t) || 0) + 1))

    const doc_terms = Array.from(tf.entries()).map(([t, count]) => {
      const score = count * Math.log(N / (df.get(t) || 1))
      return { term: t, score }
    }).sort((a, b) => b.score - a.score).slice(0, 3)

    doc_terms.forEach(t => {
      keyword_map.set(t.term, (keyword_map.get(t.term) || 0) + t.score)
    })
  })

  const top_keywords = Array.from(keyword_map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(x => x[0].toUpperCase())


  let criticals = 0, highs = 0
  events.forEach(e => {
    if (e.severity === "critical") criticals++
    if (e.severity === "high") highs++
  })


  const date_str = new Date().toISOString()

  const paragraphs: string[] = []
  paragraphs.push(`[ COMMAND SITREP ] - GENERATED: ${date_str}`)
  paragraphs.push(`GLOBAL THREAT POSTURE: ${criticals > 0 ? "CRITICAL" : highs > 0 ? "ELEVATED" : "NOMINAL"}`)
  paragraphs.push(`ACTIVE VECTORS: ${criticals} CRITICAL, ${highs} HIGH SEVERITY.`)
  paragraphs.push(`PRIMARY EXTRACTIONS: ${top_keywords.join(" | ")}`)

  paragraphs.push("\n[ SIGNIFICANT CLUSTERS ]")

  const severe_events = events
    .sort((a, b) => {
      const weight = (s: string) => s === "critical" ? 3 : s === "high" ? 2 : 1
      return weight(b.severity) - weight(a.severity)
    })
    .slice(0, 3)

  severe_events.forEach((e, idx) => {
    paragraphs.push(`0${idx + 1} // [${e.category.toUpperCase()}] ${e.title.toUpperCase()}`)
    if (e.summary) {

      const sentence = e.summary.split('.')[0]
      paragraphs.push(`   >> ${sentence}.`)
    }
  })

  paragraphs.push("\n[ ORACLE CONCLUSION ]")
  if (criticals > 2) paragraphs.push(">> MULTIPLE CRITICAL VECTORS DETECTED. EXPECT CASCADING FAILURES. RECOMMEND IMMEDIATE INVESTIGATION.")
  else paragraphs.push(">> THREAT SCATTER IS WITHIN NOMINAL BOUNDS. CONTINUING ROUTINE SURVEILLANCE.")

  return paragraphs.join("\n")
}
