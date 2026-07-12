"use client"

import { useEffect } from "react"

export const MarketDeepDive = ({ symbol, onClose }: { symbol: string, onClose: () => void }) => {
  
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "auto" }
  }, [])

  
  const tvSymbol = symbol.replace('^', '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-10 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-6xl bg-[#0a0a0a] border border-[#333] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222] bg-[#111]">
          <span className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Market Deep Dive: {symbol}
          </span>
          <button onClick={onClose} className="p-1 hover:bg-[#222] rounded text-stone-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>
        <div className="flex-1 w-full h-full bg-[#111]">
          {}
          <iframe 
            src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_1&symbol=${tvSymbol}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en`}
            className="w-full h-full border-0"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  )
}
