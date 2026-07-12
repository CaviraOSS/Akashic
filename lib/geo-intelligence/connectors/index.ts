


import { connector, fetch_result, transform_result } from "../connector"
import { news_connector } from "./news_connector"
import { market_connector } from "./market_connector"
import { aviation_connector } from "./aviation"
import { maritime_connector } from "./maritime"
import { cyber_connector } from "./cyber"
import { earthquake_connector } from "./earthquake"
import { conflict_connector } from "./conflict"
import { weather_connector } from "./weather"
import { satellite_connector } from "./satellite"

export const all_connectors: Record<string,connector>={
  news: news_connector,
  market: market_connector,
  aviation: aviation_connector,
  maritime: maritime_connector,
  cyber: cyber_connector,
  earthquake: earthquake_connector,
  conflict: conflict_connector,
  weather: weather_connector,
  satellite: satellite_connector
}

export const run_connector=async(name:string):Promise<transform_result|null>=>{
  const c=all_connectors[name]
  if(!c)return null
  
  
  const t_start=Date.now()
  const fetch_data=await c.fetch()
  
  if(fetch_data.error){
    console.error(`[connector:${name}] fetch failed: ${fetch_data.error}`)
    return null
  }
  
  const res=c.transform(fetch_data)
  const t_ms=Date.now()-t_start
  console.log(`[connector:${name}] ran in ${t_ms}ms. got ${res.events.length} events, ${res.entities.length} entities.`)
  
  return res
}

export const run_all_connectors=async():Promise<transform_result>=>{
  const p=Object.keys(all_connectors).map(k=>run_connector(k))
  const results=await Promise.allSettled(p)
  
  const merged: transform_result={ entities: [], events: [], claims: [], sources: [], evidences: [], relationships: [] }
  
  for(const r of results){
    if(r.status==="fulfilled"&&r.value){
      merged.entities.push(...r.value.entities)
      merged.events.push(...r.value.events)
      merged.claims.push(...r.value.claims)
      merged.sources.push(...r.value.sources)
      merged.evidences.push(...r.value.evidences)
      merged.relationships.push(...r.value.relationships)
    }
  }
  
  return merged
}


export const filter_stale_events=(res:transform_result,max_age_hrs:number)=>{
  const cutoff=Date.now()-(max_age_hrs*3600000)
  return res.events.filter(e=>(e.start_time||e.created_at)>cutoff)
}

export const compute_global_risk_score=(res:transform_result)=>{
  let risk=0
  for(const e of res.events){
    if(e.severity==="critical")risk+=100
    if(e.severity==="high")risk+=50
    if(e.severity==="elevated")risk+=20
    if(e.severity==="low")risk+=5
  }
  return risk
}

export const find_emerging_hotspots=(res:transform_result)=>{
  const spots:Record<string,number>={}
  for(const e of res.events){
    if(e.location_id){
      spots[e.location_id]=(spots[e.location_id]||0)+1
    }
  }
  return Object.entries(spots).sort((a,b)=>b[1]-a[1]).slice(0,5)
}

export const deduplicate_entities=(res:transform_result)=>{
  const uniq=new Map<string,any>()
  for(const e of res.entities){
    if(!uniq.has(e.name)){
      uniq.set(e.name,e)
    }else{
      const ex=uniq.get(e.name)
      if(e.confidence>ex.confidence)uniq.set(e.name,e)
    }
  }
  return Array.from(uniq.values())
}

export const link_events_to_entities=(res:transform_result)=>{
  
  for(const ev of res.events){
    for(const en of res.entities){
      if(ev.summary.toLowerCase().includes(en.name.toLowerCase())){
        res.relationships.push({
          id: `rel_auto_${ev.id}_${en.id}`, src_id: ev.id, dst_id: en.id,
          type: "mentions", confidence: 60, created_at: Date.now()
        })
      }
    }
  }
  return res
}

export const calculate_source_health=(res:transform_result)=>{
  const src_counts:Record<string,number>={}
  res.evidences.forEach(e=>{
    src_counts[e.source_id]=(src_counts[e.source_id]||0)+1
  })
  return src_counts
}

export const drop_low_confidence=(res:transform_result,threshold:number)=>{
  res.events=res.events.filter(e=>e.confidence>=threshold)
  res.entities=res.entities.filter(e=>e.confidence>=threshold)
  res.claims=res.claims.filter(c=>c.confidence>=threshold)
  return res
}

export const extract_global_timeline=(res:transform_result)=>{
  const tl=[]
  for(const e of res.events){
    tl.push({ time: e.start_time||e.created_at, desc: `Event: ${e.title}`, type: "event" })
  }
  for(const c of res.claims){
    tl.push({ time: c.first_seen, desc: `Claim: ${c.summary}`, type: "claim" })
  }
  return tl.sort((a,b)=>b.time-a.time)
}

export const pipeline_runner=async()=>{
  console.log("starting global intelligence pipeline...")
  let raw=await run_all_connectors()
  console.log(`ingested ${raw.events.length} events from ${raw.sources.length} sources`)
  
  raw=drop_low_confidence(raw,50)
  raw.entities=deduplicate_entities(raw)
  raw=link_events_to_entities(raw)
  
  const risk=compute_global_risk_score(raw)
  console.log(`current global risk score: ${risk}`)
  
  return raw
}
