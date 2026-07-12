


import { connector, fetch_result, transform_result } from "../connector"
import { event, source, evidence, entity } from "../types"
import { calc_dist } from "./aviation"


const maritime_incidents_url="https://api.example.com/maritime/incidents" 
const ais_stream_ws="wss://stream.aisstream.io/v0/stream"

export const maritime_connector: connector={
  source_name: "maritime_intel",
  source_type: "api",
  license_note: "mock maritime data",
  auth_required: false,
  rate_limit: { requests: 50, window_seconds: 60 },
  outputs: ["entity", "event", "evidence", "source"],

  async fetch(): Promise<fetch_result>{
    
    const mock_payloads=[
      { id:"m1", type:"piracy", lat:12.0, lon:45.0, desc:"suspicious approach", vessel_imo:"1234567" },
      { id:"m2", type:"chokepoint_delay", name:"suez", delay_hrs:48, queue:120 },
      { id:"m3", type:"ais_spoofing", lat:35.0, lon:33.0, desc:"gps circle spoofing detected" }
    ]
    return { raw_payloads: mock_payloads, fetch_timestamp: Date.now() }
  },

  transform(data: fetch_result): transform_result{
    const res: transform_result={ entities: [], events: [], claims: [], sources: [], evidences: [], relationships: [] }
    if(!data.raw_payloads.length)return res
    
    const src: source={
      id: "src_maritime", name: "global maritime intel", url: "https://maritime.example.com", type: "sensor",
      reliability: 85, originality: 80, speed: 90, bias_risk: "none",
      state_affiliated: false, created_at: Date.now()
    }
    res.sources.push(src)

    for(const m of data.raw_payloads){
      const evd_id=`evd_maritime_${m.id}`
      res.evidences.push({
        id: evd_id, source_id: src.id, hash: m.id, fetched_at: data.fetch_timestamp, confidence: 85
      })

      if(m.type==="piracy"||m.type==="ais_spoofing"){
        const evt_id=`evt_maritime_${m.id}`
        const evt: event={
          id: evt_id, title: `${m.type.replace("_"," ")} detected`, summary: m.desc,
          category: m.type==="piracy"?"conflict":"cyber", severity: "high", confidence: 80,
          start_time: data.fetch_timestamp, status: "active", created_at: Date.now()
        }
        res.events.push(evt)
        if(m.vessel_imo){
          const ent_id=`ent_vessel_${m.vessel_imo}`
          res.entities.push({
            id: ent_id, type: "vessel", name: `vessel imo ${m.vessel_imo}`, aliases: [], confidence: 90,
            is_canonical: true, created_at: Date.now(), metadata: { imo: m.vessel_imo }
          })
          res.relationships.push({
            id:`rel_${evt_id}_${ent_id}`, src_id: evt_id, dst_id: ent_id, type: "targets", confidence: 90, created_at: Date.now()
          })
        }
      }
      if(m.type==="chokepoint_delay"){
        res.events.push({
          id: `evt_cp_${m.id}`, title: `chokepoint delay: ${m.name}`, summary: `${m.queue} vessels waiting, delay ${m.delay_hrs}h`,
          category: "infrastructure", severity: m.delay_hrs>24?"high":"elevated", confidence: 95,
          start_time: data.fetch_timestamp, status: "active", created_at: Date.now()
        })
      }
    }
    return res
  }
}


export const chokepoints=[
  { id: "suez", name: "suez canal", lat: 30.5852, lon: 32.2654, rad: 50 },
  { id: "panama", name: "panama canal", lat: 9.1011, lon: -79.6958, rad: 50 },
  { id: "hormuz", name: "strait of hormuz", lat: 26.5667, lon: 56.2500, rad: 100 },
  { id: "malacca", name: "strait of malacca", lat: 2.3945, lon: 101.8158, rad: 200 },
  { id: "bab", name: "bab el-mandeb", lat: 12.5833, lon: 43.3333, rad: 100 },
  { id: "bosporus", name: "bosporus strait", lat: 41.2210, lon: 29.1245, rad: 30 }
]

export const check_chokepoint=(lat:number,lon:number)=>{
  for(const cp of chokepoints){
    if(calc_dist(lat,lon,cp.lat,cp.lon)<=cp.rad)return cp.id
  }
  return null
}

export const flag_suspicious_vessel=(v:any)=>{
  const flags=[]
  if(v.speed<1&&v.nav_status===0)flags.push("loitering_underway")
  if(v.heading_change>90&&v.speed>10)flags.push("erratic_maneuver")
  if(v.ais_gap_hrs>24)flags.push("dark_activity")
  if(check_chokepoint(v.lat,v.lon)&&v.ais_gap_hrs>1)flags.push("dark_in_chokepoint")
  return flags
}

export const est_transit_time=(v:any,dest_lat:number,dest_lon:number)=>{
  const d=calc_dist(v.lat,v.lon,dest_lat,dest_lon)
  return v.speed?(d/(v.speed*1.852)):-1
}

export const spoof_check=(v:any,prev_v:any)=>{
  if(!prev_v)return false
  const d=calc_dist(v.lat,v.lon,prev_v.lat,prev_v.lon)
  const t=(v.timestamp-prev_v.timestamp)/3600000 
  if(t<=0)return false
  const req_speed=d/t 
  return req_speed>100 
}

export const calc_cpa=(v1:any,v2:any)=>{
  
  const d=calc_dist(v1.lat,v1.lon,v2.lat,v2.lon)
  const rel_spd=Math.abs((v1.speed||0)-(v2.speed||0))
  return rel_spd?d/rel_spd:d
}

export const detect_sts_transfer=(v1:any,v2:any)=>{
  const d=calc_dist(v1.lat,v1.lon,v2.lat,v2.lon)
  return d<0.5&&(v1.speed||0)<1&&(v2.speed||0)<1
}

export const analyze_fleet=(fleet:any[])=>{
  return {
    total: fleet.length,
    dark: fleet.filter(f=>f.ais_gap_hrs>24).length,
    in_cp: fleet.filter(f=>check_chokepoint(f.lat,f.lon)).length,
    avg_speed: fleet.reduce((a,b)=>a+(b.speed||0),0)/fleet.length
  }
}

export const flag_sanctioned_port_call=(v:any,ports:any[])=>{
  return ports.some(p=>p.sanctioned&&calc_dist(v.lat,v.lon,p.lat,p.lon)<10)
}

export const route_deviation=(v:any,hist:any[])=>{
  if(hist.length<10)return 0
  const avg_lat=hist.reduce((a,b)=>a+b.lat,0)/hist.length
  return Math.abs(v.lat-avg_lat)
}

export const cargo_risk_score=(v:any)=>{
  const high_risk=["oil","lng","weapons","dual_use"]
  return high_risk.includes(v.cargo_type)?100:20
}

export const fleet_density=(lat:number,lon:number,rad:number,fleet:any[])=>{
  return fleet.filter(f=>calc_dist(lat,lon,f.lat,f.lon)<rad).length
}

export const port_congestion=(port:any,fleet:any[])=>{
  const waiting=fleet_density(port.lat,port.lon,20,fleet)
  return waiting>port.capacity?"congested":"normal"
}

export const dark_fleet_ratio=(fleet:any[])=>{
  const dark=fleet.filter(f=>f.is_dark).length
  return fleet.length?dark/fleet.length:0
}
