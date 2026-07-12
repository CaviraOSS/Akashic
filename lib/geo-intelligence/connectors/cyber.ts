


import { connector, fetch_result, transform_result } from "../connector"
import { event, source, evidence, entity, indicator } from "../types"


const threat_feeds=["https://api.example.com/otx/pulses","https://api.example.com/nvd/cves"]

export const cyber_connector: connector={
  source_name: "global_cyber_intel",
  source_type: "api",
  license_note: "mock cyber data",
  auth_required: false,
  rate_limit: { requests: 20, window_seconds: 60 },
  outputs: ["entity", "event", "evidence", "source", "indicator"],

  async fetch(): Promise<fetch_result>{
    const mock=[
      { id:"cve-2026-9999", type:"cve", cvss:9.8, desc:"rce in critical infra switch", tags:["ics","rce","zero-day"] },
      { id:"apt-42", type:"apt", campaign:"sandstorm", target:"energy_sector", iocs:["1.2.3.4","malware.exe"] },
      { id:"ddos-1", type:"attack", target_ip:"8.8.8.8", protocol:"dns", bw_gbps:500 }
    ]
    return { raw_payloads: mock, fetch_timestamp: Date.now() }
  },

  transform(data: fetch_result): transform_result{
    const res: transform_result={ entities: [], events: [], claims: [], sources: [], evidences: [], relationships: [] }
    if(!data.raw_payloads.length)return res
    
    const src: source={
      id: "src_cyber", name: "cyber threat intel", url: "https://cyber.example.com", type: "cyber",
      reliability: 90, originality: 85, speed: 95, bias_risk: "none",
      state_affiliated: false, created_at: Date.now()
    }
    res.sources.push(src)

    for(const t of data.raw_payloads){
      const evd_id=`evd_cyber_${t.id}`
      res.evidences.push({ id: evd_id, source_id: src.id, hash: t.id, fetched_at: data.fetch_timestamp, confidence: 90 })

      if(t.type==="cve"){
        const evt_id=`evt_cve_${t.id}`
        res.events.push({
          id: evt_id, title: `new critical vuln: ${t.id}`, summary: t.desc, category: "cyber",
          severity: t.cvss>9?"critical":"high", confidence: 95, start_time: data.fetch_timestamp,
          status: "active", created_at: Date.now()
        })
      }else if(t.type==="apt"){
        const ent_id=`ent_apt_${t.id}`
        res.entities.push({
          id: ent_id, type: "apt", name: t.id, aliases: [t.campaign], confidence: 85,
          is_canonical: true, created_at: Date.now(), metadata: { target: t.target }
        })
        const evt_id=`evt_campaign_${t.id}`
        res.events.push({
          id: evt_id, title: `apt campaign active: ${t.campaign}`, summary: `target: ${t.target}`,
          category: "cyber", severity: "high", confidence: 80, start_time: data.fetch_timestamp,
          status: "active", created_at: Date.now()
        })
        res.relationships.push({ id:`rel_${evt_id}_${ent_id}`, src_id: evt_id, dst_id: ent_id, type: "attributed_to", confidence: 80, created_at: Date.now() })
      }else if(t.type==="attack"){
        res.events.push({
          id: `evt_ddos_${t.id}`, title: `massive ddos on ${t.target_ip}`, summary: `${t.bw_gbps} gbps ${t.protocol} flood`,
          category: "infrastructure", severity: "critical", confidence: 99, start_time: data.fetch_timestamp,
          status: "active", created_at: Date.now()
        })
      }
    }
    return res
  }
}


export const cvss_severity=(score:number)=>{
  if(score>=9.0)return "critical"
  if(score>=7.0)return "high"
  if(score>=4.0)return "medium"
  return "low"
}

export const extract_iocs=(text:string)=>{
  const iocs={ ips:[] as string[], domains:[] as string[], hashes:[] as string[] }
  const ip_re=/(?:[0-9]{1,3}\.){3}[0-9]{1,3}/g
  const dom_re=/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/g
  const hash_re=/\b[a-fA-F0-9]{64}\b/g 
  
  const ims=text.match(ip_re)
  if(ims)iocs.ips.push(...ims)
  
  const dms=text.match(dom_re)
  if(dms)iocs.domains.push(...dms)
  
  const hms=text.match(hash_re)
  if(hms)iocs.hashes.push(...hms)
  
  return iocs
}

export const mitigate_vuln=(cve:any,asset:any)=>{
  return asset.patched_cves.includes(cve.id)
}

export const threat_hunting_score=(ioc:string,logs:string[])=>{
  return logs.filter(l=>l.includes(ioc)).length
}

export const botnet_cluster=(ips:string[])=>{
  
  const clusters:Record<string,string[]>={}
  for(const ip of ips){
    const subnet=ip.split(".").slice(0,3).join(".")
    if(!clusters[subnet])clusters[subnet]=[]
    clusters[subnet].push(ip)
  }
  return clusters
}

export const ransom_demand_calc=(gb_stolen:number,rev_m:number)=>{
  
  return (gb_stolen*1000)+(rev_m*10000)
}

export const dga_detect=(domain:string)=>{
  
  const p=domain.split(".")[0]
  if(p.length>15&&!p.match(/[aeiouy]/i))return true
  return false
}

export const phishing_similarity=(url1:string,url2:string)=>{
  
  if(url1===url2)return 100
  if(url1.length===0||url2.length===0)return 0
  const m=Math.min(url1.length,url2.length)
  let c=0
  for(let i=0;i<m;i++)if(url1[i]===url2[i])c++
  return (c/Math.max(url1.length,url2.length))*100
}

export const pwned_check=(email:string,db:string[])=>{
  return db.includes(email)
}

export const lateral_movement_detect=(logs:any[])=>{
  let score=0
  let last_ip=""
  for(const l of logs){
    if(l.type==="rdp"&&last_ip!==l.src)score+=10
    if(l.type==="smb"&&l.payload==="psexec")score+=50
    last_ip=l.src
  }
  return score>50
}

export const port_scan_detect=(logs:any[],ip:string)=>{
  const ports=new Set()
  for(const l of logs){
    if(l.src===ip)ports.add(l.dst_port)
  }
  return ports.size>100
}

export const exfiltration_detect=(flow:any)=>{
  return flow.outbound_bytes > (flow.inbound_bytes*100) && flow.outbound_bytes > 1000000000 
}

export const parse_yara=(rule:string)=>{
  const m=rule.match(/rule\s+([a-zA-Z0-9_]+)/)
  return m?m[1]:"unknown"
}

export const mitre_tactic_map=(tid:string)=>{
  const t:Record<string,string>={
    "T1566":"Phishing",
    "T1190":"Exploit Public-Facing App",
    "T1078":"Valid Accounts"
  }
  return t[tid]||"Unknown Tactic"
}
