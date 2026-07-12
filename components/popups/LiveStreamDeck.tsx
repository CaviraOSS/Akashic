"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ExternalLink, Pause, Play, Plus, RefreshCw, Search, Star, Trash2, Volume2, VolumeX, X } from "lucide-react"

type live_channel = {
  id: string
  name: string
  region: string
  handle?: string
  video_id?: string
  hls_url?: string
  fallback_only?: boolean
  custom?: boolean
}

const channel = (
  id: string,
  name: string,
  region: string,
  handle?: string,
  video_id?: string,
  hls_url?: string,
  fallback_only = false,
): live_channel => ({ id, name, region, handle, video_id, hls_url, fallback_only })

const base_channels: live_channel[] = [
  channel("bloomberg", "bloomberg", "north america", "@markets", "iEpJwprxDdk"),
  channel("cnbc", "cnbc", "north america", "@CNBC", "9NyxcX3rhQs"),
  channel("yahoo", "yahoo finance", "north america", "@YahooFinance", "KQp-e_XQnDE"),
  channel("cnn", "cnn", "north america", "@CNN", "w_Ma8oQLmSM"),
  channel("fox", "fox news", "north america", "@FoxNews", "QaftgYkG-ek"),
  channel("abc", "abc news", "north america", "@ABCNews"),
  channel("cbs", "cbs news", "north america", "@CBSNews", "R9L8sDK8iEc"),
  channel("nbc", "nbc news", "north america", "@NBCNews", "yMr0neQhu6c"),
  channel("cbc", "cbc news", "north america", "@CBCNews", "jxP_h3V-Dv8"),
  channel("reuters", "reuters tv", "north america", undefined, undefined, "https://reuters-reutersnow-1-eu.rakuten.wurl.tv/playlist.m3u8", true),
  channel("sky", "sky news", "europe", "@SkyNews", "uvviIF4725I"),
  channel("euronews", "euronews", "europe", "@euronews", "pykpO5kQJ98"),
  channel("dw", "dw news", "europe", "@DWNews", "LuKwFajn37U"),
  channel("france24", "france 24", "europe", "@FRANCE24", "u9foWyMSETk"),
  channel("bbc", "bbc news", "europe", "@BBCNews", "bjgQzJzCZKs"),
  channel("france24en", "france 24 english", "europe", "@France24_en", "Ap-UM1O9RBU"),
  channel("rtve", "rtve 24h", "europe", "@RTVENoticias", "7_srED6k0bE"),
  channel("trthaber", "trt haber", "europe", "@trthaber", "3XHebGJG0bc"),
  channel("ntv", "ntv turkey", "europe", "@NTV", "pqq5c6k70kk"),
  channel("cnnturk", "cnn turk", "europe", "@cnnturk", "lsY4GFoj_xY"),
  channel("tvp", "tvp info", "europe", "@tvpinfo", "3jKb-uThfrg"),
  channel("welt", "welt", "europe", "@WELTVideoTV", "L-TNmYmaAKQ"),
  channel("tagesschau", "tagesschau24", "europe", "@tagesschau", "fC_q9TkO1uU"),
  channel("bfmtv", "bfmtv", "europe", "@BFMTV", "smB_F6DW7cI"),
  channel("gbnews", "gb news", "europe", undefined, undefined, "https://live-gbnews.simplestreamcdn.com/live5/gbnews/bitrate1.isml/manifest.m3u8", true),
  channel("cnnbrasil", "cnn brasil", "latin america", "@CNNbrasil", "qcTn899skkc"),
  channel("jovempan", "jovem pan news", "latin america", "@jovempannews"),
  channel("record", "record news", "latin america", "@RecordNews", undefined, "https://stream.ads.ottera.tv/playlist.m3u8?network_id=2116"),
  channel("tn", "tn argentina", "latin america", "@todonoticias", "cb12KmMMDJA"),
  channel("c5n", "c5n", "latin america", "@c5n", "SF06Qy1Ct6Y"),
  channel("milenio", "milenio", "latin america", "@MILENIO"),
  channel("caracol", "noticias caracol", "latin america", "@NoticiasCaracol"),
  channel("ntn24", "ntn24", "latin america", "@NTN24"),
  channel("t13", "t13", "latin america", "@Teletrece"),
  channel("tbs", "tbs news dig", "asia", "@tbsnewsdig", "aUDm173E8k8"),
  channel("ann", "ann news", "asia", "@ANNnewsCH"),
  channel("wion", "wion", "asia", "@WION"),
  channel("ndtv", "ndtv 24x7", "asia", "@NDTV"),
  channel("cna", "cna newsasia", "asia", "@channelnewsasia", "XWq5kBlakcQ"),
  channel("nhk", "nhk world japan", "asia", "@NHKWORLDJAPAN", "f0lYfG_vY_U"),
  channel("indiatoday", "india today", "asia", "@indiatoday", "sYZtOFzM78M"),
  channel("cgtn", "cgtn", "asia", undefined, undefined, "https://news.cgtn.com/resource/live/english/cgtn-news.m3u8", true),
  channel("arirang", "arirang news", "asia", "@ArirangCoKrArirangNEWS", undefined, "https://amdlive-ch01-ctnd-com.akamaized.net/arirang_1ch/smil:arirang_1ch.smil/playlist.m3u8"),
  channel("alarabiya", "al arabiya", "middle east", "@AlArabiya", "n7eQejkXbnM", undefined, true),
  channel("aljazeera", "al jazeera english", "middle east", "@AlJazeeraEnglish", "gCNeDWCI0vo", undefined, true),
  channel("alhadath", "al hadath", "middle east", "@AlHadath", "xWXpl7azI8k", undefined, true),
  channel("skyarabia", "sky news arabia", "middle east", "@skynewsarabia", "U--OjmpjF5o"),
  channel("trtworld", "trt world", "middle east", "@TRTWorld", "ABfFhWzWs0s"),
  channel("iranintl", "iran international", "middle east", "@IranIntl"),
  channel("kan11", "kan 11", "middle east", "@KAN11NEWS", "TCnaIE_SAtM"),
  channel("i24", "i24news", "middle east", "@i24NEWS_HE", "myKybZUK0IA"),
  channel("asharq", "asharq news", "middle east", "@asharqnews", "f6VpkfV7m4Y", undefined, true),
  channel("aljazeeraar", "al jazeera arabic", "middle east", "@AljazeeraChannel", "bNyUyrR0PHo", undefined, true),
  channel("ajmubasher", "al jazeera mubasher", "middle east", undefined, undefined, "https://live-hls-web-ajm.getaj.net/AJM/index.m3u8", true),
  channel("africanews", "africanews", "africa", "@africanews"),
  channel("channelstv", "channels tv", "africa", "@ChannelsTelevision"),
  channel("ktn", "ktn news", "africa", "@ktnnews_kenya", "RmHtsdVb3mo"),
  channel("enca", "enca", "africa", "@encanews"),
  channel("sabc", "sabc news", "africa", "@SABCDigitalNews", undefined, "https://sabconetanw.cdn.mangomolo.com/news/smil:news.stream.smil/playlist.m3u8"),
  channel("arise", "arise news", "africa", "@AriseNewsChannel", "4uHZdlX-DT4"),
  channel("abcau", "abc news australia", "oceania", "@abcnewsaustralia", "vOTiJkg1voo"),
]

const regionz = ["all", "favorites", "north america", "europe", "latin america", "asia", "middle east", "africa", "oceania", "custom"]
const keyz = {
  favorites: "akashic_live_favorites",
  custom: "akashic_live_custom",
  active: "akashic_live_active",
}

const read_store = <t,>(key: string, fallback: t): t => {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

const live_stream_deck = ({ onClose }: { onClose: () => void }) => {
  const [custom, setCustom] = useState<live_channel[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [active_id, setActiveId] = useState(base_channels[0].id)
  const [region, setRegion] = useState("all")
  const [query, setQuery] = useState("")
  const [video_id, setVideoId] = useState<string | null>(null)
  const [hls_url, setHlsUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(true)
  const [retry, setRetry] = useState(0)
  const [show_add, setShowAdd] = useState(false)
  const [new_name, setNewName] = useState("")
  const [new_source, setNewSource] = useState("")
  const iframe_ref = useRef<HTMLIFrameElement>(null)
  const video_ref = useRef<HTMLVideoElement>(null)
  const channels = useMemo(() => [...base_channels, ...custom], [custom])
  const active = channels.find(item => item.id === active_id) || channels[0]

  const filtered = useMemo(() => channels.filter(item => {
    const region_ok = region === "all"
      || region === "favorites" && favorites.includes(item.id)
      || region === "custom" && item.custom
      || item.region === region
    const search_ok = !query || `${item.name} ${item.handle || ""}`.toLowerCase().includes(query.toLowerCase())
    return region_ok && search_ok
  }), [channels, favorites, query, region])

  useEffect(() => {
    const old = document.body.style.overflow
    document.body.style.overflow = "hidden"
    setCustom(read_store(keyz.custom, []))
    setFavorites(read_store(keyz.favorites, []))
    setActiveId(read_store(keyz.active, base_channels[0].id))
    const visibility = () => {
      if (document.hidden) setPlaying(false)
    }
    document.addEventListener("visibilitychange", visibility)
    return () => {
      document.body.style.overflow = old
      document.removeEventListener("visibilitychange", visibility)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(keyz.custom, JSON.stringify(custom))
  }, [custom])

  useEffect(() => {
    localStorage.setItem(keyz.favorites, JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    if (!active) return
    localStorage.setItem(keyz.active, JSON.stringify(active.id))
    let alive = true
    setLoading(true)
    setError("")
    setVideoId(null)
    setHlsUrl(null)

    if (active.fallback_only) {
      setVideoId(active.video_id || null)
      setHlsUrl(active.hls_url || null)
      setLoading(false)
      if (!active.video_id && !active.hls_url) setError("no playable source configured")
      return
    }

    if (!active.handle) {
      setVideoId(active.video_id || null)
      setHlsUrl(active.hls_url || null)
      setLoading(false)
      if (!active.video_id && !active.hls_url) setError("no playable source configured")
      return
    }

    fetch(`/api/youtube/live?channel=${encodeURIComponent(active.handle)}`)
      .then(res => res.json())
      .then(data => {
        if (!alive) return
        const found = data.videoId || active.video_id || null
        setVideoId(found)
        setHlsUrl(data.hlsUrl || active.hls_url || null)
        if (!found && !data.hlsUrl && !active.hls_url) setError(data.channelExists === false ? "channel unavailable" : "stream offline; no fallback available")
      })
      .catch(() => {
        if (!alive) return
        setVideoId(active.video_id || null)
        setHlsUrl(active.hls_url || null)
        if (!active.video_id && !active.hls_url) setError("live detection unavailable")
      })
      .finally(() => alive && setLoading(false))

    return () => { alive = false }
  }, [active, retry])

  useEffect(() => {
    const frame = iframe_ref.current
    if (frame?.contentWindow) {
      frame.contentWindow.postMessage(JSON.stringify({ event: "command", func: playing ? "playVideo" : "pauseVideo", args: [] }), "*")
      frame.contentWindow.postMessage(JSON.stringify({ event: "command", func: muted ? "mute" : "unMute", args: [] }), "*")
    }
    const video = video_ref.current
    if (video) {
      video.muted = muted
      if (playing) video.play().catch(() => undefined)
      else video.pause()
    }
  }, [muted, playing, video_id, hls_url])

  const toggle_favorite = (id: string) => setFavorites(list => list.includes(id) ? list.filter(item => item !== id) : [...list, id])

  const add_custom = () => {
    const name = new_name.trim()
    const source = new_source.trim()
    if (!name || !source) return
    const watch = source.match(/[?&]v=([a-z0-9_-]{11})/i)?.[1] || (/^[a-z0-9_-]{11}$/i.test(source) ? source : undefined)
    const handle = source.match(/youtube\.com\/(@[a-z0-9._-]+)/i)?.[1] || (source.startsWith("@") ? source : undefined)
    const hls = /^https?:\/\/.+\.m3u8(?:\?.*)?$/i.test(source) ? source : undefined
    if (!watch && !handle && !hls) {
      setError("use a youtube handle, video url, video id, or hls url")
      return
    }
    const id = `custom-${Date.now()}`
    const item: live_channel = { id, name, region: "custom", handle, video_id: watch, hls_url: hls, fallback_only: !!watch || !!hls, custom: true }
    setCustom(list => [...list, item])
    setActiveId(id)
    setRegion("custom")
    setNewName("")
    setNewSource("")
    setShowAdd(false)
  }

  const remove_custom = (id: string) => {
    setCustom(list => list.filter(item => item.id !== id))
    setFavorites(list => list.filter(item => item !== id))
    if (active_id === id) setActiveId(base_channels[0].id)
  }

  const source_url = video_id
    ? `https://www.youtube.com/watch?v=${video_id}`
    : active?.handle
      ? `https://www.youtube.com/${active.handle}/live`
      : hls_url || "#"

  return (
    <div className="fixed inset-0 z-50 bg-black/90 p-2 sm:p-6 backdrop-blur-md">
      <div className="w-full h-full max-w-[1600px] mx-auto bg-[#0a0a0a] border border-[#333] rounded-md shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222] bg-[#111] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-red-400 tracking-widest uppercase truncate">live global broadcast intercepts</span>
              <span className="text-[9px] text-stone-500">{channels.length} channels | {active?.region}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button title={playing ? "pause" : "play"} onClick={() => setPlaying(value => !value)} className="p-2 text-stone-400 hover:text-white hover:bg-[#222] rounded">
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button title={muted ? "unmute" : "mute"} onClick={() => setMuted(value => !value)} className="p-2 text-stone-400 hover:text-white hover:bg-[#222] rounded">
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <a title="open source" href={source_url} target="_blank" rel="noreferrer" className="p-2 text-stone-400 hover:text-white hover:bg-[#222] rounded">
              <ExternalLink size={16} />
            </a>
            <button title="close" onClick={onClose} className="p-2 text-stone-400 hover:text-white hover:bg-[#222] rounded">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 grid-rows-[45vh_1fr] lg:grid-rows-1 lg:grid-cols-[1fr_360px] flex-1 min-h-0 w-full h-full overflow-hidden">
          <div className="bg-black relative min-h-[40vh] lg:min-h-0 flex items-center justify-center border-b lg:border-b-0 border-[#222]">
            {loading && <span className="text-stone-500 animate-pulse text-xs uppercase tracking-widest">resolving live signal...</span>}
            {!loading && error && (
              <div className="flex flex-col items-center gap-3 text-center px-6 z-10">
                <span className="text-red-400 text-xs uppercase tracking-widest">{error}</span>
                <button onClick={() => setRetry(value => value + 1)} className="flex items-center gap-2 border border-red-500/40 text-red-400 px-3 py-2 text-[10px] uppercase hover:bg-red-500/10">
                  <RefreshCw size={13} /> retry
                </button>
              </div>
            )}
            {!loading && !error && video_id && (
              <iframe
                ref={iframe_ref}
                key={video_id}
                src={`https://www.youtube.com/embed/${video_id}?autoplay=1&mute=${muted ? 1 : 0}&enablejsapi=1&rel=0`}
                className="w-full h-full absolute inset-0"
                title={`${active?.name} live stream`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
            {!loading && !error && !video_id && hls_url && (
              <video
                ref={video_ref}
                key={hls_url}
                src={hls_url}
                className="w-full h-full absolute inset-0 object-contain"
                autoPlay
                muted={muted}
                controls
                onError={() => setError("direct hls stream is unavailable or restricted in this browser")}
              />
            )}
            {!loading && !error && !video_id && !hls_url && (
              <div className="text-stone-600 text-xs uppercase tracking-widest z-10">no video source</div>
            )}
          </div>

          <aside className="bg-[#111] flex flex-col min-h-[300px] lg:min-h-0 border-t lg:border-t-0 lg:border-l border-[#222] overflow-hidden">
            <div className="p-3 border-b border-[#222] flex flex-col gap-2 shrink-0">
              <div className="flex gap-2">
                <label className="flex-1 flex items-center gap-2 bg-[#0a0a0a] border border-[#333] px-2 rounded-sm">
                  <Search size={13} className="text-stone-500" />
                  <input value={query} onChange={event => setQuery(event.target.value)} placeholder="search channels" className="w-full bg-transparent py-2 text-[11px] text-white outline-none placeholder:text-stone-600" />
                </label>
                <button title="add channel" onClick={() => setShowAdd(value => !value)} className="p-2 border border-[#333] text-stone-400 hover:text-white hover:border-stone-500 rounded-sm">
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                {regionz.map(item => (
                  <button key={item} onClick={() => setRegion(item)} className={`px-2 py-1 text-[8px] uppercase whitespace-nowrap border ${region === item ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-[#333] text-stone-500 hover:text-stone-300"} rounded-sm transition-colors`}>
                    {item}
                  </button>
                ))}
              </div>
              {show_add && (
                <div className="grid gap-2 border-t border-[#222] pt-2">
                  <input value={new_name} onChange={event => setNewName(event.target.value)} placeholder="channel name" className="bg-[#0a0a0a] border border-[#333] px-2 py-2 text-[10px] text-white outline-none rounded-sm" />
                  <input value={new_source} onChange={event => setNewSource(event.target.value)} placeholder="@handle, youtube url, video id, or .m3u8" className="bg-[#0a0a0a] border border-[#333] px-2 py-2 text-[10px] text-white outline-none rounded-sm" />
                  <button onClick={add_custom} className="bg-red-500/10 border border-red-500/40 text-red-400 py-2 text-[9px] uppercase hover:bg-red-500/20 rounded-sm transition-colors">add source</button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 grid gap-1 content-start custom-scrollbar">
              {filtered.map(item => (
                <div key={item.id} className={`flex items-center border transition-colors rounded-sm ${active?.id === item.id ? "bg-[#222] border-red-500/50" : "border-[#2b2b2b] hover:border-stone-500 bg-[#0a0a0a]"}`}>
                  <button onClick={() => setActiveId(item.id)} className="flex-1 min-w-0 p-2 text-left">
                    <span className={`block text-[11px] font-bold truncate ${active?.id === item.id ? "text-white" : "text-stone-300"}`}>{item.name}</span>
                    <span className="block text-[8px] text-stone-500 uppercase truncate mt-0.5">{item.region} | {item.hls_url && !item.handle ? "direct hls" : item.handle || "fixed video"}</span>
                  </button>
                  <button title="favorite" onClick={() => toggle_favorite(item.id)} className={`p-2 ${favorites.includes(item.id) ? "text-yellow-400" : "text-stone-600 hover:text-stone-300"} transition-colors`}>
                    <Star size={14} fill={favorites.includes(item.id) ? "currentColor" : "none"} />
                  </button>
                  {item.custom && (
                    <button title="remove custom channel" onClick={() => remove_custom(item.id)} className="p-2 text-stone-600 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {!filtered.length && <span className="text-[10px] text-stone-600 text-center py-8 block">no matching channels</span>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export { live_stream_deck as LiveStreamDeck }
