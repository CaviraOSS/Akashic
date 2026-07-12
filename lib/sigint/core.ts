import type { adsb_aircraft,adsb_snapshot,source_health } from "@/lib/live/adsb-live"

export type sigint_severity="low"|"medium"|"high"|"critical"
export type sigint_evidence_class="measured"|"derived"|"contextual"
export type sigint_kind="gps_loss"|"navigation_degradation"|"position_stale"|"emergency"|"unlawful_interference"|"radio_failure"|"integrity_drop"|"identity_change"|"impossible_movement"

export type sigint_evidence={
  label:string
  value:string
  class:sigint_evidence_class
  source:string
  observed_at:string
}

export type sigint_finding={
  id:string
  kind:sigint_kind
  title:string
  description:string
  lat:number
  lon:number
  first_seen:string
  last_seen:string
  severity:sigint_severity
  confidence:number
  evidence_class:sigint_evidence_class
  aircraft:string
  callsign:string
  cell_id:string
  telemetry:Partial<adsb_aircraft>
  evidence:sigint_evidence[]
}

export type sigint_cell={
  id:string
  center:[number,number]
  bounds:[number,number,number,number]
  polygon:{type:"Feature";properties:{id:string};geometry:{type:"Polygon";coordinates:number[][][]}}
  aircraft_count:number
  degraded_count:number
  healthy_count:number
  degraded_pct:number
  confidence:number
  severity:sigint_severity
  evidence_types:sigint_kind[]
  last_seen:string
}

export type sigint_analysis={
  generated_at:string
  observed_from:string
  observed_to:string
  cold_start:boolean
  findings:sigint_finding[]
  cells:sigint_cell[]
  stats:{
    total:number
    critical:number
    high:number
    navigation:number
    transponder:number
    active_cells:number
    affected_aircraft:number
  }
  sources:source_health[]
}

type hist={
  at:number
  lat:number
  lon:number
  flight:string
  squawk:string|null
  nic:number|null
  nac_p:number|null
}

const history=new Map<string,hist[]>()
let started_at=0
const hour_ms=60*60_000
const cell_size=5

export const reset_sigint_history=()=>{history.clear();started_at=0}

export const corrected_bad_pct=(bad:number,good:number)=>
  Math.round(1000*Math.max(0,bad-1)/Math.max(1,bad+good))/10

const cell_key=(a:Pick<adsb_aircraft,"lat"|"lon">)=>{
  const x=Math.floor((a.lon+180)/cell_size)
  const y=Math.floor((a.lat+90)/cell_size)
  return`${x}:${y}`
}

const cell_box=(id:string)=>{
  const [x,y]=id.split(":").map(Number)
  const west=x*cell_size-180
  const south=y*cell_size-90
  return{west,south,east:west+cell_size,north:south+cell_size}
}

const degraded=(a:adsb_aircraft)=>
  a.gps_ok_before!==null||
  (a.nic!==null&&a.nic<=4)||
  (a.nac_p!==null&&a.nac_p<=4)||
  (a.rc!==null&&a.rc>=3704)

const sev_rank:Record<sigint_severity,number>={low:0,medium:1,high:2,critical:3}
const max_sev=(a:sigint_severity,b:sigint_severity)=>sev_rank[a]>=sev_rank[b]?a:b

const cell_severity=(pct:number,count:number):sigint_severity=>
  count>=8&&pct>=55?"critical":
  count>=6&&pct>=35?"high":
  count>=4&&pct>=15?"medium":"low"

const cell_confidence=(bad:number,total:number,pct:number)=>{
  if(total<3)return 25
  return Math.min(96,Math.round(28+Math.min(32,total*4)+Math.min(36,pct*.8)+(bad>=3?8:0)))
}

const distance_m=(a:hist,b:hist)=>{
  const r=6371e3
  const p1=a.lat*Math.PI/180
  const p2=b.lat*Math.PI/180
  const dp=(b.lat-a.lat)*Math.PI/180
  const dl=(b.lon-a.lon)*Math.PI/180
  const q=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2
  return 2*r*Math.atan2(Math.sqrt(q),Math.sqrt(1-q))
}

const finding=(a:adsb_aircraft,kind:sigint_kind,severity:sigint_severity,confidence:number,title:string,description:string,value:string,at:string):sigint_finding=>({
  id:`${kind}-${a.hex}`,
  kind,
  title,
  description,
  lat:a.lat,
  lon:a.lon,
  first_seen:at,
  last_seen:at,
  severity,
  confidence,
  evidence_class:kind==="integrity_drop"||kind==="identity_change"||kind==="impossible_movement"?"derived":"measured",
  aircraft:a.hex,
  callsign:a.flight,
  cell_id:cell_key(a),
  telemetry:{
    squawk:a.squawk,emergency:a.emergency,nic:a.nic,nac_p:a.nac_p,nac_v:a.nac_v,
    rc:a.rc,sil:a.sil,sil_type:a.sil_type,seen:a.seen,seen_pos:a.seen_pos,
    messages:a.messages,rssi:a.rssi,gps_ok_before:a.gps_ok_before,nav_modes:a.nav_modes,
    alt_baro:a.alt_baro,ground_speed:a.ground_speed,track:a.track,
  },
  evidence:[{label:title,value,class:kind==="integrity_drop"||kind==="identity_change"||kind==="impossible_movement"?"derived":"measured",source:"adsb.lol",observed_at:at}],
})

export const analyze_sigint=(snap:adsb_snapshot,now=Date.now()):sigint_analysis=>{
  if(!started_at)started_at=now
  const at=new Date(now).toISOString()
  const out:sigint_finding[]=[]
  const cells=new Map<string,{all:Set<string>;bad:Set<string>;types:Set<sigint_kind>;sev:sigint_severity}>()
  for(const a of snap.aircraft){
    const id=cell_key(a)
    const c=cells.get(id)||{all:new Set<string>(),bad:new Set<string>(),types:new Set<sigint_kind>(),sev:"low" as sigint_severity}
    c.all.add(a.hex)
    if(degraded(a))c.bad.add(a.hex)
    cells.set(id,c)

    const add=(x:sigint_finding)=>{
      out.push(x)
      c.types.add(x.kind)
      c.sev=max_sev(c.sev,x.severity)
    }

    if(a.squawk==="7500")add(finding(a,"unlawful_interference","critical",98,"unlawful interference code","aircraft reports transponder code 7500",a.squawk,at))
    else if(a.squawk==="7600")add(finding(a,"radio_failure","medium",92,"radio communication failure","aircraft reports transponder code 7600",a.squawk,at))
    else if(a.squawk==="7700"||a.emergency&&a.emergency!=="none"&&a.emergency!=="no")add(finding(a,"emergency","critical",96,"aircraft emergency","aircraft telemetry reports an emergency state",a.squawk||a.emergency||"reported",at))

    if(a.gps_ok_before!==null)add(finding(a,"gps_loss","high",88,"reported gps degradation","aircraft telemetry includes an experimental gps degradation indicator",String(a.gps_ok_before),at))
    if((a.nic!==null&&a.nic<=4)||(a.nac_p!==null&&a.nac_p<=4)||(a.rc!==null&&a.rc>=3704)){
      const vals=`nic ${a.nic??"-"} / nacp ${a.nac_p??"-"} / rc ${a.rc??"-"}m`
      add(finding(a,"navigation_degradation","medium",72,"low navigation integrity","reported containment or navigation accuracy is degraded",vals,at))
    }
    if((a.seen_pos??0)>60)add(finding(a,"position_stale","medium",58,"stale aircraft position","aircraft messages continue but its last reported position is old",`${Math.round(a.seen_pos||0)} seconds`,at))

    const rows=history.get(a.hex)||[]
    const prev=rows.at(-1)
    if(prev){
      if(prev.flight&&a.flight&&prev.flight!==a.flight)add(finding(a,"identity_change","medium",62,"aircraft identity changed","callsign changed inside the observation window",`${prev.flight} to ${a.flight}`,at))
      if((prev.nic??0)-(a.nic??0)>=3||(prev.nac_p??0)-(a.nac_p??0)>=3)add(finding(a,"integrity_drop","high",78,"navigation integrity dropped","reported navigation integrity fell sharply between observations",`nic ${prev.nic??"-"} to ${a.nic??"-"}`,at))
      const dt=(now-prev.at)/1000
      if(dt>=10&&distance_m(prev,{...prev,lat:a.lat,lon:a.lon})/dt>450)add(finding(a,"impossible_movement","high",76,"impossible position jump","position change exceeds a plausible aircraft ground speed",`${Math.round(distance_m(prev,{...prev,lat:a.lat,lon:a.lon})/dt)} m/s`,at))
    }
    const next=[...rows,{at:now,lat:a.lat,lon:a.lon,flight:a.flight,squawk:a.squawk,nic:a.nic,nac_p:a.nac_p}].filter(x=>now-x.at<=hour_ms).slice(-12)
    history.set(a.hex,next)
  }

  for(const [id,rows] of history)if(!rows.length||now-rows.at(-1)!.at>hour_ms)history.delete(id)

  const cell_rows:sigint_cell[]=[...cells].map(([id,c])=>{
    const box=cell_box(id)
    const total=c.all.size
    const bad=c.bad.size
    const pct=corrected_bad_pct(bad,total-bad)
    const sev=max_sev(c.sev,cell_severity(pct,total))
    return{
      id:`sigcell-${id}`,
      center:[(box.west+box.east)/2,(box.south+box.north)/2] as [number,number],
      bounds:[box.west,box.south,box.east,box.north] as [number,number,number,number],
      polygon:{type:"Feature" as const,properties:{id:`sigcell-${id}`},geometry:{type:"Polygon" as const,coordinates:[[[box.west,box.south],[box.east,box.south],[box.east,box.north],[box.west,box.north],[box.west,box.south]]]}},
      aircraft_count:total,
      degraded_count:bad,
      healthy_count:total-bad,
      degraded_pct:pct,
      confidence:cell_confidence(bad,total,pct),
      severity:sev,
      evidence_types:[...c.types],
      last_seen:at,
    }
  }).filter(x=>x.degraded_count>0||x.evidence_types.length>0)

  const affected=new Set(out.map(x=>x.aircraft)).size
  const times=[...history.values()].flat().map(x=>x.at)
  return{
    generated_at:at,
    observed_from:new Date(times.length?Math.min(...times):now).toISOString(),
    observed_to:at,
    cold_start:now-started_at<90_000,
    findings:out.sort((a,b)=>sev_rank[b.severity]-sev_rank[a.severity]||b.confidence-a.confidence),
    cells:cell_rows.sort((a,b)=>sev_rank[b.severity]-sev_rank[a.severity]||b.confidence-a.confidence),
    stats:{
      total:out.length,
      critical:out.filter(x=>x.severity==="critical").length,
      high:out.filter(x=>x.severity==="high").length,
      navigation:out.filter(x=>["gps_loss","navigation_degradation","position_stale","integrity_drop","impossible_movement"].includes(x.kind)).length,
      transponder:out.filter(x=>["emergency","unlawful_interference","radio_failure","identity_change"].includes(x.kind)).length,
      active_cells:cell_rows.length,
      affected_aircraft:affected,
    },
    sources:[snap.source],
  }
}
