"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { recon_map_point, recon_result } from "@/lib/recon/core"

type fetch_row = {
  index: number
  source: string
  category: string
  url: string
  icon?: string | null
  state: "checking" | "found" | "not found" | "error"
  status?: number | null
  elapsed_ms?: number
  error?: string
}

type stats = { checked: number; found: number; not_found: number; error: number; total: number }
type pfp_pick = { avatar: string; source: string; url: string; name?: string; username?: string }
type geo_res = { found?: boolean; query?: string; lat?: number; lon?: number; label?: string; class?: string; type?: string; importance?: number; error?: string }
type detail_props = { query: string; found: recon_result[]; fetches: fetch_row[]; locations: recon_map_point[]; counts: stats; hero: pfp_pick | null }

const init_stats: stats = { checked: 0, found: 0, not_found: 0, error: 0, total: 0 }
const pfp_sites = ["instagram", "github", "gitlab", "linkedin", "twitter", "x.com", "tiktok", "threads", "facebook", "gravatar", "telegram", "mastodon", "bluesky", "pinterest", "youtube", "reddit", "medium"]
const short = (v: unknown, n = 80) => {
  const s = typeof v === "string" ? v : JSON.stringify(v)
  return s.length > n ? `${s.slice(0, n - 1)}...` : s
}
const host = (u: string) => {
  try { return new URL(u).hostname.replace(/^www\./, "") } catch { return u }
}
const imgerr = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = "none" }
const txt = (v: unknown) => {
  if (v === undefined || v === null || v === "") return ""
  if (typeof v === "string") return v.trim()
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  try { return JSON.stringify(v) } catch { return String(v) }
}
const pfprank = (r: recon_result) => {
  const hay = `${r.source} ${r.website || ""} ${r.url}`.toLowerCase()
  const ix = pfp_sites.findIndex(x => hay.includes(x))
  return ix === -1 ? 999 : ix
}
const pickpfp = (rows: recon_result[]): pfp_pick | null => {
  const xs = rows.map((r, index) => {
    const avatar = typeof r.info?.avatar === "string" ? r.info.avatar.trim() : ""
    return avatar ? { avatar, source: r.source, url: r.info?.url || r.url, name: r.info?.name, username: r.info?.username, rank: pfprank(r), index } : null
  }).filter(Boolean) as Array<pfp_pick & { rank: number; index: number }>
  return xs.sort((a, b) => a.rank - b.rank || a.index - b.index)[0] || null
}

const noisy_detail_key = (key: string) => {
  const k = key.replace(/[\s-]+/g, "_").toLowerCase()
  return /^(og_|twitter_|fb_|al_|article_|music_|video_)/.test(k)
    || ["viewport", "robots", "theme_color", "msapplication_tilecolor", "apple_mobile_web_app_title", "canonical", "title", "description", "image", "url", "site_name", "locale", "type", "card", "app_id", "pages"].includes(k)
}

const clean_detail_entries = (info: recon_result["info"]) => Object.entries(info?.others || {})
  .filter(([key, val]) => !noisy_detail_key(key) && val !== undefined && val !== null && typeof val !== "object")
  .map(([key, val]) => [key.replace(/_/g, " "), txt(val)] as [string, string])
  .filter(([, val]) => val && val !== "[object Object]" && val.length < 180)
  .slice(0, 6)

const source_quality = (r: recon_result) => {
  const info = r.info || { others: {} }
  let score = 0
  if (txt(info.avatar)) score += 6
  if (txt(info.name)) score += 5
  if (txt(info.username)) score += 4
  if (txt(info.bio)) score += 4
  if (txt(info.location)) score += 3
  if (txt(info.website || info.url)) score += 2
  if (info.followers !== undefined || info.following !== undefined) score += 3
  score += Math.min(4, clean_detail_entries(info).length)
  const rank = pfprank(r)
  if (rank < 999) score += 5 - Math.min(4, rank)
  return score
}

const profile_fields = (r: recon_result) => {
  const info = r.info || { others: {} }
  return [
    ["name", info.name],
    ["username", info.username],
    ["bio", info.bio],
    ["location", info.location],
    ["website", info.website || info.url],
    ["followers", info.followers],
    ["following", info.following],
    ["email", info.email],
    ["recovery email", info.recovery_email],
    ["recovery phone", info.recovery_phone],
  ].map(([key, val]) => [String(key), txt(val)] as [string, string]).filter(([, val]) => val)
}

function ReconResultsDetail({ query, found, fetches, locations, counts, hero }: detail_props) {
  const cats = Array.from(found.reduce((m, r) => m.set(r.category, (m.get(r.category) || 0) + 1), new Map<string, number>()))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
  const srcs = Array.from(new Set(fetches.map(x => x.source))).length || found.length
  const names = Array.from(new Set(found.flatMap(r => [r.info?.name, r.info?.username].map(txt).filter(Boolean)))).slice(0, 8)
  const avatars = found.map(r => ({ img: txt(r.info?.avatar), source: r.source, url: r.info?.url || r.url })).filter(x => x.img).slice(0, 7)
  const locs = locations.slice(0, 5)
  const source_cards = [...found]
    .sort((a, b) => source_quality(b) - source_quality(a) || pfprank(a) - pfprank(b) || a.source.localeCompare(b.source))
    .slice(0, 24)

  return (
    <article className="mb-3 overflow-hidden rounded-2xl border border-cyan-300/15 bg-gradient-to-b from-cyan-950/20 via-black/35 to-black/25 shadow-[0_0_35px_rgba(34,211,238,0.08)]">
      <div className="border-b border-white/10 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[0.58rem] font-bold uppercase tracking-[0.24em] text-cyan-300">profile dossier</p>
            <h3 className="mt-1 truncate text-base font-semibold text-white">{query}</h3>
            <p className="mt-0.5 text-xs text-stone-500">completed public-source sweep, structured from returned metadata only</p>
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-right">
            <p className="font-mono text-sm font-bold text-emerald-300">{found.length.toLocaleString()}</p>
            <p className="text-[0.55rem] uppercase tracking-widest text-emerald-200/70">hits</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-6 gap-1.5">
          {[
            ["checked", counts.checked],
            ["found", found.length],
            ["mapped", locations.length],
            ["sources", srcs],
            ["miss", counts.not_found],
            ["error", counts.error],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-white/5 bg-black/35 px-2 py-2 text-center">
              <p className="font-mono text-xs font-bold text-white">{Number(v).toLocaleString()}</p>
              <p className="mt-1 text-[0.48rem] uppercase tracking-widest text-stone-500">{k}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-2 p-3">
        <div className="grid grid-cols-[5.5rem_1fr] gap-3">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-stone-950">
            {hero?.avatar ? (
              <img src={hero.avatar} alt="" className="h-24 w-full object-cover" referrerPolicy="no-referrer" onError={imgerr} />
            ) : (
              <div className="flex h-24 items-center justify-center font-mono text-[0.58rem] uppercase tracking-widest text-stone-600">no pfp</div>
            )}
          </div>
          <div className="min-w-0 rounded-xl border border-white/5 bg-black/25 p-2.5">
            <p className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.2em] text-stone-500">identity cluster</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(names.length ? names : [query]).map(x => (
                <span key={x} className="max-w-full truncate rounded-full border border-cyan-300/15 bg-cyan-300/10 px-2 py-1 font-mono text-[0.58rem] text-cyan-100">{x}</span>
              ))}
            </div>
            {!!avatars.length && (
              <div className="mt-2 flex -space-x-2">
                {avatars.map(x => (
                  <img key={`${x.source}-${x.img}`} src={x.img} alt="" title={`${x.source} / ${host(x.url)}`} className="h-7 w-7 rounded-full border border-stone-950 bg-stone-900 object-cover" referrerPolicy="no-referrer" onError={imgerr} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <section className="rounded-xl border border-white/5 bg-black/25 p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.2em] text-stone-500">source coverage</p>
              <span className="font-mono text-[0.55rem] text-stone-600">{cats.length} groups</span>
            </div>
            <div className="space-y-1.5">
              {(cats.length ? cats : [["no hits", 0] as [string, number]]).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[1fr_2rem] items-center gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[0.62rem] text-stone-300">{k}</p>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-cyan-300/70" style={{ width: `${Math.max(8, Math.min(100, (v / Math.max(1, found.length)) * 100))}%` }} />
                    </div>
                  </div>
                  <span className="text-right font-mono text-[0.6rem] text-cyan-200">{v}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-white/5 bg-black/25 p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.2em] text-stone-500">mapped locations</p>
              <span className="font-mono text-[0.55rem] text-stone-600">{locations.length}</span>
            </div>
            <div className="space-y-1.5">
              {locs.length ? locs.map(x => (
                <div key={x.id} className="rounded-lg border border-emerald-400/10 bg-emerald-400/5 px-2 py-1.5">
                  <p className="truncate text-[0.62rem] font-semibold text-emerald-200">{x.location}</p>
                  <p className="truncate font-mono text-[0.52rem] text-stone-500">{x.source} / {x.lat.toFixed(3)}, {x.lon.toFixed(3)}</p>
                </div>
              )) : <p className="rounded-lg border border-white/5 bg-stone-950/50 px-2 py-4 text-center text-xs text-stone-600">no geocoded public location returned</p>}
            </div>
          </section>
        </div>

        {!!source_cards.length && (
          <section className="rounded-xl border border-white/5 bg-black/25 p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.2em] text-stone-500">website cards</p>
              <span className="font-mono text-[0.55rem] text-stone-600">rich extractors first</span>
            </div>
            <div className="space-y-2">
              {source_cards.map(r => {
                const info = r.info || { others: {} }
                const avatar = txt(info.avatar)
                const fields = profile_fields(r).slice(0, 8)
                const extras = clean_detail_entries(info)
                const quality = source_quality(r)
                return (
                  <article key={`card-${r.source}-${r.url}`} className="rounded-xl border border-white/10 bg-stone-950/55 p-2.5">
                    <div className="grid grid-cols-[3rem_1fr_auto] gap-2.5">
                      {avatar ? (
                        <img src={avatar} alt="" className="h-12 w-12 rounded-xl border border-cyan-300/20 bg-stone-900 object-cover" referrerPolicy="no-referrer" onError={imgerr} />
                      ) : r.icon ? (
                        <img src={r.icon} alt="" className="h-12 w-12 rounded-xl border border-white/10 bg-black p-2.5 object-contain" referrerPolicy="no-referrer" onError={imgerr} />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black font-mono text-xs text-cyan-200">{r.source.slice(0, 2).toLowerCase()}</div>
                      )}
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <h4 className="truncate text-sm font-semibold text-white">{r.source}</h4>
                          <span className="shrink-0 rounded-full border border-white/10 px-1.5 py-0.5 font-mono text-[0.48rem] uppercase tracking-wider text-stone-500">{r.category}</span>
                        </div>
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate font-mono text-[0.56rem] text-cyan-300 hover:underline">{host(r.url)}</a>
                        {info.bio && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-stone-300">{info.bio}</p>}
                      </div>
                      <span className="self-start rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 font-mono text-[0.52rem] text-emerald-300">q{quality}</span>
                    </div>
                    {!!fields.length && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        {fields.map(([key, val]) => (
                          <div key={`${r.source}-${key}-${val}`} className="rounded-lg border border-white/5 bg-black/35 px-2 py-1.5">
                            <p className="text-[0.52rem] uppercase tracking-wider text-stone-500">{key}</p>
                            <p className="mt-0.5 truncate font-mono text-[0.58rem] text-stone-200" title={val}>{short(val, 56)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {!!extras.length && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {extras.map(([key, val]) => (
                          <span key={`${r.source}-${key}-${val}`} className="max-w-full truncate rounded-full border border-white/5 bg-black/35 px-2 py-1 font-mono text-[0.54rem] text-stone-300" title={`${key}: ${val}`}>
                            <span className="text-stone-500">{key}</span> {short(val, 42)}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-white/5 bg-black/25 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.2em] text-stone-500">evidence trail</p>
            <span className="font-mono text-[0.55rem] text-stone-600">{source_cards.slice(0, 10).length} shown</span>
          </div>
          <div className="space-y-1.5">
            {source_cards.slice(0, 10).length ? source_cards.slice(0, 10).map(r => (
              <a key={`${r.source}-${r.url}`} href={r.url} target="_blank" rel="noopener noreferrer" className="grid grid-cols-[1rem_1fr_auto] items-center gap-2 rounded-lg border border-white/5 bg-stone-950/50 px-2 py-1.5 hover:border-cyan-300/25 hover:bg-cyan-300/5">
                {r.icon ? <img src={r.icon} alt="" className="h-4 w-4 rounded bg-stone-900 object-contain" referrerPolicy="no-referrer" onError={imgerr} /> : <span className="h-4 w-4 rounded border border-white/10" />}
                <span className="min-w-0 truncate text-[0.62rem] text-stone-200">{r.source}</span>
                <span className="max-w-[11rem] truncate font-mono text-[0.52rem] text-cyan-300">{host(r.url)}</span>
              </a>
            )) : <p className="rounded-lg border border-white/5 bg-stone-950/50 px-2 py-4 text-center text-xs text-stone-600">no matching public entities found in this run</p>}
          </div>
        </section>
      </div>
    </article>
  )
}

export function ReconModePanel({ onClose, onFoundCount, onLocations, stacked = false }: { onClose: () => void; onFoundCount?: (n: number) => void; onLocations?: (rows: recon_map_point[]) => void; stacked?: boolean }) {
  const [query, setQuery] = useState("")
  const [runq, setRunq] = useState("")
  const [running, setRunning] = useState(false)
  const [fetches, setFetches] = useState<fetch_row[]>([])
  const [found, setFound] = useState<recon_result[]>([])
  const [locations, setLocations] = useState<recon_map_point[]>([])
  const [counts, setCounts] = useState<stats>(init_stats)
  const [show_found_entities, set_show_found_entities] = useState(true)
  const [err, setErr] = useState("")
  const evref = useRef<EventSource | null>(null)
  const georef = useRef<Set<string>>(new Set())

  const stop = () => {
    evref.current?.close()
    evref.current = null
    setRunning(false)
  }

  useEffect(() => () => stop(), [])
  useEffect(() => { onFoundCount?.(found.length) }, [found.length, onFoundCount])
  useEffect(() => { onLocations?.(locations) }, [locations, onLocations])

  const geocode = async (r: recon_result) => {
    const loc = typeof r.info?.location === "string" ? r.info.location.trim() : ""
    if (!loc) return
    const key = `${r.source.toLowerCase()}|${loc.toLowerCase()}`
    if (georef.current.has(key)) return
    georef.current.add(key)
    try {
      const res = await fetch(`/api/recon/geocode?location=${encodeURIComponent(loc)}`, { cache: "no-store" })
      const geo = await res.json() as geo_res
      if (!res.ok || !geo.found || !Number.isFinite(geo.lat) || !Number.isFinite(geo.lon)) return
      const p: recon_map_point = {
        id: `${r.source}-${loc}-${r.url}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 140),
        source: r.source,
        category: r.category,
        url: r.url,
        icon: r.icon || null,
        location: loc,
        lat: Number(geo.lat),
        lon: Number(geo.lon),
        label: geo.label || loc,
        geocode_class: geo.class,
        geocode_type: geo.type,
        importance: geo.importance,
        name: r.info?.name,
        username: r.info?.username,
        avatar: r.info?.avatar,
        bio: r.info?.bio,
        info: r.info,
        found_at: new Date().toISOString(),
      }
      setLocations(xs => [p, ...xs.filter(x => x.id !== p.id)].slice(0, 240))
    } catch { }
  }

  const begin = (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = query.trim()
    if (!q || running) return
    stop()
    setRunq(q)
    setErr("")
    setFetches([])
    setFound([])
    setLocations([])
    georef.current.clear()
    setCounts(init_stats)
    setRunning(true)

    const es = new EventSource(`/api/recon/stream?q=${encodeURIComponent(q)}`)
    evref.current = es
    es.addEventListener("start", (ev) => {
      const d = JSON.parse((ev as MessageEvent).data)
      setCounts({ checked: 0, found: 0, not_found: 0, error: 0, total: d.total || 0 })
    })
    es.addEventListener("check", (ev) => {
      const d = JSON.parse((ev as MessageEvent).data)
      setFetches((xs) => [{ ...d, state: "checking" }, ...xs].slice(0, 1200))
    })
    es.addEventListener("result", (ev) => {
      const d = JSON.parse((ev as MessageEvent).data) as recon_result & { index: number }
      const row: fetch_row = {
        index: d.index,
        source: d.source,
        category: d.category,
        url: d.url,
        icon: d.icon || null,
        state: d.error ? "error" : d.found ? "found" : "not found",
        status: d.status,
        elapsed_ms: d.elapsed_ms,
        error: d.error,
      }
      setFetches((xs) => [row, ...xs.filter(x => x.index !== d.index)].slice(0, 1200))
      if (d.found) {
        setFound((xs) => [d, ...xs.filter(x => x.source !== d.source)])
        void geocode(d)
      }
    })
    es.addEventListener("progress", (ev) => setCounts(JSON.parse((ev as MessageEvent).data)))
    es.addEventListener("done", (ev) => {
      setCounts(JSON.parse((ev as MessageEvent).data))
      stop()
    })
    es.addEventListener("error", (ev) => {
      try { setErr(JSON.parse((ev as MessageEvent).data).error || "stream failed") }
      catch { setErr("stream failed") }
      stop()
    })
    es.onerror = () => {
      if (running) setErr("stream interrupted")
      stop()
    }
  }

  const rate = useMemo(() => counts.total ? Math.round((counts.checked / counts.total) * 100) : 0, [counts])
  const hero = useMemo(() => pickpfp(found), [found])
  const scan_complete = !running && Boolean(runq) && counts.checked > 0
  const active = running ? "live" : scan_complete ? "complete" : "idle"
  const pulse = Math.max(3, Math.min(100, rate || (running ? 7 : 0)))
  const latest_found = found[0]
  const livebits = [
    `${counts.checked.toLocaleString()} probes`,
    `${counts.found.toLocaleString()} hits`,
    `${fetches.filter(x => x.state === "checking").length.toLocaleString()} active`,
    `${locations.length.toLocaleString()} geo locks`,
  ]

  return (
    <section className={`pointer-events-auto fixed ${stacked ? "left-[53rem]" : "left-[28rem]"} top-[5.5rem] z-30 flex max-h-[calc(100svh-7rem)] w-[34rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-stone-950/90 text-stone-200 shadow-[0_20px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl ${running ? "recon-search-active" : ""}`}>
      <div className="relative overflow-hidden border-b border-white/10 bg-stone-950/80 px-4 py-3">
        {running && (
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
            <div className="recon-live-grid absolute inset-0" />
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.24em] text-cyan-300">
              recon mode {running && <span className="recon-lock ml-2 text-emerald-300">/ live trace</span>}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">{active} public profile sweep</h2>
            <p className="mt-0.5 text-xs text-stone-500">username + email source registry, streamed as each fetch returns</p>
          </div>
          <div className="flex items-center gap-2">
            {running && <button onClick={stop} className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-400/20">stop</button>}
            <button onClick={onClose} className="rounded-full border border-white/10 px-2 py-1 text-xs text-stone-400 hover:border-cyan-300/40 hover:text-cyan-200">close</button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 p-2.5">
          {hero ? (
            <img src={hero.avatar} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-cyan-300/25 bg-stone-900 object-cover shadow-[0_0_22px_rgba(34,211,238,0.16)]" referrerPolicy="no-referrer" onError={imgerr} />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-stone-950 font-mono text-[0.58rem] uppercase tracking-widest text-stone-600">pfp</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.18em] text-cyan-300/80">latest fetched pfp</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-white">{hero?.name || hero?.username || runq || query || "waiting for a real profile image"}</p>
            <p className="mt-0.5 truncate font-mono text-[0.58rem] text-stone-500">{hero ? `${hero.source} / ${host(hero.url)}` : "instagram, github, gravatar and similar profile sources preferred"}</p>
          </div>
        </div>

        <form onSubmit={begin} className="mt-2 flex items-center gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="username or email"
            className="h-10 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 font-mono text-sm text-white outline-none placeholder:text-stone-600 focus:border-cyan-300/50"
          />
          <button disabled={running || !query.trim()} className="h-10 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 font-mono text-xs font-bold uppercase tracking-widest text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">
            scan
          </button>
        </form>

        {running && (
          <div className="recon-signal-stack mt-3 rounded-xl border border-cyan-300/15 bg-black/35 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[0.56rem] uppercase tracking-[0.22em]">
              <span className="text-cyan-200">stream intercept</span>
              <span className="text-emerald-300">{pulse}%</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full border border-white/10 bg-stone-950">
              <div className="recon-progress-beam absolute inset-y-0 left-0 rounded-full" style={{ width: `${pulse}%` }} />
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {livebits.map((x, i) => (
                <div key={x} className="recon-packet-lane rounded-lg border border-white/5 bg-stone-950/70 px-2 py-1.5 font-mono text-[0.54rem] text-stone-300" style={{ animationDelay: `${i * 110}ms` }}>
                  {x}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-5 gap-2 text-center">
          {[
            ["checked", counts.checked],
            ["found", counts.found],
            ["mapped", locations.length],
            ["error", counts.error],
            ["done", `${rate}%`],
          ].map(([k, v]) => (
            <div key={k} className={`rounded-xl border border-white/5 bg-black/30 px-2 py-2 ${running ? "recon-live-stat" : ""}`}>
              <p className="font-mono text-sm font-bold text-white">{typeof v === "number" ? v.toLocaleString() : v}</p>
              <p className="mt-1 text-[0.55rem] uppercase tracking-widest text-stone-500">{k}</p>
            </div>
          ))}
        </div>
        {err && <p className="mt-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{err}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {scan_complete && <ReconResultsDetail query={runq} found={found} fetches={fetches} locations={locations} counts={counts} hero={hero} />}

        <section className="mb-3 overflow-hidden rounded-xl border border-white/5 bg-black/20">
          <div className="flex items-center justify-between gap-3 border-b border-white/5 px-3 py-2">
            <div className="min-w-0">
              <span className="block font-mono text-[0.58rem] font-bold uppercase tracking-[0.2em] text-stone-500">found entities</span>
              <span className="mt-0.5 block truncate font-mono text-[0.56rem] text-stone-600">{runq || "no active query"}</span>
            </div>
            <button
              type="button"
              aria-expanded={show_found_entities}
              aria-controls="recon-found-entities"
              onClick={() => set_show_found_entities(x => !x)}
              className="found-entities-toggle group flex shrink-0 items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 font-mono text-[0.55rem] font-bold uppercase tracking-[0.14em] text-cyan-100 hover:border-cyan-200/50 hover:bg-cyan-300/15"
            >
              <span>{show_found_entities ? "hide entities" : "show entities"}</span>
              <span className="flex h-4 w-6 items-center justify-center rounded-full border border-white/10 bg-black/30 text-[0.7rem] leading-none text-cyan-200 group-hover:border-cyan-200/40">
                {show_found_entities ? "v" : "^"}
              </span>
            </button>
          </div>

          <button
            type="button"
            aria-label={show_found_entities ? "collapse found entities" : "expand found entities"}
            onClick={() => set_show_found_entities(x => !x)}
            className="block w-full border-b border-white/5 bg-black/25 px-3 py-1.5 hover:bg-cyan-300/5"
          >
            <span className="mx-auto block h-1 w-16 rounded-full bg-stone-700/80" />
          </button>

          {show_found_entities ? (
            <div id="recon-found-entities" className="space-y-2 p-3">
              {!found.length && (
                <div className="rounded-xl border border-white/5 bg-black/25 px-4 py-7 text-center text-sm text-stone-500">
                  {running ? "waiting for matching public profiles..." : "enter a username or email to start a live recon sweep."}
                </div>
              )}
              {[...found].sort((a, b) => source_quality(b) - source_quality(a) || pfprank(a) - pfprank(b) || a.source.localeCompare(b.source)).map((r) => {
                const info = r.info || { others: {} }
                const avatar = typeof info.avatar === "string" ? info.avatar : ""
                const fields = [["status", r.status ?? "-"], ["elapsed", `${r.elapsed_ms} ms`] as [string, string], ...profile_fields(r)].filter(([, v]) => v !== undefined && v !== null && v !== "")
                const others = clean_detail_entries(info)
                return (
                  <article key={`${r.source}-${r.url}`} className="rounded-xl border border-white/10 bg-black/35 p-3">
                    <div className="flex gap-3">
                      {avatar ? (
                        <img src={avatar} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-white/10 bg-stone-900 object-cover" referrerPolicy="no-referrer" onError={imgerr} />
                      ) : r.icon ? (
                        <img src={r.icon} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-white/10 bg-stone-950 p-3 object-contain" referrerPolicy="no-referrer" onError={imgerr} />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-stone-900 font-mono text-sm text-cyan-200">{r.source.slice(0, 2).toLowerCase()}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              {r.icon && <img src={r.icon} alt="" className="h-4 w-4 shrink-0 rounded bg-stone-900 object-contain" referrerPolicy="no-referrer" onError={imgerr} />}
                              <h3 className="truncate text-sm font-semibold text-white">{info.name || info.username || r.source}</h3>
                            </div>
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate font-mono text-[0.58rem] text-cyan-300 hover:underline">{host(r.url)}</a>
                          </div>
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 font-mono text-[0.55rem] text-emerald-300">found</span>
                        </div>
                        {info.bio && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-stone-300">{info.bio}</p>}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                      {fields.map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-stone-950/60 px-2 py-1.5">
                          <span className="text-[0.55rem] uppercase tracking-wider text-stone-500">{k}</span>
                          <span className="max-w-[11rem] truncate text-right font-mono text-[0.58rem] text-stone-200" title={String(v)}>{short(v, 42)}</span>
                        </div>
                      ))}
                    </div>
                    {!!others.length && (
                      <div className="mt-2 rounded-lg border border-white/5 bg-stone-950/40 p-2">
                        {others.map(([k, v]) => (
                          <div key={k} className="flex items-start justify-between gap-3 border-b border-white/5 py-1 last:border-0">
                            <span className="shrink-0 text-[0.55rem] uppercase tracking-wider text-stone-500">{k}</span>
                            <span className="min-w-0 text-right font-mono text-[0.56rem] leading-relaxed text-stone-300">{short(v, 110)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="found-entities-hidden grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-3">
              <div className="min-w-0">
                <p className="font-mono text-[0.56rem] font-bold uppercase tracking-[0.18em] text-stone-500">found entities hidden</p>
                <p className="mt-1 truncate text-xs text-stone-400">
                  {found.length ? `${found.length.toLocaleString()} hits hidden, latest ${latest_found?.source || "source"} / ${latest_found ? host(latest_found.url) : "none"}` : "no found entities yet; fetch log has more room"}
                </p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 font-mono text-[0.58rem] text-emerald-300">
                {found.length.toLocaleString()} found
              </span>
            </div>
          )}
        </section>
      </div>

      <div className="h-44 border-t border-white/10 bg-black/35 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[0.58rem] font-bold uppercase tracking-[0.2em] text-stone-500">fetch log</span>
          <span className="font-mono text-[0.58rem] text-stone-600">{fetches.length.toLocaleString()} rows</span>
        </div>
        <div className="h-[7.8rem] overflow-auto rounded-xl border border-white/5 bg-black/30">
          {fetches.map((f) => (
            <div key={f.index} className={`grid grid-cols-[1.25rem_1fr_auto] gap-2 border-b border-white/5 px-2.5 py-1.5 last:border-0 ${running && f.state === "checking" ? "recon-fetch-active" : ""}`}>
              {f.icon ? (
                <img src={f.icon} alt="" className="mt-0.5 h-4 w-4 rounded bg-stone-950 object-contain" referrerPolicy="no-referrer" onError={imgerr} />
              ) : (
                <span className="mt-0.5 h-4 w-4 rounded border border-white/5 bg-stone-900" />
              )}
              <div className="min-w-0">
                <p className="truncate font-mono text-[0.58rem] text-stone-300">{f.url}</p>
                <p className="truncate text-[0.55rem] text-stone-600">{f.source} / {f.category}{f.status ? ` / ${f.status}` : ""}{f.elapsed_ms ? ` / ${f.elapsed_ms}ms` : ""}</p>
              </div>
              <span className={`self-center rounded-full px-2 py-0.5 font-mono text-[0.52rem] ${f.state === "found" ? "bg-emerald-400/15 text-emerald-300" : f.state === "error" ? "bg-red-400/15 text-red-300" : f.state === "checking" ? "bg-cyan-400/15 text-cyan-300" : "bg-stone-800 text-stone-500"}`}>
                {f.state}
              </span>
            </div>
          ))}
          {!fetches.length && <p className="px-3 py-4 text-xs text-stone-600">no fetches yet.</p>}
        </div>
      </div>
    </section>
  )
}
