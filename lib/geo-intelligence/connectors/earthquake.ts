


import { connector, fetch_result, transform_result } from "../connector"
import { event, source, evidence, entity, location } from "../types"

const usgs_url="https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"

export const earthquake_connector: connector={
  source_name: "usgs",
  source_type: "api",
  license_note: "public domain usgs data",
  auth_required: false,
  rate_limit: { requests: 60, window_seconds: 60 },
  outputs: ["event", "evidence", "source", "location"],

  async fetch(): Promise<fetch_result>{
    try{
      const res=await fetch(usgs_url)
      const data=await res.json()
      return { raw_payloads: data.features||[], fetch_timestamp: Date.now() }
    }catch(e:any){
      return { raw_payloads: [], fetch_timestamp: Date.now(), error: e.message }
    }
  },

  transform(data: fetch_result): transform_result{
    const res: transform_result={ entities: [], events: [], claims: [], sources: [], evidences: [], relationships: [] }
    if(!data.raw_payloads.length)return res
    
    const src: source={
      id: "src_usgs", name: "us geological survey", url: "https://earthquake.usgs.gov", type: "sensor",
      reliability: 99, originality: 100, speed: 95, bias_risk: "none",
      state_affiliated: true, created_at: Date.now()
    }
    res.sources.push(src)

    for(const f of data.raw_payloads){
      const evd_id=`evd_eq_${f.id}`
      res.evidences.push({
        id: evd_id, source_id: src.id, url: f.properties.url, hash: f.id, fetched_at: data.fetch_timestamp, confidence: 99
      })

      const mag=f.properties.mag
      const coords=f.geometry.coordinates

      const evt_id=`evt_eq_${f.id}`
      const evt: event={
        id: evt_id,
        title: `M${mag} earthquake - ${f.properties.place}`,
        summary: `a magnitude ${mag} earthquake occurred at depth ${coords[2]}km. status: ${f.properties.status}`,
        category: "weather", 
        severity: mag>=6?"critical":mag>=4.5?"high":mag>=3?"elevated":"info",
        confidence: f.properties.status==="reviewed"?99:80,
        start_time: f.properties.time,
        status: "active",
        created_at: Date.now()
      }
      res.events.push(evt)
    }
    
    return res
  }
}


export const get_tsunami_risk=(mag:number,depth:number,is_ocean:boolean)=>{
  if(mag<7.0)return false
  if(depth>100)return false
  return is_ocean
}

export const calc_energy_joules=(mag:number)=>{
  
  return Math.pow(10, 4.8 + 1.5*mag)
}

export const impact_radius=(mag:number)=>{
  
  return Math.pow(10, mag/2)*2 
}

export const p_wave_travel_time=(dist_km:number)=>{
  return dist_km/8.0 
}

export const s_wave_travel_time=(dist_km:number)=>{
  return dist_km/4.0 
}

export const alert_lead_time=(dist_km:number)=>{
  return s_wave_travel_time(dist_km)-p_wave_travel_time(dist_km)
}

export const building_resonance=(height_m:number)=>{
  return height_m/30.0 
}

export const mercalli_intensity_est=(mag:number,dist_km:number,depth_km:number)=>{
  
  const r=Math.sqrt(dist_km*dist_km+depth_km*depth_km)
  let i=1.5*(mag-1.5)-1.5*Math.log10(r)
  return Math.max(1,Math.min(12,Math.round(i)))
}

export const aftershock_prob=(days_since:number,main_mag:number)=>{
  
  const K=Math.pow(10,main_mag-2)
  return Math.min(1.0, K/(Math.pow(days_since+0.1, 1.2)))
}

export const liquefaction_risk=(intensity:number,soil_type:"rock"|"sand"|"clay"|"water_sat")=>{
  if(intensity<6)return "none"
  if(soil_type==="water_sat")return "high"
  if(soil_type==="sand")return "medium"
  return "low"
}

export const fault_slip_rate=(mm_per_yr:number)=>{
  return mm_per_yr/1000 
}

export const next_big_one_prob=(slip_rate_m_yr:number,years_since:number,slip_needed_m:number)=>{
  const accumulated=slip_rate_m_yr*years_since
  return Math.min(1.0, accumulated/slip_needed_m)
}

export const identify_tectonic_plate=(lat:number,lon:number)=>{
  
  if(lat>40&&lon>-130&&lon<-120)return "juan_de_fuca"
  if(lat>0&&lat<60&&lon>-180&&lon<-100)return "pacific"
  if(lat>0&&lon>100&&lon<150)return "philippine"
  return "unknown"
}
