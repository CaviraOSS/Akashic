import { createHash } from "node:crypto"
import email_sources from "@/data/recon-sources/email.json"
import username_sources from "@/data/recon-sources/username.json"

export type recon_kind = "username" | "email"
export type recon_detect =
  | { strategy: "statusNegativeMatch"; target: number }
  | { strategy: "textNegativeMatch"; target: string }
  | { strategy: "textPositiveMatch"; target: string }
  | { strategy: "jsonPositiveMatch"; target: string }
  | { strategy: "jsonFieldExists"; target: string }

export type recon_source = {
  enabled?: boolean
  name: string
  url: string
  type: recon_kind
  website?: string
  category?: string
  headers?: Record<string, string>
  input_operation?: "hash.sha256" | string
  detection?: recon_detect
  api?: {
    url?: string
    method?: string
    headers?: Record<string, string>
    body?: unknown
    data?: unknown
    parser?: Record<string, any>
  }
  extractor?: {
    pattern?: string
    ids?: Record<string, any>
  }
}

export type recon_query = { raw: string; val: string; kind: recon_kind }
export type recon_info = {
  name?: string
  username?: string
  bio?: string
  avatar?: string
  url?: string
  location?: string
  website?: string
  followers?: string | number
  following?: string | number
  email?: string
  recovery_email?: string
  recovery_phone?: string
  others: Record<string, any>
}
export type recon_geocode_hit = {
  lat: number
  lon: number
  label: string
  class?: string
  type?: string
  importance?: number
}
export type recon_map_point = {
  id: string
  source: string
  category: string
  url: string
  icon?: string | null
  location: string
  lat: number
  lon: number
  label: string
  geocode_class?: string
  geocode_type?: string
  importance?: number
  name?: string
  username?: string
  avatar?: string
  bio?: string
  info: recon_info
  found_at: string
}
export type recon_result = {
  source: string
  category: string
  website: string | null
  url: string
  icon?: string | null
  found: boolean
  status: number | null
  elapsed_ms: number
  error?: string
  info: recon_info
}
export type recon_request = { url: string; method: string; headers: Record<string, string>; body?: BodyInit }
export type recon_avatar_pick = { avatar: string; source: string; url?: string; name?: string; username?: string; rank: number; index: number }
export type recon_browser_fetch = { status: number; headers?: Record<string, string>; data: string; url?: string }
export type recon_run_options = { browser_fetcher?: (req: recon_request, src: recon_source, q: recon_query) => Promise<recon_browser_fetch> }

const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
const pfp_sites = ["instagram", "github", "gitlab", "linkedin", "twitter", "x.com", "tiktok", "threads", "facebook", "gravatar", "telegram", "mastodon", "bluesky", "pinterest", "youtube", "reddit", "medium"]
const loc_keys = new Set(["location", "country", "city", "state", "region", "address", "geo.placename", "geo_placename", "addresslocality", "addressregion", "addresscountry"])
const bad_locs = new Set(["active", "inactive", "enabled", "disabled", "true", "false", "null", "undefined", "none", "n/a", "na", "unknown", "private", "not specified", "not set"])
const coarse_locs = new Set(["united states", "usa", "u.s.", "u.s.a.", "united kingdom", "uk", "england", "scotland", "wales", "ireland", "canada", "australia", "germany", "france", "italy", "spain", "portugal", "brazil", "india", "china", "japan", "russia", "mexico", "netherlands", "sweden", "norway", "denmark", "finland", "poland", "turkey", "indonesia"])
const empty_info = (): recon_info => ({ others: {} })
const dec = (s: unknown) => String(s ?? "")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, "\"")
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&#x([0-9a-f]+);/gi, (_, x) => String.fromCharCode(parseInt(x, 16)))
  .replace(/&#(\d+);/g, (_, x) => String.fromCharCode(parseInt(x, 10)))
  .trim()
const origin = (site?: string | null, fallback?: string | null) => {
  const raw = String(site || fallback || "").trim()
  if (!raw) return null
  try {
    const u = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`)
    return `${u.protocol}//${u.hostname}`
  } catch { return null }
}
const abs_url = (val: unknown, base?: string | null) => {
  const s = dec(val)
  if (!s) return ""
  try { return new URL(s, base || undefined).toString() } catch { return s }
}

export const recon_favicon_url = (site?: string | null, fallback?: string | null) => {
  const o = origin(site, fallback)
  return o ? `${o}/favicon.ico` : null
}

const pfp_rank = (source: string, website?: string | null, url?: string | null) => {
  const hay = `${source} ${website || ""} ${url || ""}`.toLowerCase()
  const ix = pfp_sites.findIndex(x => hay.includes(x))
  return ix === -1 ? 999 : ix
}

export const pick_recon_avatar = (rows: Array<Pick<recon_result, "source" | "url" | "website" | "info">>): recon_avatar_pick | null => {
  const xs = rows.map((r, index) => {
    const avatar = abs_url(r.info?.avatar, r.info?.url || r.url || r.website || undefined)
    return avatar ? {
      avatar,
      source: r.source,
      url: r.info?.url || r.url,
      name: r.info?.name,
      username: r.info?.username,
      rank: pfp_rank(r.source, r.website, r.url),
      index,
    } : null
  }).filter(Boolean) as recon_avatar_pick[]
  return xs.sort((a, b) => a.rank - b.rank || a.index - b.index)[0] || null
}

export const clean_recon_location = (val: any): string | null => {
  if (val === undefined || val === null) return null
  if (typeof val === "object") {
    const name = clean_recon_location(val.name)
    if (name) return name
    const bits = [val.addressLocality || val.city, val.addressRegion || val.state || val.region, val.addressCountry || val.country]
      .map(x => clean_recon_location(x))
      .filter(Boolean) as string[]
    return bits.length ? bits.join(", ") : null
  }
  const s = dec(val).replace(/\s+/g, " ").trim()
  const l = s.toLowerCase()
  if (!s || s.length <= 2 || s.length > 120) return null
  if (bad_locs.has(l) || /^https?:\/\//i.test(s) || /^\/?[<{]/.test(s) || /^\/[a-z0-9_-]/i.test(s)) return null
  if (coarse_locs.has(l) || /^[a-z]{2}$/i.test(s) || /\s+[\/|]\s+/.test(s)) return null
  if (/^\d+$/.test(s) || /^[@#]/.test(s)) return null
  if (!/[a-z]/i.test(s)) return null
  return s
}

const find_recon_location = (obj: any, seen = new Set<any>()): string | null => {
  if (!obj || typeof obj !== "object" || seen.has(obj)) return null
  seen.add(obj)
  if (Array.isArray(obj)) {
    for (const x of obj) {
      const hit = find_recon_location(x, seen)
      if (hit) return hit
    }
    return null
  }
  for (const [k, v] of Object.entries(obj)) {
    const lk = k.replace(/[:\-\s]+/g, "_").toLowerCase()
    if (loc_keys.has(lk) || loc_keys.has(k.toLowerCase())) {
      const hit = clean_recon_location(v)
      if (hit) return hit
    }
  }
  for (const v of Object.values(obj)) {
    const hit = find_recon_location(v, seen)
    if (hit) return hit
  }
  return null
}

export const promote_recon_location = (info: recon_info, raw?: any) => {
  const cur = clean_recon_location(info.location)
  if (cur) info.location = cur
  else delete info.location
  if (!info.location) {
    const hit = find_recon_location(info.others)
    if (hit) info.location = hit
  }
  if (!info.location) {
    const hit = find_recon_location(raw)
    if (hit) info.location = hit
  }
  return info
}

export const normalize_recon_geocode_row = (row: any, query: string): recon_geocode_hit | null => {
  const lat = Number(row?.lat)
  const lon = Number(row?.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  const label = dec(row?.display_name || query)
  const out: recon_geocode_hit = { lat, lon, label }
  if (row?.class) out.class = dec(row.class)
  if (row?.type) out.type = dec(row.type)
  const imp = Number(row?.importance)
  if (Number.isFinite(imp)) out.importance = imp
  return out
}

export const clean_recon_query = (raw: string): recon_query => {
  const v = raw.trim()
  const kind: recon_kind = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "email" : "username"
  return { raw: v, val: kind === "email" ? v.toLowerCase() : v.replace(/^@+/, ""), kind }
}

export const read_path = (obj: any, path?: string) => {
  if (!path) return undefined
  return path.split(".").reduce((acc, bit) => {
    if (acc === undefined || acc === null) return undefined
    const key = /^\d+$/.test(bit) ? Number(bit) : bit
    return acc[key]
  }, obj)
}

const put = (info: recon_info, key: string, val: any) => {
  if (val === undefined || val === null || val === "") return
  const k = key.replace(/[:\-\s]+/g, "_")
  const lk = k.toLowerCase()
  if (["name", "display_name", "title", "og_title", "twitter_title"].includes(lk) && !info.name) info.name = dec(val)
  else if (["username", "handle", "preferredusername"].includes(lk) && !info.username) info.username = dec(val)
  else if (["bio", "about", "about_me", "description", "og_description", "twitter_description"].includes(lk) && !info.bio) info.bio = dec(val)
  else if (["avatar", "image", "thumbnail", "thumbnailurl", "og_image", "twitter_image", "twitter_image_src", "pfp"].includes(lk) && !info.avatar) info.avatar = dec(val)
  else if (["url", "profile_url", "og_url"].includes(lk) && !info.url) info.url = dec(val)
  else if (["website", "homepage"].includes(lk) && !info.website) info.website = dec(val)
  else if (lk === "location" && !info.location) info.location = dec(val)
  else if (lk === "email" && !info.email) info.email = dec(val)
  else if (lk === "followers" && info.followers === undefined) info.followers = val
  else if (lk === "following" && info.following === undefined) info.following = val
  info.others[k] = val
}

const merge_info = (a: recon_info, b: recon_info) => {
  for (const k of ["name", "username", "bio", "avatar", "url", "location", "website", "followers", "following", "email", "recovery_email", "recovery_phone"] as const) {
    if (a[k] === undefined && b[k] !== undefined) (a as any)[k] = b[k]
  }
  a.others = { ...b.others, ...a.others }
  return a
}

const sub = (v: unknown, q: recon_query, src: recon_source): any => {
  const email = src.input_operation === "hash.sha256" && q.kind === "email" ? createHash("sha256").update(q.val).digest("hex") : q.val
  const username = q.val
  const rep = (s: string) => s.replaceAll("{username}", username).replaceAll("{email}", email)
  if (typeof v === "string") return rep(v)
  if (Array.isArray(v)) return v.map(x => sub(x, q, src))
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sub(x, q, src)]))
  return v
}

export const make_recon_request = async (src: recon_source, q: recon_query): Promise<recon_request> => {
  const api = src.api || {}
  const url = String(sub(api.url || src.url, q, src))
  const headers = { ...(src.headers || {}), ...(api.headers || {}) } as Record<string, string>
  for (const k of Object.keys(headers)) headers[k] = String(sub(headers[k], q, src))
  if (!Object.keys(headers).some(k => k.toLowerCase() === "user-agent")) headers["User-Agent"] = ua
  const req: recon_request = { url, method: api.method || "GET", headers }
  const payload = api.body !== undefined ? api.body : api.data
  if (payload !== undefined && !["GET", "HEAD"].includes(req.method.toUpperCase())) {
    const body = sub(payload, q, src)
    const ctype = Object.entries(headers).find(([k]) => k.toLowerCase() === "content-type")?.[1] || ""
    if (typeof body === "string") req.body = body
    else if (ctype.includes("application/x-www-form-urlencoded")) req.body = new URLSearchParams(Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)]))).toString()
    else req.body = JSON.stringify(body)
    if (!Object.keys(headers).some(k => k.toLowerCase() === "content-type")) headers["Content-Type"] = typeof req.body === "string" && !req.body.trim().startsWith("{") ? "application/x-www-form-urlencoded" : "application/json"
  }
  return req
}

export const parse_html_info = (html: string): recon_info => {
  const info = empty_info()
  const meta1 = /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi
  const meta2 = /<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']([^"']+)["'][^>]*>/gi
  for (const m of html.matchAll(meta1)) put(info, m[1], dec(m[2]))
  for (const m of html.matchAll(meta2)) put(info, m[2], dec(m[1]))
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  if (title) put(info, "title", dec(title.replace(/\s+/g, " ")))
  const lds: any[] = []
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { lds.push(JSON.parse(dec(m[1]))) } catch { }
  }
  if (lds.length) info.others.json_ld = lds.length === 1 ? [lds[0]] : lds
  return info
}

export const parse_json_info = (data: any, parser?: Record<string, any>): recon_info => {
  const info = empty_info()
  if (!parser) return info
  const root = parser.rootPath ? read_path(data, parser.rootPath) ?? data : data
  for (const [key, spec] of Object.entries(parser)) {
    if (key === "rootPath") continue
    if (typeof spec === "string") put(info, key, read_path(root, spec))
    else if (spec && typeof spec === "object") {
      if (key !== "others") info.others[key] ||= {}
      for (const [subkey, path] of Object.entries(spec)) {
        const val = read_path(root, String(path))
        if (val !== undefined && val !== null) {
          if (key !== "others") (info.others[key] as Record<string, any>)[subkey] = val
          put(info, subkey, val)
        }
      }
    }
  }
  return info
}

const apply_extract = (info: recon_info, data: string, src: recon_source) => {
  if (!src.extractor?.pattern) return info
  const m = data.match(new RegExp(src.extractor.pattern, "i"))
  if (!m) return info
  const walk = (cfg: Record<string, any>, prefix = "") => {
    for (const [k, v] of Object.entries(cfg)) {
      if (v && typeof v === "object") walk(v, k)
      else if (m[Number(v)] !== undefined) prefix === "others" ? info.others[k] = dec(m[Number(v)]) : put(info, k, dec(m[Number(v)]))
    }
  }
  src.extractor.ids ? walk(src.extractor.ids) : m[1] && put(info, "unknown", dec(m[1]))
  return info
}

const detect = (src: recon_source, status: number, txt: string, json: any) => {
  const d = src.detection
  if (!d) return status >= 200 && status < 400
  if (d.strategy === "statusNegativeMatch") return status !== d.target
  if (d.strategy === "textNegativeMatch") return !txt.includes(d.target)
  if (d.strategy === "textPositiveMatch") return txt.includes(d.target)
  if (d.strategy === "jsonPositiveMatch") return Boolean(read_path(json, d.target))
  if (d.strategy === "jsonFieldExists") return read_path(json, d.target) !== undefined
  return false
}

const junk_recon_page = (status: number, body: string, is_json: boolean) => {
  if (status >= 400) return true
  if (is_json) return false
  const s = body.toLowerCase().replace(/\s+/g, " ")
  return [
    /<title[^>]*>\s*(?:\d+\s*)?(?:403|404|forbidden|not found|page not found|just a moment|attention required|client challenge|access denied|security check|are you human|verify)/,
    /<h1[^>]*>\s*(?:\d+\s*)?(?:403|404|forbidden|not found|page not found|checking your browser)/,
    /\bjust a moment\b/,
    /\bclient challenge\b/,
    /checking your browser/,
    /cf-browser-verification|cloudflare ray id|verify you are human|enable javascript and cookies/,
    /perimeterx|px-captcha|captcha-delivery|hcaptcha|g-recaptcha|are you a robot|human verification|unusual traffic|automated requests/,
    /access denied|request blocked|temporarily blocked|too many requests|rate limit/,
    /error\s*404|404\s*[-:|]|404 not found|page not found|profile not found|user not found|account not found/,
    /this (?:account|profile|user|page) (?:doesn.?t|does not) exist|isn.?t available|no longer available|has been (?:suspended|removed|deactivated)/,
    /does not exist|doesn.?t exist/,
  ].some(r => r.test(s))
}

// A profile lookup should resolve to a page that still addresses the queried handle.
// When the site redirects away (to a homepage, another host, or a bare root) the
// handle disappears from the final URL, which is a strong "not a real profile" signal.
const url_parts = (u: string) => {
  try {
    const p = new URL(u)
    return { host: p.hostname.toLowerCase().replace(/^www\./, ""), path: p.pathname.toLowerCase(), full: `${p.hostname}${p.pathname}${p.search}`.toLowerCase() }
  } catch { return null }
}

const redirected_off_profile = (requested: string, final: string, handle: string) => {
  if (!final || final === requested) return false
  const a = url_parts(requested), b = url_parts(final)
  if (!a || !b) return false
  const h = handle.toLowerCase()
  const req_has = a.full.includes(h)
  const fin_has = b.full.includes(h)
  if (req_has && !fin_has) return true
  if (a.host !== b.host && !fin_has) return true
  if (b.path === "" || b.path === "/") return req_has
  return false
}

// The final URL is an auth wall, bot/security challenge, or error surface rather
// than a real profile page. These destinations never represent a genuine hit.
const gate_url = (final: string) => {
  const b = url_parts(final)
  if (!b) return false
  return /(?:^|\/)(?:login|log-in|signin|sign-in|signup|sign-up|register|join|auth|authenticate|sso|challenge|captcha|bot-wall|botwall|blocked|denied|error|errors|404|not-found|notfound)(?:\/|$)/.test(b.path)
}

const timeout_err = (err: unknown) => {
  const e = err as { name?: string; code?: string; message?: string; cause?: any }
  const s = `${e?.name || ""} ${e?.code || ""} ${e?.message || ""} ${e?.cause?.name || ""} ${e?.cause?.code || ""}`.toLowerCase()
  return /timeout|timed out|abort|etimedout|econnaborted/.test(s)
}

const safe_headers = (headers: Record<string, string>) => Object.fromEntries(Object.entries(headers)
  .filter(([k, v]) => v !== undefined && !["host", "connection", "content-length"].includes(k.toLowerCase()))
  .map(([k, v]) => [k, String(v)]))

const body_str = (body?: BodyInit) => body === undefined ? undefined : typeof body === "string" ? body : body instanceof URLSearchParams ? body.toString() : String(body)

const puppeteer_fetch = async (req: recon_request): Promise<recon_browser_fetch> => {
  let mod: any
  try {
    mod = await import("puppeteer-extra")
    const stealth = (await import("puppeteer-extra-plugin-stealth")).default
      ; (mod.default || mod).use?.(stealth())
  } catch {
    mod = await import("puppeteer")
  }
  const puppeteer = mod.default || mod
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  })
  try {
    const page = await browser.newPage()
    const hdrs = safe_headers(req.headers)
    const ua_hdr = Object.entries(hdrs).find(([k]) => k.toLowerCase() === "user-agent")?.[1] || ua
    await page.setUserAgent(ua_hdr)
    delete hdrs["User-Agent"]
    delete hdrs["user-agent"]
    if (Object.keys(hdrs).length) await page.setExtraHTTPHeaders(hdrs)
    await page.setViewport({ width: 1365, height: 900, deviceScaleFactor: 1 })
    const method = req.method.toUpperCase()
    if (method === "GET" || method === "HEAD") {
      const res = await page.goto(req.url, { waitUntil: "domcontentloaded", timeout: 20_000 })
      await page.waitForNetworkIdle?.({ idleTime: 500, timeout: 5_000 }).catch(() => { })
      return { status: res?.status?.() || 200, headers: res?.headers?.() || {}, data: await page.content(), url: page.url() }
    }
    await page.goto(origin(req.url, null) || req.url, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => { })
    return await page.evaluate(async ({ url, method, headers, body }: { url: string; method: string; headers: Record<string, string>; body?: string }) => {
      const res = await fetch(url, { method, headers, body, credentials: "include" })
      return { status: res.status, headers: Object.fromEntries(res.headers.entries()), data: await res.text(), url: res.url }
    }, { url: req.url, method, headers: hdrs, body: body_str(req.body) })
  } finally {
    await browser.close().catch(() => { })
  }
}

const recovery_info = (info: recon_info, raw: string) => {
  const emails = raw.match(/[a-zA-Z0-9.\-_*]+@[a-zA-Z0-9.\-_*]+\.[a-zA-Z]{2,}/g)?.filter(x => x.includes("*") || x.includes("..."))
  if (emails?.length && !info.recovery_email) info.recovery_email = emails[0]
  const phones = raw.match(/(?:\+|00)?[0-9* \-]{5,15}[0-9]{2,4}/g)?.filter(x => (x.includes("*") || x.includes("...")) && x.replace(/[^0-9]/g, "").length >= 2)
  if (phones?.length && !info.recovery_phone) info.recovery_phone = phones[0].trim()
  const end = raw.match(/ending in (\d{2,4})/i)
  if (end && !info.recovery_phone) info.recovery_phone = `ending in ${end[1]}`
}

export const run_recon_source = async (src: recon_source, q: recon_query, fetcher: typeof fetch = fetch, opts: recon_run_options = {}): Promise<recon_result> => {
  const started = Date.now()
  let url = src.url
  try {
    const req = await make_recon_request(src, q)
    url = req.url
    let got: recon_browser_fetch
    try {
      const res = await fetcher(req.url, { method: req.method, headers: req.headers, body: req.body, signal: AbortSignal.timeout(10_000) })
      got = { status: res.status, headers: Object.fromEntries(res.headers.entries()), data: await res.text(), url: res.url }
    } catch (err) {
      if (src.type !== "email" || !timeout_err(err)) throw err
      got = await (opts.browser_fetcher || puppeteer_fetch)(req, src, q)
    }
    url = got.url || req.url
    const txt = got.data
    const ctype = Object.entries(got.headers || {}).find(([k]) => k.toLowerCase() === "content-type")?.[1] || ""
    const is_json = ctype.includes("json") || /^[\s\r\n]*[\[{]/.test(txt)
    let json: any = undefined
    if (is_json) try { json = JSON.parse(txt) } catch { }
    const info = is_json ? parse_json_info(json, src.api?.parser) : parse_html_info(txt)
    if (!is_json) apply_extract(info, txt, src)
    if (is_json && src.extractor?.pattern) apply_extract(info, typeof json === "string" ? json : JSON.stringify(json), src)
    promote_recon_location(info, json)
    if (info.avatar) info.avatar = abs_url(info.avatar, info.url || url)
    const icon = recon_favicon_url(src.website || null, url)
    const junk = junk_recon_page(got.status, txt, is_json)
    const off_profile = redirected_off_profile(req.url, url, q.val)
    const gated = gate_url(url)
    // 2xx statuses that are not real content (202 queued/challenge, 204 empty) are
    // unreliable "exists" signals, so they never count as a genuine profile hit.
    const noncontent_2xx = got.status === 202 || got.status === 204
    let found = !junk && detect(src, got.status, txt, json)
    if (found && (off_profile || gated || noncontent_2xx)) found = false
    if (found && src.type === "email") recovery_info(info, is_json ? JSON.stringify(json) : txt)
    return {
      source: src.name,
      category: src.category || "misc",
      website: src.website || null,
      url,
      icon,
      found,
      status: got.status,
      elapsed_ms: Date.now() - started,
      info: merge_info(info, empty_info()),
    }
  } catch (err) {
    return {
      source: src.name,
      category: src.category || "misc",
      website: src.website || null,
      url,
      icon: recon_favicon_url(src.website || null, url),
      found: false,
      status: null,
      elapsed_ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
      info: empty_info(),
    }
  }
}

export const load_recon_sources = async (q: recon_query): Promise<recon_source[]> => {
  const rows = (q.kind === "email" ? email_sources : username_sources) as recon_source[]
  return rows.filter(x => x && x.enabled !== false && x.type === q.kind && x.url)
}
