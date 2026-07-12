


import { connector, fetch_result, transform_result } from "../connector"
import { event, source, evidence, entity, location } from "../types"
import { calc_dist } from "./aviation"

export const conflict_connector: connector={
  source_name: "acled",
  source_type: "api",
  license_note: "acled terms of use",
  auth_required: true,
  rate_limit: { requests: 10, window_seconds: 60 },
  outputs: ["entity", "event", "evidence", "source", "location"],

  async fetch(): Promise<fetch_result>{
    const mock_acled=[
      { id:"c1", date:"2026-06-13", type:"battles", actor1:"state forces", actor2:"rebel group a", lat:15.0, lon:30.0, location:"village x", fatalities:10, notes:"heavy fighting reported" },
      { id:"c2", date:"2026-06-13", type:"explosions", actor1:"unidentified", lat:15.5, lon:30.2, location:"city y", fatalities:0, notes:"ied blast near convoy" },
      { id:"c3", date:"2026-06-12", type:"protests", actor1:"protesters", lat:12.0, lon:28.0, location:"capital", fatalities:0, notes:"peaceful protest against economy" }
    ]
    return { raw_payloads: mock_acled, fetch_timestamp: Date.now() }
  },

  transform(data: fetch_result): transform_result{
    const res: transform_result={ entities: [], events: [], claims: [], sources: [], evidences: [], relationships: [] }
    if(!data.raw_payloads.length)return res
    
    const src: source={
      id: "src_acled", name: "acled", url: "https://acleddata.com", type: "ngo",
      reliability: 95, originality: 90, speed: 70, bias_risk: "none",
      state_affiliated: false, created_at: Date.now()
    }
    res.sources.push(src)

    for(const c of data.raw_payloads){
      const evd_id=`evd_acled_${c.id}`
      res.evidences.push({ id: evd_id, source_id: src.id, hash: c.id, fetched_at: data.fetch_timestamp, confidence: 95 })

      const evt_id=`evt_acled_${c.id}`
      const sev=c.fatalities>50?"critical":c.fatalities>10?"high":c.type==="battles"?"elevated":"info"
      
      res.events.push({
        id: evt_id, title: `${c.type} in ${c.location}`, summary: `${c.notes} (fatalities: ${c.fatalities})`,
        category: c.type==="protests"?"politics":"conflict", severity: sev, confidence: 95,
        start_time: new Date(c.date).getTime(), status: "active", created_at: Date.now()
      })

      const ent_ids=[]
      if(c.actor1){
        const e1=`ent_act_${c.actor1.replace(/\s/g,"_")}`
        ent_ids.push(e1)
        if(!res.entities.find(x=>x.id===e1)){
          res.entities.push({
            id: e1, type: "armed_group", name: c.actor1, aliases: [], confidence: 90,
            is_canonical: true, created_at: Date.now(), metadata: {}
          })
        }
      }
      if(c.actor2){
        const e2=`ent_act_${c.actor2.replace(/\s/g,"_")}`
        ent_ids.push(e2)
        if(!res.entities.find(x=>x.id===e2)){
          res.entities.push({
            id: e2, type: "armed_group", name: c.actor2, aliases: [], confidence: 90,
            is_canonical: true, created_at: Date.now(), metadata: {}
          })
        }
      }

      for(const e_id of ent_ids){
        res.relationships.push({
          id:`rel_${evt_id}_${e_id}`, src_id: evt_id, dst_id: e_id, type: "mentions", confidence: 100, created_at: Date.now()
        })
      }
    }
    return res
  }
}


export const fatality_trend=(events:any[],days:number)=>{
  const cutoff=Date.now()-(days*86400000)
  return events.filter(e=>e.start_time>cutoff).reduce((a,b)=>a+(b.fatalities||0),0)
}

export const battle_density=(lat:number,lon:number,rad:number,events:any[])=>{
  return events.filter(e=>calc_dist(lat,lon,e.lat,e.lon)<rad&&e.type==="battles").length
}

export const predict_escalation=(recent_protests:number,recent_battles:number)=>{
  if(recent_protests>10&&recent_battles>0)return "high_risk_of_escalation"
  if(recent_battles>5)return "active_conflict_zone"
  return "stable"
}

export const calculate_frontline=(events:any[])=>{
  
  if(events.length<3)return null
  const lats=events.map(e=>e.lat), lons=events.map(e=>e.lon)
  const min_lat=Math.min(...lats), max_lat=Math.max(...lats)
  const min_lon=Math.min(...lons), max_lon=Math.max(...lons)
  return { n:max_lat, s:min_lat, e:max_lon, w:min_lon, area_sqkm: calc_dist(min_lat,min_lon,max_lat,min_lon)*calc_dist(min_lat,min_lon,min_lat,max_lon) }
}

export const actor_lethality=(actor_name:string,events:any[])=>{
  const actor_events=events.filter(e=>e.actor1===actor_name||e.actor2===actor_name)
  const total_fat=actor_events.reduce((a,b)=>a+(b.fatalities||0),0)
  return actor_events.length?total_fat/actor_events.length:0
}

export const ied_hotspots=(events:any[])=>{
  
  const grid:Record<string,number>={}
  events.filter(e=>e.type==="explosions").forEach(e=>{
    const k=`${Math.round(e.lat*10)/10}_${Math.round(e.lon*10)/10}`
    grid[k]=(grid[k]||0)+1
  })
  return Object.entries(grid).sort((a,b)=>b[1]-a[1]).slice(0,5)
}

export const civilian_targeting_ratio=(events:any[])=>{
  const civ=events.filter(e=>e.actor2==="civilians").length
  return events.length?civ/events.length:0
}

export const territorial_control_shift=(events:any[])=>{
  const gains=events.filter(e=>e.notes.toLowerCase().includes("took control")).length
  const losses=events.filter(e=>e.notes.toLowerCase().includes("lost control")).length
  return gains-losses
}

export const proxy_war_detect=(actors:string[],known_proxies:Record<string,string>)=>{
  const sponsors=new Set()
  for(const a of actors){
    if(known_proxies[a])sponsors.add(known_proxies[a])
  }
  return sponsors.size>1
}

export const seasonal_conflict_adjust=(month:number,region:string)=>{
  if(region==="sahel"&&month>6&&month<10)return 1.5 
  if(region==="afghanistan"&&month>11||month<3)return 0.5 
  return 1.0
}

export const drone_strike_frequency=(events:any[],days:number)=>{
  const cutoff=Date.now()-(days*86400000)
  return events.filter(e=>e.start_time>cutoff&&e.notes.toLowerCase().includes("drone")).length
}

export const artillery_range_threat=(lat:number,lon:number,frontline_lat:number,frontline_lon:number,max_range_km=30)=>{
  const d=calc_dist(lat,lon,frontline_lat,frontline_lon)
  return d<=max_range_km
}

export const humanitarian_access_score=(battles:number,checkpoints:number,ngo_attacks:number)=>{
  let score=100
  score-=(battles*2)
  score-=(checkpoints*1)
  score-=(ngo_attacks*20)
  return Math.max(0,score)
}
