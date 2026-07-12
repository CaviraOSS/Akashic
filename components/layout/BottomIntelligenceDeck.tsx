import { geo_intel_feed_response } from "@/lib/geo-intelligence/types"
import { GeoIntelligenceConsole } from "@/components/intelligence/GeoIntelligenceConsole"
import {
  CountryInstabilityPanel,
  StrategicRiskOverview,
  LiveIntelligenceFeed,
  ThreatTimeline,
  CrossSourceSignal,
  GlobalStockMarketsPanel,
  EnergyResourcesPanel,
  ContinentNewsGrid,
  SuperpowerTrackerPanel,
  LiveStreamsPanel,
  CryptoPanel,
  FearGreedPanel,
  MacroSignalsPanel,
  WorldClockPanel,
  LayerSignalPanel,
  layer_signal_panels,
  live_panels,
} from "@/components/intelligence/intel_panels"

export type bottom_deck_props = {
  data: geo_intel_feed_response
  loading?: boolean
}

export const BottomIntelligenceDeck = ({ data, loading }: bottom_deck_props) => {
  return (
    <div className="w-full min-h-[100svh] bg-[#0a0a0a] border-t border-[#222] p-4 font-mono relative">
      <div className="max-w-[1920px] mx-auto flex flex-col gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 bg-[#0f0f0f] border border-[#222] rounded-md overflow-hidden shadow-lg h-[400px]">
            <GeoIntelligenceConsole data={data} loading={loading} />
          </div>

          <div className="lg:col-span-4 flex flex-col gap-4 max-h-[400px]">
            <LiveIntelligenceFeed data={data} />
            <LiveStreamsPanel data={data} />
          </div>
        </div>

        <div
          className="grid gap-4 auto-rows-min"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        >
          <GlobalStockMarketsPanel data={data} />
          <EnergyResourcesPanel data={data} />
          <ContinentNewsGrid data={data} />
          <SuperpowerTrackerPanel data={data} />
          <live_panels.source_health data={data} />
          <StrategicRiskOverview data={data} />
          <ThreatTimeline data={data} />
          <CrossSourceSignal data={data} />
          <CountryInstabilityPanel data={data} />
          <FearGreedPanel data={data} />
          <CryptoPanel data={data} />
          <MacroSignalsPanel data={data} />
          <WorldClockPanel />
          <live_panels.conflict_humanitarian data={data} />
          <live_panels.cyber_connectivity data={data} />
          <live_panels.infrastructure_flow data={data} />
          <live_panels.strategic_assets data={data} />
          <live_panels.natural_climate data={data} />
          <live_panels.sanctions_economic data={data} />
          <live_panels.technology_watch data={data} />
          <live_panels.resilience_progress data={data} />
          <live_panels.live_correlations data={data} />
          <live_panels.worldmonitor_panels data={data} />
          <live_panels.intelligence_hotspots data={data} />
          {layer_signal_panels.map(panel => (
            <LayerSignalPanel key={panel.id} data={data} {...panel} />
          ))}
        </div>
      </div>
    </div>
  )
}

