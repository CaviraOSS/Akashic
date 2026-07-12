"use client"

import { CloudRain, Droplets, Gauge, Radar, Thermometer, Wind, X, Zap } from "lucide-react"
import { weather_map_modes, weather_mode_meta, type weather_mode } from "@/lib/weather/map-core"

type props = {
  mode: weather_mode
  on_mode: (mode: weather_mode) => void
  on_close: () => void
}

const icons = {
  radar: Radar,
  precipitation: CloudRain,
  wind: Wind,
  wind_gusts: Zap,
  temperature: Thermometer,
  humidity: Droplets,
  pressure: Gauge,
}

export const WeatherMapControls = ({ mode, on_mode, on_close }: props) => {
  const meta = weather_mode_meta[mode]
  return <>
    <section
      className="weather-map-controls pointer-events-auto fixed top-20 z-40 w-56 overflow-hidden rounded-lg border border-sky-300/20 bg-[#102642]/90 text-slate-100 shadow-2xl backdrop-blur-xl"
    >
      <header className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">weather maps</p>
          <p className="mt-0.5 text-[9px] text-slate-400">open-meteo + rainviewer</p>
        </div>
        <button onClick={on_close} className="grid size-7 place-items-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white" title="close weather">
          <X className="size-4" />
        </button>
      </header>
      <div className="p-1.5">
        {weather_map_modes.map(id => {
          const Icon = icons[id]
          const active = id === mode
          return <button
            key={id}
            onClick={() => on_mode(id)}
            className={`flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-left text-xs transition ${active ? "bg-sky-200/20 text-white shadow-[inset_2px_0_0_#7dd3fc]" : "text-slate-300 hover:bg-white/[0.07] hover:text-white"}`}
          >
            <Icon className={`size-4 ${active ? "text-sky-200" : "text-slate-400"}`} />
            <span className="flex-1">{weather_mode_meta[id].label}</span>
            {active && <span className="size-1.5 rounded-full bg-sky-300 shadow-[0_0_8px_#7dd3fc]" />}
          </button>
        })}
      </div>
    </section>
    <style>{`
      .weather-map-controls{left:27.5rem}
    `}</style>

    <section className="pointer-events-none fixed bottom-24 left-1/2 z-40 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-sky-200/20 bg-[#102642]/88 px-3 py-2 shadow-2xl backdrop-blur-xl">
      <div className="mb-1.5 flex items-center justify-between text-[9px] uppercase tracking-[0.14em] text-slate-300">
        <span>{meta.label}</span>
        <span>live · {meta.unit}</span>
      </div>
      <div className="flex h-4 overflow-hidden rounded-sm border border-white/10">
        {meta.legend.map((item, idx) => <div
          key={`${mode}-${item.v}`}
          className="relative flex-1"
          style={{ background: item.color }}
        >
          {(idx === 0 || idx === meta.legend.length - 1 || idx === Math.floor(meta.legend.length / 2)) &&
            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{item.label}</span>}
        </div>)}
      </div>
    </section>
  </>
}
