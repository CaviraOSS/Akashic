


import { connector, fetch_result, transform_result } from "../connector"
import { event, source, evidence, entity, flight_tracking } from "../types"

const mil_url="https://api.adsb.lol/v2/mil"
const ladd_url="https://api.adsb.lol/v2/ladd"
const bounds_url="https://api.adsb.lol/v2/point/0/0/250" 

export const aviation_connector: connector={
  source_name: "adsb.lol",
  source_type: "api",
  license_note: "open data adsb",
  auth_required: false,
  rate_limit: { requests: 10, window_seconds: 60 },
  outputs: ["entity", "event", "evidence", "source"],

  async fetch(): Promise<fetch_result>{
    try{
      const res=await Promise.allSettled([
        fetch(mil_url).then(r=>r.json()),
        fetch(ladd_url).then(r=>r.json())
      ])
      const payloads=[]
      for(const r of res)if(r.status==="fulfilled"&&r.value.ac)payloads.push(...r.value.ac)
      return { raw_payloads: payloads, fetch_timestamp: Date.now() }
    }catch(e:any){
      return { raw_payloads: [], fetch_timestamp: Date.now(), error: e.message }
    }
  },

  transform(data: fetch_result): transform_result{
    const res: transform_result={ entities: [], events: [], claims: [], sources: [], evidences: [], relationships: [] }
    if(!data.raw_payloads.length)return res
    
    const src: source={
      id: "src_adsblol", name: "adsb.lol", url: "https://adsb.lol", type: "sensor",
      reliability: 95, originality: 90, speed: 99, bias_risk: "none",
      state_affiliated: false, created_at: Date.now()
    }
    res.sources.push(src)

    
    const seen=new Set<string>()
    for(const ac of data.raw_payloads){
      if(!ac.hex||seen.has(ac.hex))continue
      seen.add(ac.hex)

      const evd_id=`evd_adsb_${ac.hex}_${data.fetch_timestamp}`
      const evd: evidence={
        id: evd_id, source_id: src.id, url: `https://globe.adsb.lol/?icao=${ac.hex}`,
        hash: `${ac.hex}_${ac.seen_pos}`, fetched_at: data.fetch_timestamp, confidence: 99
      }
      res.evidences.push(evd)

      const ent_id=`ent_ac_${ac.hex}`
      const ent: entity={
        id: ent_id, type: "aircraft", name: ac.flight?ac.flight.trim():`unknown_${ac.hex}`,
        aliases: [ac.r].filter(Boolean), description: `type: ${ac.t||"unknown"}, reg: ${ac.r||"unknown"}`,
        confidence: 90, is_canonical: true, created_at: Date.now(),
        metadata: { icao: ac.hex, desc: ac.desc, category: ac.category }
      }
      res.entities.push(ent)

      
      
      if(ac.mil||ac.ladd){
        const evt_id=`evt_ac_${ac.hex}_${data.fetch_timestamp}`
        const evt: event={
          id: evt_id,
          title: `interesting flight detected: ${ent.name}`,
          summary: `military or ladd aircraft ${ac.r||ac.hex} detected at altitude ${ac.alt_baro}`,
          category: "aviation",
          severity: ac.mil?"elevated":"info",
          confidence: 90,
          start_time: data.fetch_timestamp,
          status: "active",
          created_at: Date.now()
        }
        res.events.push(evt)
        res.relationships.push({
          id:`rel_${evt_id}_${ent_id}`, src_id: evt_id, dst_id: ent_id,
          type: "mentions", confidence: 100, created_at: Date.now()
        })
      }
    }
    return res
  }
}


export const calc_dist=(lat1:number,lon1:number,lat2:number,lon2:number)=>{
  const p=0.017453292519943295;const c=Math.cos;
  return 12742*Math.asin(Math.sqrt(0.5-c((lat2-lat1)*p)/2+c(lat1*p)*c(lat2*p)*(1-c((lon2-lon1)*p))/2))
}


export const in_bounds=(lat:number,lon:number,box:{n:number,s:number,e:number,w:number})=>{
  return lat<=box.n&&lat>=box.s&&lon<=box.e&&lon>=box.w
}


export const mil_patterns=["nato","usaf","raf","f16","b52","awacs","drone","uav"]
export const is_mil=(callsign:string,desc:string)=>{
  const l_cs=callsign.toLowerCase(), l_d=desc.toLowerCase()
  return mil_patterns.some(p=>l_cs.includes(p)||l_d.includes(p))
}

export const gen_flight_path=(start:[number,number],end:[number,number],steps:number)=>{
  const pts=[]
  for(let i=0;i<=steps;i++){
    const t=i/steps
    pts.push([start[0]+(end[0]-start[0])*t, start[1]+(end[1]-start[1])*t])
  }
  return pts
}

export const est_arrival=(dist_km:number,speed_kt:number)=>{
  if(!speed_kt)return -1
  const speed_kmh=speed_kt*1.852
  return (dist_km/speed_kmh)*3600*1000 
}


export const detect_anomalies=(ac:any)=>{
  const anoms=[]
  if(ac.alt_baro<1000&&ac.speed>300)anoms.push("low_fast")
  if(ac.squawk==="7700")anoms.push("emergency")
  if(ac.squawk==="7600")anoms.push("radio_fail")
  if(ac.squawk==="7500")anoms.push("hijack")
  return anoms
}

export const group_flights=(acs:any[])=>{
  
  const clusters:any[][]=[];const used=new Set<string>()
  for(let i=0;i<acs.length;i++){
    if(used.has(acs[i].hex))continue
    const cl=[acs[i]];used.add(acs[i].hex)
    for(let j=i+1;j<acs.length;j++){
      if(used.has(acs[j].hex))continue
      if(calc_dist(acs[i].lat,acs[i].lon,acs[j].lat,acs[j].lon)<10){
        cl.push(acs[j]);used.add(acs[j].hex)
      }
    }
    if(cl.length>1)clusters.push(cl)
  }
  return clusters
}

export const format_squawk=(sq:string)=>{
  const map:Record<string,string>={"7700":"emergency","7600":"radio_loss","7500":"hijack"}
  return map[sq]||"normal"
}

export const identify_vip=(hex:string)=>{
  const vips=["adfdf8","adfdf9"] 
  return vips.includes(hex.toLowerCase())
}

export const score_flight=(ac:any)=>{
  let s=0
  if(ac.mil)s+=50
  if(ac.squawk==="7700")s+=100
  if(identify_vip(ac.hex))s+=100
  return s
}
