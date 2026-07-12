export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { parse_youtube_live_html, valid_youtube_id } from "@/lib/geo-intelligence/live-deck-core"

type live_result = {
  videoId: string | null
  hlsUrl: string | null
  isLive: boolean
  channelExists: boolean
  channelName: string | null
  title: string | null
  error?: string
}

const cache = new Map<string, { data: live_result, at: number }>()
const cache_ttl = 5 * 60 * 1000
const user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

const out = (data: live_result, maxage = 300) => NextResponse.json(data, {
  headers: { "Cache-Control": `public, max-age=${maxage}, s-maxage=${maxage}, stale-while-revalidate=120` },
})

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const channel = params.get("channel") || params.get("handle")
  const video_id = params.get("videoId")

  if (video_id) {
    if (!valid_youtube_id(video_id)) return NextResponse.json({ error: "invalid video id" }, { status: 400 })
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${video_id}&format=json`, {
        headers: { "User-Agent": user_agent },
        next: { revalidate: 3600 },
      })
      const data = res.ok ? await res.json() : {}
      return out({
        videoId: video_id,
        hlsUrl: null,
        isLive: false,
        channelExists: res.ok,
        channelName: data.author_name || null,
        title: data.title || null,
      }, 3600)
    } catch {
      return out({ videoId: video_id, hlsUrl: null, isLive: false, channelExists: true, channelName: null, title: null }, 3600)
    }
  }

  if (!channel || !/^@?[a-z0-9._-]+$/i.test(channel)) {
    return NextResponse.json({ error: "missing or invalid channel" }, { status: 400 })
  }

  const handle = channel.startsWith("@") ? channel : `@${channel}`
  const hit = cache.get(handle)
  if (hit && Date.now() - hit.at < cache_ttl) return out(hit.data)

  try {
    const res = await fetch(`https://www.youtube.com/${handle}/live`, {
      headers: { "User-Agent": user_agent, "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
      cache: "no-store",
    })
    if (!res.ok) {
      const data = { videoId: null, hlsUrl: null, isLive: false, channelExists: false, channelName: null, title: null }
      cache.set(handle, { data, at: Date.now() })
      return out(data)
    }

    const html = await res.text()
    const parsed = parse_youtube_live_html(html)
    const data: live_result = {
      videoId: parsed.video_id,
      hlsUrl: parsed.hls_url,
      isLive: parsed.is_live,
      channelExists: html.includes("\"channelId\"") || html.includes("og:url"),
      channelName: parsed.channel_name,
      title: parsed.title,
    }
    cache.set(handle, { data, at: Date.now() })
    return out(data)
  } catch {
    const data = {
      videoId: null,
      hlsUrl: null,
      isLive: false,
      channelExists: true,
      channelName: null,
      title: null,
      error: "live detection unavailable",
    }
    cache.set(handle, { data, at: Date.now() })
    return out(data, 60)
  }
}
