


import { connector, fetch_result, transform_result } from "../connector"
import { event, source, evidence, location } from "../types"
import { calc_dist } from "./aviation"

export const weather_connector: connector={
  source_name: "global_weather_alerts",
  source_type: "api",
  license_note: "public meteorological data",
  auth_required: false,
  rate_limit: { requests: 30, window_seconds: 60 },
  outputs: ["event", "evidence", "source", "location"],

  async fetch(): Promise<fetch_result>{
    const mock=[
      { id:"w1", type:"hurricane", name:"beryl", cat:4, lat:15.0, lon:-65.0, wind_kt:120, pressure_mb:950, heading:290, speed_kt:15 },
      { id:"w2", type:"wildfire", name:"creek fire", acres:50000, contained_pct:20, lat:37.0, lon:-119.0 },
      { id:"w3", type:"flood", region:"south asia", severity:"extreme", displaced:100000, lat:24.0, lon:90.0 }
    ]
    return { raw_payloads: mock, fetch_timestamp: Date.now() }
  },

  transform(data: fetch_result): transform_result{
    const res: transform_result={ entities: [], events: [], claims: [], sources: [], evidences: [], relationships: [] }
    if(!data.raw_payloads.length)return res
    
    const src: source={
      id: "src_weather", name: "severe weather center", url: "https://weather.example.com", type: "sensor",
      reliability: 99, originality: 100, speed: 90, bias_risk: "none",
      state_affiliated: true, created_at: Date.now()
    }
    res.sources.push(src)

    for(const w of data.raw_payloads){
      const evd_id=`evd_weather_${w.id}`
      res.evidences.push({ id: evd_id, source_id: src.id, hash: w.id, fetched_at: data.fetch_timestamp, confidence: 99 })

      if(w.type==="hurricane"){
        res.events.push({
          id: `evt_hur_${w.id}`, title: `cat ${w.cat} hurricane ${w.name}`,
          summary: `winds at ${w.wind_kt}kt, moving at ${w.speed_kt}kt. pressure ${w.pressure_mb}mb`,
          category: "weather", severity: w.cat>=3?"critical":w.cat>=1?"high":"elevated",
          confidence: 99, start_time: data.fetch_timestamp, status: "active", created_at: Date.now()
        })
      }else if(w.type==="wildfire"){
        res.events.push({
          id: `evt_fire_${w.id}`, title: `massive wildfire: ${w.name}`,
          summary: `${w.acres} acres burned, ${w.contained_pct}% contained`,
          category: "weather", severity: w.acres>10000?"critical":"high",
          confidence: 95, start_time: data.fetch_timestamp, status: "active", created_at: Date.now()
        })
      }else if(w.type==="flood"){
        res.events.push({
          id: `evt_flood_${w.id}`, title: `extreme flooding in ${w.region}`,
          summary: `est ${w.displaced} people displaced.`,
          category: "weather", severity: "critical",
          confidence: 90, start_time: data.fetch_timestamp, status: "active", created_at: Date.now()
        })
      }
    }
    return res
  }
}


export const saffir_simpson=(wind_kt:number)=>{
  if(wind_kt>=137)return 5
  if(wind_kt>=113)return 4
  if(wind_kt>=96)return 3
  if(wind_kt>=83)return 2
  if(wind_kt>=64)return 1
  return 0
}

export const storm_surge_est=(pressure_mb:number,wind_kt:number,depth_m:number)=>{
  
  const p_drop=1013-pressure_mb
  let surge=(p_drop*0.01)+(wind_kt*0.02)
  if(depth_m<20)surge*=1.5
  return Math.max(0,surge)
}

export const project_hurricane_track=(lat:number,lon:number,heading:number,speed_kt:number,hrs:number)=>{
  const d_km=(speed_kt*1.852)*hrs
  const rad=heading*(Math.PI/180)
  const r_earth=6371
  const lat1=lat*(Math.PI/180)
  const lon1=lon*(Math.PI/180)
  const lat2=Math.asin(Math.sin(lat1)*Math.cos(d_km/r_earth) + Math.cos(lat1)*Math.sin(d_km/r_earth)*Math.cos(rad))
  const lon2=lon1 + Math.atan2(Math.sin(rad)*Math.sin(d_km/r_earth)*Math.cos(lat1), Math.cos(d_km/r_earth)-Math.sin(lat1)*Math.sin(lat2))
  return { lat: lat2*(180/Math.PI), lon: lon2*(180/Math.PI) }
}

export const fire_spread_rate=(wind_kt:number,humidity_pct:number,slope_deg:number)=>{
  
  let rate=1.0
  rate*=(1+(wind_kt/10))
  rate*=(1+(slope_deg/10))
  if(humidity_pct<20)rate*=2
  if(humidity_pct>50)rate*=0.2
  return rate 
}

export const heat_index=(temp_c:number,rh_pct:number)=>{
  
  const t=(temp_c*9/5)+32
  let hi=0.5*(t+61.0+((t-68.0)*1.2)+(rh_pct*0.094))
  if(hi>80){
    hi=-42.379+2.04901523*t+10.14333127*rh_pct-0.22475541*t*rh_pct-0.00683783*t*t-0.05481717*rh_pct*rh_pct+0.00122874*t*t*rh_pct+0.00085282*t*rh_pct*rh_pct-0.00000199*t*t*rh_pct*rh_pct
  }
  return (hi-32)*5/9 
}

export const drought_index=(rainfall_mm_30d:number,avg_temp_c:number)=>{
  
  const evap=avg_temp_c*2
  return rainfall_mm_30d-evap
}

export const crop_yield_impact=(drought_idx:number,crop:"wheat"|"corn"|"rice")=>{
  if(drought_idx>-10)return 0
  const factor=Math.abs(drought_idx)*0.5
  const sensitivity={ "corn":1.2, "wheat":1.0, "rice":1.5 }
  return Math.min(100,factor*sensitivity[crop])
}

export const power_outage_risk=(wind_kt:number,ice_mm:number)=>{
  let risk=0
  if(wind_kt>40)risk+=50
  if(wind_kt>60)risk+=30
  if(ice_mm>5)risk+=40
  if(ice_mm>10)risk+=40
  return Math.min(100,risk)
}

export const flash_flood_guidance=(rainfall_rate_mm_hr:number,soil_saturation_pct:number)=>{
  if(soil_saturation_pct>90&&rainfall_rate_mm_hr>20)return "extreme"
  if(soil_saturation_pct>70&&rainfall_rate_mm_hr>30)return "high"
  if(rainfall_rate_mm_hr>50)return "elevated"
  return "low"
}

export const infrastructure_climate_exposure=(lat:number,lon:number,elev_m:number)=>{
  const sea_level_rise_risk=elev_m<2?"high":"low"
  const is_coast=elev_m<10 
  return { sea_level_rise_risk, hurricane_risk: is_coast?"high":"low" }
}

export const atmospheric_river_intensity=(ivt_kg_ms:number,duration_hrs:number)=>{
  
  if(ivt_kg_ms>1000&&duration_hrs>48)return 5 
  if(ivt_kg_ms>750&&duration_hrs>48)return 4
  if(ivt_kg_ms>500&&duration_hrs>24)return 3
  if(ivt_kg_ms>250&&duration_hrs>24)return 2
  if(ivt_kg_ms>250)return 1
  return 0
}

export const aviation_turbulence_risk=(wind_shear_kt_1kft:number)=>{
  if(wind_shear_kt_1kft>15)return "severe"
  if(wind_shear_kt_1kft>10)return "moderate"
  return "light"
}
