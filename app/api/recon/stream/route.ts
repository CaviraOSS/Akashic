export const dynamic = "force-dynamic"
export const maxDuration = 300

import { clean_recon_query, load_recon_sources, make_recon_request, recon_favicon_url, run_recon_source } from "@/lib/recon/core"

const enc = new TextEncoder()
const original_concurrency = 20
const num = (v: string | null, d: number, min: number, max: number) => {
  if (v === null || v.trim() === "") return d
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : d
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const raw = url.searchParams.get("q") || url.searchParams.get("query") || ""
  const query = clean_recon_query(raw)
  const limit = num(url.searchParams.get("limit"), 0, 0, 2000)
  const concurrency = num(url.searchParams.get("concurrency"), original_concurrency, 1, original_concurrency)

  if (!query.val) {
    return new Response("event: error\ndata: {\"error\":\"query required\"}\n\n", {
      status: 400,
      headers: { "content-type": "text/event-stream; charset=utf-8" },
    })
  }

  const stream = new ReadableStream({
    async start(ctrl) {
      let closed = false
      const send = (event: string, data: unknown) => {
        if (closed || req.signal.aborted) return
        ctrl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }
      req.signal.addEventListener("abort", () => { closed = true }, { once: true })

      try {
        let srcs = await load_recon_sources(query)
        if (limit > 0) srcs = srcs.slice(0, limit)
        let idx = 0
        const stats = { checked: 0, found: 0, not_found: 0, error: 0, total: srcs.length }
        send("start", { query: query.val, kind: query.kind, total: srcs.length, concurrency })

        const worker = async () => {
          while (!closed && !req.signal.aborted) {
            const at = idx++
            const src = srcs[at]
            if (!src) return
            const preview = await make_recon_request(src, query).catch(() => ({ url: src.url }))
            send("check", { index: at, source: src.name, category: src.category || "misc", url: preview.url, icon: recon_favicon_url(src.website || null, preview.url) })
            const res = await run_recon_source(src, query)
            stats.checked++
            if (res.error) stats.error++
            else if (res.found) stats.found++
            else stats.not_found++
            send("result", { index: at, ...res })
            send("progress", stats)
          }
        }

        await Promise.all(Array.from({ length: Math.min(concurrency, srcs.length) }, worker))
        send("done", { ...stats, finished_at: new Date().toISOString() })
      } catch (err) {
        send("error", { error: err instanceof Error ? err.message : String(err) })
      } finally {
        closed = true
        try { ctrl.close() } catch { }
      }
    },
    cancel() { },
  })

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  })
}
