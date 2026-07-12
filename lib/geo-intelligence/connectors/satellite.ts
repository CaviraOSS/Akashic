


import { connector, fetch_result, transform_result } from "../connector"
import { event, source, evidence, entity } from "../types"
import { calc_dist } from "./aviation"

export const satellite_connector: connector={
  source_name: "space_track",
  source_type: "api",
  license_note: "public tle data",
  auth_required: false,
  rate_limit: { requests: 20, window_seconds: 60 },
  outputs: ["entity", "event", "evidence", "source"],

  async fetch(): Promise<fetch_result>{
    const mock=[
      { id:"25544", name:"iss (zarya)", type:"station", lat:51.6, lon:45.0, alt:410, vel:7.66 },
      { id:"49260", name:"landsat 9", type:"earth_obs", lat:-20.0, lon:120.0, alt:705, vel:7.5 },
      { id:"starlink-123", name:"starlink-1234", type:"comms", lat:45.0, lon:-100.0, alt:550, vel:7.6 }
    ]
    return { raw_payloads: mock, fetch_timestamp: Date.now() }
  },

  transform(data: fetch_result): transform_result{
    const res: transform_result={ entities: [], events: [], claims: [], sources: [], evidences: [], relationships: [] }
    if(!data.raw_payloads.length)return res
    
    const src: source={
      id: "src_spacetrack", name: "space track", url: "https://space-track.org", type: "sensor",
      reliability: 99, originality: 100, speed: 90, bias_risk: "none",
      state_affiliated: true, created_at: Date.now()
    }
    res.sources.push(src)

    for(const sat of data.raw_payloads){
      const evd_id=`evd_sat_${sat.id}`
      res.evidences.push({ id: evd_id, source_id: src.id, hash: sat.id, fetched_at: data.fetch_timestamp, confidence: 99 })

      const ent_id=`ent_sat_${sat.id}`
      res.entities.push({
        id: ent_id, type: "satellite", name: sat.name, aliases: [], confidence: 99,
        is_canonical: true, created_at: Date.now(), metadata: { alt: sat.alt, type: sat.type }
      })

      
      if(sat.type==="earth_obs"&&is_over_conflict(sat.lat,sat.lon)){
        const evt_id=`evt_satpass_${sat.id}`
        res.events.push({
          id: evt_id, title: `isr satellite pass: ${sat.name}`,
          summary: `earth observation satellite ${sat.name} passed over active conflict zone at alt ${sat.alt}km.`,
          category: "infrastructure", severity: "elevated", confidence: 90,
          start_time: data.fetch_timestamp, status: "active", created_at: Date.now()
        })
        res.relationships.push({ id:`rel_${evt_id}_${ent_id}`, src_id: evt_id, dst_id: ent_id, type: "mentions", confidence: 100, created_at: Date.now() })
      }
    }
    return res
  }
}


export const is_over_conflict=(lat:number,lon:number)=>{
  const conflict_zones=[{lat:48.0,lon:37.0},{lat:31.0,lon:34.0}]
  for(const cz of conflict_zones){
    if(calc_dist(lat,lon,cz.lat,cz.lon)<500)return true
  }
  return false
}

export const calc_orbital_period=(alt_km:number)=>{
  const r_earth=6371
  const r=r_earth+alt_km
  const mu=398600.4418 
  return 2*Math.PI*Math.sqrt(Math.pow(r,3)/mu) 
}

export const orbital_velocity=(alt_km:number)=>{
  const r_earth=6371
  const r=r_earth+alt_km
  const mu=398600.4418
  return Math.sqrt(mu/r) 
}

export const sgp4_mock=(tle_line1:string,tle_line2:string,timestamp:number)=>{
  
  return { lat:0, lon:0, alt:400 }
}

export const kessler_syndrome_risk=(debris_count:number,volume_km3:number)=>{
  const density=debris_count/volume_km3
  return density>0.000001?"high":"low" 
}

export const calculate_footprint_radius=(alt_km:number,min_elev_deg:number)=>{
  const r_earth=6371
  const min_elev_rad=min_elev_deg*(Math.PI/180)
  const d=Math.asin((r_earth/(r_earth+alt_km))*Math.cos(min_elev_rad))-min_elev_rad
  return d*r_earth
}

export const is_in_footprint=(sat_lat:number,sat_lon:number,target_lat:number,target_lon:number,alt_km:number)=>{
  const rad=calculate_footprint_radius(alt_km,10) 
  return calc_dist(sat_lat,sat_lon,target_lat,target_lon)<=rad
}

export const detect_rendezvous=(sat1:any,sat2:any)=>{
  const d=calc_dist(sat1.lat,sat1.lon,sat2.lat,sat2.lon)
  const alt_diff=Math.abs(sat1.alt-sat2.alt)
  return d<50&&alt_diff<10
}

export const eclipse_time=(alt_km:number)=>{
  const r_earth=6371
  const r=r_earth+alt_km
  const fraction=(1/Math.PI)*Math.asin(r_earth/r)
  return fraction*calc_orbital_period(alt_km)
}

export const solar_panel_degradation=(years_in_orbit:number,solar_flare_count:number)=>{
  let eff=100
  eff-=(years_in_orbit*1.5)
  eff-=(solar_flare_count*0.1)
  return Math.max(0,eff)
}

export const space_weather_drag=(f107_index:number,kp_index:number,alt_km:number)=>{
  if(alt_km>600)return "low"
  if(f107_index>150&&kp_index>5)return "high"
  return "nominal"
}

export const gps_jamming_detection=(adsb_aircraft:any[])=>{
  
  let jammed=0
  for(const ac of adsb_aircraft){
    if(ac.nic<5||ac.nac_p<5)jammed++ 
  }
  return jammed>10
}
