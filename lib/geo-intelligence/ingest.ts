


import { prismaProxy as prisma } from "@/lib/db/prisma"
import { transform_result } from "./connector"
import { resolve_graph } from "./resolution"

export const ingest_pipeline_result = async (raw_res: transform_result) => {


  const candidate_entities = await prisma.entity.findMany({
    where: { is_canonical: true },
    take: 10000,
    orderBy: { confidence: 'desc' }
  }) as any[]


  const mapped_candidates = candidate_entities.map(e => ({
    ...e,
    type: e.type as any,
    aliases: JSON.parse(e.aliases),
    metadata: JSON.parse(e.metadata),
    description: e.description ?? undefined,
    country_iso: e.country_iso ?? undefined,
    merged_into: e.merged_into ?? undefined,
    created_at: e.created_at.getTime()
  }))


  const { resolved_entities, updated_entities, resolved_relationships } = resolve_graph(raw_res, mapped_candidates)


  await prisma.$transaction(async (tx: any) => {


    for (const src of raw_res.sources) {
      await tx.source.upsert({
        where: { id: src.id },
        update: { reliability: src.reliability, speed: src.speed },
        create: {
          id: src.id, name: src.name, url: src.url || "", type: src.type,
          reliability: src.reliability, originality: src.originality, speed: src.speed,
          bias_risk: src.bias_risk, state_affiliated: src.state_affiliated
        }
      })
    }


    for (const evd of raw_res.evidences) {

      const ex = await tx.evidence.findUnique({ where: { id: evd.id } })
      if (!ex) {
        await tx.evidence.create({
          data: {
            id: evd.id, source_id: evd.source_id, url: evd.url, hash: evd.hash,
            confidence: evd.confidence, fetched_at: new Date(evd.fetched_at)
          }
        })
      }
    }


    for (const ent of resolved_entities) {
      await tx.entity.create({
        data: {
          id: ent.id, type: ent.type, name: ent.name,
          aliases: JSON.stringify(ent.aliases), description: ent.description,
          country_iso: ent.country_iso, confidence: ent.confidence,
          is_canonical: ent.is_canonical, metadata: JSON.stringify(ent.metadata)
        }
      })
    }


    for (const ent of updated_entities) {
      await tx.entity.update({
        where: { id: ent.id },
        data: {
          aliases: JSON.stringify(ent.aliases), confidence: ent.confidence,
          description: ent.description, metadata: JSON.stringify(ent.metadata)
        }
      })
    }


    for (const evt of raw_res.events) {
      const ex = await tx.event.findUnique({ where: { id: evt.id } })
      if (!ex) {
        await tx.event.create({
          data: {
            id: evt.id, title: evt.title, summary: evt.summary, category: evt.category,
            severity: evt.severity, confidence: evt.confidence,
            start_time: evt.start_time ? new Date(evt.start_time) : null,
            status: evt.status
          }
        })



        const evd_to_link = (evt as any).evidence_id || raw_res.evidences[0]?.id
        if (evd_to_link) {
          await tx.event_evidence.upsert({
            where: { event_id_evidence_id: { event_id: evt.id, evidence_id: evd_to_link } },
            update: {},
            create: { event_id: evt.id, evidence_id: evd_to_link }
          }).catch(() => { })
        }
      }
    }


    for (const rel of resolved_relationships) {
      const ex = await tx.relationship.findFirst({
        where: { src_id: rel.src_id, dst_id: rel.dst_id, type: rel.type }
      })
      if (!ex) {





        const is_src_evt = raw_res.events.find(e => e.id === rel.src_id)
        if (is_src_evt) {

          await tx.event_entity.upsert({
            where: { event_id_entity_id: { event_id: rel.src_id, entity_id: rel.dst_id } },
            update: {},
            create: { event_id: rel.src_id, entity_id: rel.dst_id }
          }).catch(() => console.error(`link fail ${rel.src_id}->${rel.dst_id}`))
        } else {

          await tx.relationship.create({
            data: {
              id: rel.id, src_id: rel.src_id, dst_id: rel.dst_id, type: rel.type,
              confidence: rel.confidence, created_at: new Date(rel.created_at)
            }
          }).catch(() => console.error(`rel fail ${rel.src_id}->${rel.dst_id}`))
        }
      }
    }
  })

  return { inserted_entities: resolved_entities.length, updated_entities: updated_entities.length }
}
