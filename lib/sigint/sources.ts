import type { source_health } from "@/lib/live/adsb-live"

export type source_result<t>={data:t;source:source_health}

export type swpc_context={
  radio_scale:number
  solar_scale:number
  geomagnetic_scale:number
  kp:number|null
  alerts:Array<{id:string;issued_at:string;message:string}>
}

export type constellation_satellite={
  id:string
  name:string
  line1:string
  line2:string
  system:string
}

export type constellation_context={
  satellites:constellation_satellite[]
  systems:Array<{id:string;count:number}>
}

export type aviation_report={
  id:string
  kind:"pirep"|"airep"|"sigmet"
  lat:number
  lon:number
  observed_at:string
  altitude_ft:number|null
  text:string
  hazard:string|null
}

export type news_report={
  id:string
  title:string
  url:string
  domain:string
  published_at:string|null
  language:string|null
  source_country:string|null
}

export type network_context={
  query_time:string|null
  asn_count:number
  ipv4_count:number
  ipv6_count:number
}

export type place_context={
  label:string
  city:string|null
  country:string|null
  country_code:string|null
}

export type sigint_context={
  space_weather:swpc_context
  constellations:constellation_context
  aviation:aviation_report[]
  news:news_report[]
  network:network_context|null
  place:place_context|null
  sources:source_health[]
}

type cache_row={at:number;data:unknown;count:number}
const cache=new Map<string,cache_row>()
const agent="akashic/0.1 public-osint"

const str=(v:unknown)=>{
  const x=typeof v==="string"?v.trim():""
  return x||null
}

const num=(v:unknown)=>{
  const x=typeof v==="number"?v:typeof v==="string"&&v.trim()?Number(v):Number.NaN
  return Number.isFinite(x)?x:null
}

const arr=(v:unknown)=>Array.isArray(v)?v:[]

const fetch_raw=async(url:string,mode:"json"|"text"="json")=>{
  const ctrl=new AbortController()
  const timer=setTimeout(()=>ctrl.abort(),12_000)
  try{
    const res=await fetch(url,{cache:"no-store",signal:ctrl.signal,headers:{"user-agent":agent,accept:mode==="json"?"application/json":"text/plain"}})
    if(!res.ok)throw new Error(`upstream ${res.status}`)
    return mode==="json"?res.json():res.text()
  }finally{clearTimeout(timer)}
}

const cached=async<t>(cfg:{
  id:string
  label:string
  url:string
  ttl:number
  empty:t
  load:()=>Promise<t>
  count:(x:t)=>number
}):Promise<source_result<t>>=>{
  const now=Date.now()
  const old=cache.get(cfg.id)
  if(old&&now-old.at<cfg.ttl)return{data:old.data as t,source:{id:cfg.id,label:cfg.label,state:"live",fetched_at:new Date(old.at).toISOString(),count:old.count,url:cfg.url}}
  try{
    const data=await cfg.load()
    const count=cfg.count(data)
    cache.set(cfg.id,{at:now,data,count})
    return{data,source:{id:cfg.id,label:cfg.label,state:"live",fetched_at:new Date(now).toISOString(),count,url:cfg.url}}
  }catch(err){
    const error=err instanceof Error?err.message:"source unavailable"
    if(old)return{data:old.data as t,source:{id:cfg.id,label:cfg.label,state:"delayed",fetched_at:new Date(old.at).toISOString(),count:old.count,stale:true,error,url:cfg.url}}
    return{data:cfg.empty,source:{id:cfg.id,label:cfg.label,state:"unavailable",fetched_at:null,count:0,error,url:cfg.url}}
  }
}

export const normalize_swpc=(alerts_raw:unknown,scales_raw:unknown,kp_raw:unknown):swpc_context=>{
  const alerts=arr(alerts_raw).slice(0,12).map((v,i)=>{
    const x=v&&typeof v==="object"?v as Record<string,unknown>:{}
    return{id:str(x.product_id)||`alert-${i}`,issued_at:str(x.issue_datetime)||"",message:(str(x.message)||"").replace(/\s+/g," ").slice(0,420)}
  }).filter(x=>x.message)
  const scales=scales_raw&&typeof scales_raw==="object"?scales_raw as Record<string,unknown>:{}
  const current=(scales["0"]&&typeof scales["0"]==="object"?scales["0"]:scales) as Record<string,unknown>
  const scale=(id:string)=>{
    const x=current?.[id]
    return x&&typeof x==="object"?num((x as Record<string,unknown>).Scale)||0:0
  }
  const rows=arr(kp_raw)
  const last=arr(rows.at(-1))
  const kp=num(last[1])
  return{radio_scale:scale("R"),solar_scale:scale("S"),geomagnetic_scale:scale("G"),kp,alerts}
}

export const parse_tle=(txt:string,system:string):constellation_satellite[]=>{
  const lines=txt.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)
  const out:constellation_satellite[]=[]
  for(let i=0;i+2<lines.length;i++){
    if(!lines[i+1].startsWith("1 ")||!lines[i+2].startsWith("2 "))continue
    const line1=lines[i+1]
    const id=line1.slice(2,7).trim()||`${system}-${i}`
    out.push({id:`${system}-${id}`,name:lines[i],line1,line2:lines[i+2],system})
    i+=2
  }
  return out
}

export const normalize_pireps=(raw:unknown):aviation_report[]=>(arr(raw).map((v,i)=>{
  const x=v&&typeof v==="object"?v as Record<string,unknown>:{}
  const lat=num(x.lat)
  const lon=num(x.lon)
  if(lat===null||lon===null)return null
  const typ=(str(x.pirepType)||"pirep").toLowerCase()
  const sec=num(x.obsTime)
  return{
    id:`air-${sec||i}-${lat.toFixed(2)}-${lon.toFixed(2)}`,
    kind:(typ==="airep"?"airep":"pirep") as "airep"|"pirep",
    lat,lon,
    observed_at:sec?new Date(sec*1000).toISOString():str(x.receiptTime)||"",
    altitude_ft:num(x.fltLvl)!==null?(num(x.fltLvl)||0)*100:null,
    text:(str(x.rawOb)||"aviation report").slice(0,500),
    hazard:null,
  }
}).filter(Boolean) as aviation_report[])

export const normalize_sigmets=(raw:unknown):aviation_report[]=>(arr(raw).map((v,i)=>{
  const x=v&&typeof v==="object"?v as Record<string,unknown>:{}
  const coords=arr(x.coords).map(p=>p&&typeof p==="object"?p as Record<string,unknown>:{}).map(p=>({lat:num(p.lat),lon:num(p.lon)})).filter((p):p is {lat:number;lon:number}=>p.lat!==null&&p.lon!==null)
  if(!coords.length)return null
  const lat=coords.reduce((a,b)=>a+b.lat,0)/coords.length
  const lon=coords.reduce((a,b)=>a+b.lon,0)/coords.length
  const start=num(x.validTimeFrom)
  return{
    id:`sigmet-${str(x.firId)||i}-${str(x.seriesId)||i}`,
    kind:"sigmet" as const,
    lat,lon,
    observed_at:start?new Date(start*1000).toISOString():str(x.receiptTime)||"",
    altitude_ft:num(x.top),
    text:(str(x.rawSigmet)||`${str(x.firName)||"fir"} ${str(x.hazard)||"sigmet"}`).slice(0,700),
    hazard:str(x.hazard),
  }
}).filter(Boolean) as aviation_report[])

export const normalize_gdelt=(raw:unknown):news_report[]=>{
  const root=raw&&typeof raw==="object"?raw as Record<string,unknown>:{}
  return arr(root.articles).map((v,i)=>{
    const x=v&&typeof v==="object"?v as Record<string,unknown>:{}
    const url=str(x.url)
    const title=str(x.title)
    if(!url||!title)return null
    return{
      id:`gdelt-${i}-${url.slice(-32)}`,
      title:title.slice(0,220),
      url,
      domain:str(x.domain)||"",
      published_at:str(x.seendate),
      language:str(x.language),
      source_country:str(x.sourcecountry),
    }
  }).filter((x):x is news_report=>!!x)
}

export const normalize_ripe=(raw:unknown):network_context=>{
  const root=raw&&typeof raw==="object"?raw as Record<string,unknown>:{}
  const data=root.data&&typeof root.data==="object"?root.data as Record<string,unknown>:root
  const resources=data.resources&&typeof data.resources==="object"?data.resources as Record<string,unknown>:{}
  return{
    query_time:str(data.query_time),
    asn_count:arr(resources.asn).length,
    ipv4_count:arr(resources.ipv4).length,
    ipv6_count:arr(resources.ipv6).length,
  }
}

export const normalize_place=(raw:unknown):place_context=>{
  const root=raw&&typeof raw==="object"?raw as Record<string,unknown>:{}
  const address=root.address&&typeof root.address==="object"?root.address as Record<string,unknown>:{}
  return{
    label:str(root.display_name)||"selected region",
    city:str(address.city)||str(address.town)||str(address.state)||null,
    country:str(address.country),
    country_code:str(address.country_code)?.toUpperCase()||null,
  }
}

export const get_swpc=()=>cached<swpc_context>({
  id:"swpc",
  label:"noaa space weather",
  url:"https://services.swpc.noaa.gov/",
  ttl:2*60_000,
  empty:{radio_scale:0,solar_scale:0,geomagnetic_scale:0,kp:null,alerts:[]},
  load:async()=>{
    const [alerts,scales,kp]=await Promise.all([
      fetch_raw("https://services.swpc.noaa.gov/products/alerts.json"),
      fetch_raw("https://services.swpc.noaa.gov/products/noaa-scales.json"),
      fetch_raw("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"),
    ])
    return normalize_swpc(alerts,scales,kp)
  },
  count:x=>x.alerts.length+1,
})

export const get_celestrak=()=>cached<constellation_context>({
  id:"celestrak",
  label:"celestrak gnss",
  url:"https://celestrak.org/NORAD/elements/",
  ttl:30*60_000,
  empty:{satellites:[],systems:[]},
  load:async()=>{
    const groups=[["gps","GPS-OPS"],["galileo","GALILEO"],["glonass","GLO-OPS"],["beidou","BEIDOU"]] as const
    const rows=await Promise.all(groups.map(async([id,group])=>parse_tle(await fetch_raw(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`,"text"),id)))
    const satellites=rows.flat()
    return{satellites,systems:groups.map(([id],i)=>({id,count:rows[i].length}))}
  },
  count:x=>x.satellites.length,
})

export const get_aviation=()=>cached<aviation_report[]>({
  id:"aviation_weather",
  label:"aviation weather center",
  url:"https://aviationweather.gov/data/api/",
  ttl:5*60_000,
  empty:[],
  load:async()=>{
    const [pireps,sigmets]=await Promise.all([
      fetch_raw("https://aviationweather.gov/api/data/pirep?format=json&age=2&bbox=-180,-85,180,85"),
      fetch_raw("https://aviationweather.gov/api/data/isigmet?format=json"),
    ])
    return[...normalize_pireps(pireps).slice(0,260),...normalize_sigmets(sigmets).slice(0,180)]
  },
  count:x=>x.length,
})

export const get_gdelt=(country?:string|null)=>cached({
  id:`gdelt-${country||"global"}`,
  label:"gdelt reporting",
  url:"https://api.gdeltproject.org/api/v2/doc/doc",
  ttl:15*60_000,
  empty:[],
  load:async()=>{
    const terms='("gps interference" OR "gnss spoofing" OR "navigation outage" OR "radio blackout" OR "communications outage")'
    const query=country?`${terms} "${country}"`:terms
    const q=new URLSearchParams({query,mode:"artlist",format:"json",maxrecords:"40",timespan:"1d",sort:"datedesc"})
    return normalize_gdelt(await fetch_raw(`https://api.gdeltproject.org/api/v2/doc/doc?${q}`))
  },
  count:x=>x.length,
})

export const get_ripe=(country?:string|null)=>{
  const code=(country||"").trim().toUpperCase()
  if(!/^[A-Z]{2}$/.test(code))return Promise.resolve<source_result<network_context|null>>({
    data:null,
    source:{id:"ripestat",label:"ripestat network context",state:"unavailable",fetched_at:null,count:0,error:"select a region for country routing context",url:"https://stat.ripe.net/docs/02.data-api/"},
  })
  return cached<network_context>({
    id:`ripestat-${code}`,
    label:"ripestat network context",
    url:"https://stat.ripe.net/docs/02.data-api/",
    ttl:30*60_000,
    empty:{query_time:null,asn_count:0,ipv4_count:0,ipv6_count:0},
    load:async()=>normalize_ripe(await fetch_raw(`https://stat.ripe.net/data/country-resource-list/data.json?resource=${code}`)),
    count:x=>x.asn_count+x.ipv4_count+x.ipv6_count,
  })
}

export const get_place=(lat?:number|null,lon?:number|null)=>{
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return Promise.resolve<source_result<place_context|null>>({
    data:null,
    source:{id:"nominatim",label:"openstreetmap nominatim",state:"unavailable",fetched_at:null,count:0,error:"select a signal for reverse geocoding",url:"https://nominatim.org/release-docs/latest/api/Reverse/"},
  })
  const alat=Math.round((lat as number)*100)/100
  const alon=Math.round((lon as number)*100)/100
  return cached<place_context>({
    id:`nominatim-${alat}-${alon}`,
    label:"openstreetmap nominatim",
    url:"https://nominatim.org/release-docs/latest/api/Reverse/",
    ttl:24*60*60_000,
    empty:{label:"selected region",city:null,country:null,country_code:null},
    load:async()=>normalize_place(await fetch_raw(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${alat}&lon=${alon}&zoom=6&addressdetails=1`)),
    count:()=>1,
  })
}

export const get_sigint_context=async(opts:{lat?:number|null;lon?:number|null;country?:string|null}={}):Promise<sigint_context>=>{
  const place=await get_place(opts.lat,opts.lon)
  const country_code=opts.country||place.data?.country_code
  const country_name=place.data?.country
  const [swpc,celestrak,aviation,gdelt,ripe]=await Promise.all([
    get_swpc(),get_celestrak(),get_aviation(),get_gdelt(country_name),get_ripe(country_code),
  ])
  return{
    space_weather:swpc.data,
    constellations:celestrak.data,
    aviation:aviation.data,
    news:gdelt.data,
    network:ripe.data,
    place:place.data,
    sources:[swpc.source,celestrak.source,aviation.source,gdelt.source,ripe.source,place.source],
  }
}
