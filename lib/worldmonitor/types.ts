export type DataSourceId =
  | 'acled'
  | 'opensky'
  | 'wingbits'
  | 'ais'
  | 'usgs'
  | 'gdelt'
  | 'gdelt_doc'
  | 'rss'
  | 'polymarket'
  | 'predictions'
  | 'pizzint'
  | 'outages'
  | 'cyber_threats'
  | 'weather'
  | 'economic'
  | 'oil'
  | 'spending'
  | 'acled_conflict'
  | 'ucdp'
  | 'hapi'
  | 'ucdp_events'
  | 'unhcr'
  | 'climate'
  | 'worldpop'
  | 'giving'
  | 'bis'
  | 'bls'
  | 'wto_trade'
  | 'supply_chain'
  | 'security_advisories'
  | 'gpsjam'
  | 'sanctions_pressure'
  | 'radiation'
  | 'treasury_revenue';




export type HappyContentCategory =
  | 'science-health'
  | 'nature-wildlife'
  | 'humanity-kindness'
  | 'innovation-tech'
  | 'climate-wins'
  | 'culture-community';

export interface TechHQ {
  id: string;
  company: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  type: 'faang' | 'unicorn' | 'public';
  employees?: number;
  marketCap?: string;
}

export interface DeductContextDetail {
  query?: string;
  geoContext: string;
  autoSubmit?: boolean;
}

export type PropagandaRisk = 'low' | 'medium' | 'high';

export interface Feed {
  name: string;
  url: string | Record<string, string>;
  type?: string;
  region?: string;
  propagandaRisk?: PropagandaRisk;
  stateAffiliated?: string;
  lang?: string;
}

export type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type EventCategory =
  | 'conflict' | 'protest' | 'disaster' | 'diplomatic' | 'economic'
  | 'terrorism' | 'cyber' | 'health' | 'environmental' | 'military'
  | 'crime' | 'infrastructure' | 'tech' | 'general';

export interface ThreatClassification {
  level: ThreatLevel;
  category: EventCategory;
  confidence: number;
  source: 'keyword' | 'ml' | 'llm';
}

export type StoryPhase = 'breaking' | 'developing' | 'sustained' | 'fading';

export interface StoryMeta {
  firstSeen: number;
  mentionCount: number;
  sourceCount: number;
  phase: StoryPhase;
}


export interface NewsItem {
  source: string;
  title: string;
  link: string;
  pubDate: Date;

  pubDateMissing?: boolean;
  isAlert: boolean;
  monitorColor?: string;
  tier?: number;
  threat?: ThreatClassification;
  lat?: number;
  lon?: number;
  locationName?: string;
  lang?: string;
  happyCategory?: HappyContentCategory;
  imageUrl?: string;
  importanceScore?: number;
  corroborationCount?: number;
  storyMeta?: StoryMeta;

  snippet?: string;
}

export type VelocityLevel = 'normal' | 'elevated' | 'spike';
export type SentimentType = 'negative' | 'neutral' | 'positive';
export type DeviationLevel = 'normal' | 'elevated' | 'spike' | 'quiet';

export interface VelocityMetrics {
  sourcesPerHour: number;
  level: VelocityLevel;
  trend: 'rising' | 'stable' | 'falling';
  sentiment: SentimentType;
  sentimentScore: number;
}

export interface ClusteredEvent {
  id: string;
  primaryTitle: string;
  primarySource: string;
  primaryLink: string;
  sourceCount: number;
  topSources: Array<{ name: string; tier: number; url: string }>;
  allItems: NewsItem[];
  firstSeen: Date;
  lastUpdated: Date;
  isAlert: boolean;
  monitorColor?: string;
  velocity?: VelocityMetrics;
  threat?: ThreatClassification;
  lat?: number;
  lon?: number;
  lang?: string;
}

export type AssetType = 'pipeline' | 'cable' | 'datacenter' | 'base' | 'nuclear';

export interface RelatedAsset {
  id: string;
  name: string;
  type: AssetType;
  distanceKm: number;
}

export interface RelatedAssetContext {
  origin: { label: string; lat: number; lon: number };
  types: AssetType[];
  assets: RelatedAsset[];
}

export interface Sector {
  symbol: string;
  name: string;
}

export interface Commodity {
  symbol: string;
  name: string;
  display: string;
}

export interface MarketSymbol {
  symbol: string;
  name: string;
  display: string;
}

export interface MarketData {
  symbol: string;
  name: string;
  display: string;
  price: number | null;
  change: number | null;
  sparkline?: number[];
}

export interface CryptoData {
  name: string;
  symbol: string;
  price: number;
  change: number;
  sparkline?: number[];
}

export interface TokenData {
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  change7d: number;
}

export type EscalationTrend = 'escalating' | 'stable' | 'de-escalating';

export interface DynamicEscalationScore {
  hotspotId: string;
  staticBaseline: number;
  dynamicScore: number;
  combinedScore: number;
  trend: EscalationTrend;
  components: {
    newsActivity: number;
    ciiContribution: number;
    geoConvergence: number;
    militaryActivity: number;
  };
  history: Array<{ timestamp: number; score: number }>;
  lastUpdated: Date;
}

export interface HistoricalContext {
  lastMajorEvent?: string;
  lastMajorEventDate?: string;
  precedentCount?: number;
  precedentDescription?: string;
  cyclicalRisk?: string;
}

export interface Hotspot {
  id: string;
  name: string;
  lat: number;
  lon: number;
  keywords: string[];
  subtext?: string;
  location?: string;
  agencies?: string[];
  level?: 'low' | 'elevated' | 'high';
  description?: string;
  status?: string;

  escalationScore?: 1 | 2 | 3 | 4 | 5;
  escalationTrend?: EscalationTrend;
  escalationIndicators?: string[];

  history?: HistoricalContext;
  whyItMatters?: string;
}

export interface StrategicWaterway {
  id: string;

  chokepointId: string;
  name: string;
  lat: number;
  lon: number;
  description?: string;
}

export type AisDisruptionType = 'gap_spike' | 'chokepoint_congestion';

export interface AisDisruptionEvent {
  id: string;
  name: string;
  type: AisDisruptionType;
  lat: number;
  lon: number;
  severity: 'low' | 'elevated' | 'high';
  changePct: number;
  windowHours: number;
  darkShips?: number;
  vesselCount?: number;
  region?: string;
  description: string;
}

export interface AisDensityZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  intensity: number;
  deltaPct: number;
  shipsPerDay?: number;
  note?: string;
}

export interface APTGroup {
  id: string;
  name: string;
  aka: string;
  sponsor: string;
  lat: number;
  lon: number;
  mitreId?: string;
  mitreUrl?: string;
  description?: string;
  tactics?: string[];
  targetSectors?: string[];
  active?: boolean;
}

export type CyberThreatType = 'c2_server' | 'malware_host' | 'phishing' | 'malicious_url';
export type CyberThreatSource = 'feodo' | 'urlhaus' | 'c2intel' | 'otx' | 'abuseipdb';
export type CyberThreatSeverity = 'low' | 'medium' | 'high' | 'critical';
export type CyberThreatIndicatorType = 'ip' | 'domain' | 'url';

export interface CyberThreat {
  id: string;
  type: CyberThreatType;
  source: CyberThreatSource;
  indicator: string;
  indicatorType: CyberThreatIndicatorType;
  lat: number;
  lon: number;
  country?: string;
  severity: CyberThreatSeverity;
  malwareFamily?: string;
  tags: string[];
  firstSeen?: string;
  lastSeen?: string;
}

export interface ConflictZone {
  id: string;
  name: string;
  coords: [number, number][];
  center: [number, number];
  intensity?: 'high' | 'medium' | 'low';
  parties?: string[];
  casualties?: string;
  displaced?: string;
  keywords?: string[];
  startDate?: string;
  location?: string;
  description?: string;
  keyDevelopments?: string[];
}



export type UcdpEventType = 'state-based' | 'non-state' | 'one-sided';

export interface UcdpGeoEvent {
  id: string;
  date_start: string;
  date_end: string;
  latitude: number;
  longitude: number;
  country: string;
  side_a: string;
  side_b: string;
  deaths_best: number;
  deaths_low: number;
  deaths_high: number;
  type_of_violence: UcdpEventType;
  source_original: string;
}


export interface CountryPopulation {
  code: string;
  name: string;
  population: number;
  densityPerKm2: number;
}

export interface PopulationExposure {
  eventId: string;
  eventName: string;
  eventType: string;
  lat: number;
  lon: number;
  exposedPopulation: number;
  exposureRadiusKm: number;
}


export type MilitaryBaseType =
  | 'us-nato'
  | 'china'
  | 'russia'
  | 'uk'
  | 'france'
  | 'india'
  | 'italy'
  | 'uae'
  | 'turkey'
  | 'japan'
  | 'other';

export interface MilitaryBase {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: MilitaryBaseType;
  description?: string;
  country?: string;
  arm?: string;
  status?: 'active' | 'planned' | 'controversial' | 'closed';
  source?: string;
}

export interface MilitaryBaseEnriched extends MilitaryBase {
  kind?: string;
  tier?: number;
  catAirforce?: boolean;
  catNaval?: boolean;
  catNuclear?: boolean;
  catSpace?: boolean;
  catTraining?: boolean;
}

export interface CableLandingPoint {
  country: string;
  countryName: string;
  city?: string;
  lat: number;
  lon: number;
}

export interface CountryCapacity {
  country: string;
  capacityShare: number;
  isRedundant: boolean;
}

export interface UnderseaCable {
  id: string;
  name: string;
  points: [number, number][];
  major?: boolean;

  landingPoints?: CableLandingPoint[];
  countriesServed?: CountryCapacity[];
  capacityTbps?: number;
  rfsYear?: number;
  owners?: string[];
}

export type CableAdvisorySeverity = 'fault' | 'degraded';

export interface CableAdvisory {
  id: string;
  cableId: string;
  title: string;
  severity: CableAdvisorySeverity;
  description: string;
  reported: Date;
  lat: number;
  lon: number;
  impact: string;
  repairEta?: string;
}

export type RepairShipStatus = 'enroute' | 'on-station';

export interface RepairShip {
  id: string;
  name: string;
  cableId: string;
  status: RepairShipStatus;
  lat: number;
  lon: number;
  eta: string;
  operator?: string;
  note?: string;
}


export type CableHealthStatus = 'ok' | 'degraded' | 'fault' | 'unknown';

export interface CableHealthEvidence {
  source: string;
  summary: string;
  ts: string;
}

export interface CableHealthRecord {
  status: CableHealthStatus;
  score: number;
  confidence: number;
  lastUpdated: string;
  evidence: CableHealthEvidence[];
}

export interface CableHealthResponse {
  generatedAt: string;
  cables: Record<string, CableHealthRecord>;
}

export interface ShippingChokepoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  desc: string;
}

export interface CyberRegion {
  id: string;
  group: string;
  aka: string;
  sponsor: string;
}


export type NuclearFacilityType =
  | 'plant'
  | 'enrichment'
  | 'reprocessing'
  | 'weapons'
  | 'ssbn'
  | 'test-site'
  | 'icbm'
  | 'research';

export interface NuclearFacility {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: NuclearFacilityType;
  status: 'active' | 'contested' | 'inactive' | 'decommissioned' | 'construction';
  operator?: string;
}

export interface GammaIrradiator {
  id: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  organization?: string;
}

export type PipelineType = 'oil' | 'gas' | 'products';
export type PipelineStatus = 'operating' | 'construction';

export interface PipelineTerminal {
  country: string;
  name?: string;
  portId?: string;
  lat?: number;
  lon?: number;
}

export interface Pipeline {
  id: string;
  name: string;
  type: PipelineType;
  status: PipelineStatus;
  points: [number, number][];
  capacity?: string;
  length?: string;
  operator?: string;
  countries?: string[];

  origin?: PipelineTerminal;
  destination?: PipelineTerminal;
  transitCountries?: string[];
  capacityMbpd?: number;
  capacityBcmY?: number;
  alternatives?: string[];
}

export interface Earthquake {
  id: string;
  place: string;
  magnitude: number;
  lat: number;
  lon: number;
  depth: number;
  time: Date;
  url: string;
}

export interface Monitor {
  id: string;
  keywords: string[];
  color: string;
  name?: string;
  lat?: number;
  lon?: number;
}

export interface PanelConfig {
  name: string;
  enabled: boolean;
  priority?: number;
  premium?: 'locked' | 'enhanced';
}

export interface MapLayers {
  conflicts: boolean;
  bases: boolean;
  cables: boolean;
  pipelines: boolean;
  hotspots: boolean;
  ais: boolean;
  nuclear: boolean;
  irradiators: boolean;
  radiationWatch?: boolean;
  sanctions: boolean;
  weather: boolean;
  economic: boolean;
  waterways: boolean;
  outages: boolean;
  cyberThreats: boolean;
  datacenters: boolean;
  protests: boolean;
  flights: boolean;
  military: boolean;
  natural: boolean;
  spaceports: boolean;
  minerals: boolean;
  fires: boolean;

  ucdpEvents: boolean;
  displacement: boolean;
  climate: boolean;

  startupHubs: boolean;
  cloudRegions: boolean;
  accelerators: boolean;
  techHQs: boolean;
  techEvents: boolean;

  stockExchanges: boolean;
  financialCenters: boolean;
  centralBanks: boolean;
  commodityHubs: boolean;

  gulfInvestments: boolean;

  positiveEvents: boolean;
  kindness: boolean;
  happiness: boolean;
  speciesRecovery: boolean;
  renewableInstallations: boolean;

  tradeRoutes: boolean;

  iranAttacks: boolean;

  gpsJamming: boolean;

  satellites: boolean;


  ciiChoropleth: boolean;

  resilienceScore: boolean;

  dayNight: boolean;

  miningSites: boolean;
  processingPlants: boolean;
  commodityPorts: boolean;
  webcams: boolean;

  diseaseOutbreaks: boolean;


  storageFacilities?: boolean;
  fuelShortages?: boolean;

  liveTankers?: boolean;
}

export interface AIDataCenter {
  id: string;
  name: string;
  owner: string;
  country: string;
  lat: number;
  lon: number;
  status: 'existing' | 'planned' | 'decommissioned';
  chipType: string;
  chipCount: number;
  powerMW?: number;
  h100Equivalent?: number;
  sector?: string;
  note?: string;
}

export interface InternetOutage {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: Date;
  country: string;
  region?: string;
  lat: number;
  lon: number;
  severity: 'partial' | 'major' | 'total';
  categories: string[];
  cause?: string;
  outageType?: string;
  endDate?: Date;
}

export type EconomicCenterType = 'exchange' | 'central-bank' | 'financial-hub';

export interface EconomicCenter {
  id: string;
  name: string;
  type: EconomicCenterType;
  lat: number;
  lon: number;
  country: string;
  marketHours?: { open: string; close: string; timezone: string };
  description?: string;
}

export interface Spaceport {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
  operator: string;
  status: 'active' | 'construction' | 'inactive';
  launches: 'High' | 'Medium' | 'Low';
}

export interface CriticalMineralProject {
  id: string;
  name: string;
  lat: number;
  lon: number;
  mineral: string;
  country: string;
  operator: string;
  status: 'producing' | 'development' | 'exploration';
  significance: string;
}

export interface AppState {
  currentView: 'global' | 'us';
  mapZoom: number;
  mapPan: { x: number; y: number };
  mapLayers: MapLayers;
  panels: Record<string, PanelConfig>;
  monitors: Monitor[];
  allNews: NewsItem[];
  isLoading: boolean;
}

export type FeedCategory = 'politics' | 'tech' | 'finance' | 'gov' | 'intel';


export type ProtestSeverity = 'low' | 'medium' | 'high';
export type ProtestSource = 'acled' | 'gdelt' | 'rss';
export type ProtestEventType = 'protest' | 'riot' | 'strike' | 'demonstration' | 'civil_unrest';

export interface SocialUnrestEvent {
  id: string;
  title: string;
  summary?: string;
  eventType: ProtestEventType;
  city?: string;
  country: string;
  region?: string;
  lat: number;
  lon: number;
  time: Date;
  severity: ProtestSeverity;
  fatalities?: number;
  sources: string[];
  sourceUrls?: string[];
  sourceType: ProtestSource;
  tags?: string[];
  actors?: string[];
  relatedHotspots?: string[];
  confidence: 'high' | 'medium' | 'low';
  validated: boolean;
  imageUrl?: string;
  sentiment?: 'angry' | 'peaceful' | 'mixed';
}

export interface ProtestCluster {
  id: string;
  country: string;
  region?: string;
  eventCount: number;
  events: SocialUnrestEvent[];
  severity: ProtestSeverity;
  startDate: Date;
  endDate: Date;
  primaryCause?: string;
}

export interface MonitoredAirport {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  region: 'americas' | 'europe' | 'apac' | 'mena' | 'africa';
}


export type MilitaryAircraftType =
  | 'fighter'
  | 'bomber'
  | 'transport'
  | 'tanker'
  | 'awacs'
  | 'reconnaissance'
  | 'helicopter'
  | 'drone'
  | 'patrol'
  | 'special_ops'
  | 'vip'
  | 'unknown';

export type MilitaryOperator =
  | 'usaf'
  | 'usn'
  | 'usmc'
  | 'usa'
  | 'raf'
  | 'rn'
  | 'faf'
  | 'gaf'
  | 'plaaf'
  | 'plan'
  | 'vks'
  | 'iaf'
  | 'nato'
  | 'other';

export interface MilitaryFlight {
  id: string;
  callsign: string;
  hexCode: string;
  registration?: string;
  aircraftType: MilitaryAircraftType;
  aircraftModel?: string;
  operator: MilitaryOperator;
  operatorCountry: string;
  lat: number;
  lon: number;
  altitude: number;
  heading: number;
  speed: number;
  verticalRate?: number;
  onGround: boolean;
  squawk?: string;
  origin?: string;
  destination?: string;
  lastSeen: Date;
  firstSeen?: Date;
  track?: [number, number][];
  confidence: 'high' | 'medium' | 'low';
  isInteresting?: boolean;
  note?: string;

  enriched?: {
    manufacturer?: string;
    owner?: string;
    operatorName?: string;
    typeCode?: string;
    builtYear?: string;
    confirmedMilitary?: boolean;
    militaryBranch?: string;
  };
}

export interface MilitaryFlightCluster {
  id: string;
  name: string;
  lat: number;
  lon: number;
  flightCount: number;
  flights: MilitaryFlight[];
  dominantOperator?: MilitaryOperator;
  activityType?: 'exercise' | 'patrol' | 'transport' | 'unknown';
}


export type MilitaryVesselType =
  | 'carrier'
  | 'destroyer'
  | 'frigate'
  | 'submarine'
  | 'amphibious'
  | 'patrol'
  | 'auxiliary'
  | 'research'
  | 'icebreaker'
  | 'special'
  | 'unknown';

export interface MilitaryVessel {
  id: string;
  mmsi: string;
  name: string;
  vesselType: MilitaryVesselType;
  aisShipType?: string;
  hullNumber?: string;
  operator: MilitaryOperator | 'other';
  operatorCountry: string;
  lat: number;
  lon: number;
  heading: number;
  speed: number;
  course?: number;
  destination?: string;
  lastAisUpdate: Date;
  aisGapMinutes?: number;
  isDark?: boolean;
  nearChokepoint?: string;
  nearBase?: string;
  track?: [number, number][];
  confidence: 'high' | 'medium' | 'low';
  isInteresting?: boolean;
  note?: string;
  usniRegion?: string;
  usniDeploymentStatus?: USNIDeploymentStatus;
  usniHomePort?: string;
  usniStrikeGroup?: string;
  usniActivityDescription?: string;
  usniArticleUrl?: string;
  usniArticleDate?: string;
  usniSource?: boolean;
}

export type USNIDeploymentStatus = 'deployed' | 'underway' | 'in-port' | 'unknown';

export interface USNIVesselEntry {
  name: string;
  hullNumber: string;
  vesselType: MilitaryVesselType;
  region: string;
  regionLat: number;
  regionLon: number;
  deploymentStatus: USNIDeploymentStatus;
  homePort?: string;
  strikeGroup?: string;
  activityDescription?: string;
  usniArticleUrl: string;
  usniArticleDate: string;
}

export interface USNIStrikeGroup {
  name: string;
  carrier?: string;
  airWing?: string;
  destroyerSquadron?: string;
  escorts: string[];
}

export interface USNIFleetReport {
  articleUrl: string;
  articleDate: string;
  articleTitle: string;
  battleForceSummary?: {
    totalShips: number;
    deployed: number;
    underway: number;
  };
  vessels: USNIVesselEntry[];
  strikeGroups: USNIStrikeGroup[];
  regions: string[];
  parsingWarnings: string[];
  timestamp: string;
}

export interface MilitaryVesselCluster {
  id: string;
  name: string;
  lat: number;
  lon: number;
  vesselCount: number;
  vessels: MilitaryVessel[];
  region?: string;
  activityType?: 'exercise' | 'deployment' | 'transit' | 'unknown';
}


export interface MilitaryActivitySummary {
  flights: MilitaryFlight[];
  vessels: MilitaryVessel[];
  flightClusters: MilitaryFlightCluster[];
  vesselClusters: MilitaryVesselCluster[];
  activeOperations: number;
  lastUpdate: Date;
}


export type PizzIntDefconLevel = 1 | 2 | 3 | 4 | 5;
export type PizzIntDataFreshness = 'fresh' | 'stale';

export interface PizzIntLocation {
  place_id: string;
  name: string;
  address: string;
  current_popularity: number;
  percentage_of_usual: number | null;
  is_spike: boolean;
  spike_magnitude: number | null;
  data_source: string;
  recorded_at: string;
  data_freshness: PizzIntDataFreshness;
  is_closed_now: boolean;
  lat?: number;
  lng?: number;
  distance_miles?: number;
}

export interface PizzIntStatus {
  defconLevel: PizzIntDefconLevel;
  defconLabel: string;
  aggregateActivity: number;
  activeSpikes: number;
  locationsMonitored: number;
  locationsOpen: number;
  lastUpdate: Date;
  dataFreshness: PizzIntDataFreshness;
  locations: PizzIntLocation[];
}


export interface GdeltTensionPair {
  id: string;
  countries: [string, string];
  label: string;
  score: number;
  trend: 'rising' | 'stable' | 'falling';
  changePercent: number;
  region: string;
}


export type NaturalEventCategory =
  | 'severeStorms'
  | 'wildfires'
  | 'volcanoes'
  | 'earthquakes'
  | 'floods'
  | 'landslides'
  | 'drought'
  | 'dustHaze'
  | 'snow'
  | 'tempExtremes'
  | 'seaLakeIce'
  | 'waterColor'
  | 'manmade';

export const NATURAL_EVENT_CATEGORIES: ReadonlySet<NaturalEventCategory> = new Set<NaturalEventCategory>([
  'severeStorms', 'wildfires', 'volcanoes', 'earthquakes', 'floods', 'landslides',
  'drought', 'dustHaze', 'snow', 'tempExtremes', 'seaLakeIce', 'waterColor', 'manmade',
]);

export interface ForecastPoint {
  lat: number;
  lon: number;
  hour: number;
  windKt: number;
  category: number;
}

export interface PastTrackPoint {
  lat: number;
  lon: number;
  windKt: number;
  timestamp: number;
}

export interface NaturalEvent {
  id: string;
  title: string;
  description?: string;
  category: NaturalEventCategory;
  categoryTitle: string;
  lat: number;
  lon: number;
  date: Date;
  magnitude?: number;
  magnitudeUnit?: string;
  sourceUrl?: string;
  sourceName?: string;
  closed: boolean;
  stormId?: string;
  stormName?: string;
  basin?: string;
  stormCategory?: number;
  classification?: string;
  windKt?: number;
  pressureMb?: number;
  movementDir?: number;
  movementSpeedKt?: number;
  forecastTrack?: ForecastPoint[];
  conePolygon?: number[][][];
  pastTrack?: PastTrackPoint[];
}


export type InfrastructureNodeType = 'cable' | 'pipeline' | 'port' | 'chokepoint' | 'country' | 'route';

export interface InfrastructureNode {
  id: string;
  type: InfrastructureNodeType;
  name: string;
  coordinates?: [number, number];
  metadata?: Record<string, unknown>;
}

export type DependencyType =
  | 'serves'
  | 'terminates_at'
  | 'transits_through'
  | 'lands_at'
  | 'depends_on'
  | 'shares_risk'
  | 'alternative_to'
  | 'trade_route'
  | 'controls_access'
  | 'trade_dependency';

export interface DependencyEdge {
  from: string;
  to: string;
  type: DependencyType;
  strength: number;
  redundancy?: number;
  metadata?: {
    capacityShare?: number;
    alternativeRoutes?: number;
    estimatedImpact?: string;
    portType?: string;
    relationship?: string;
  };
}

export type CascadeImpactLevel = 'critical' | 'high' | 'medium' | 'low';

export interface CascadeAffectedNode {
  node: InfrastructureNode;
  impactLevel: CascadeImpactLevel;
  pathLength: number;
  dependencyChain: string[];
  redundancyAvailable: boolean;
  estimatedRecovery?: string;
}

export interface CascadeCountryImpact {
  country: string;
  countryName: string;
  impactLevel: CascadeImpactLevel;
  affectedCapacity: number;
  criticalSectors?: string[];
}

export interface CascadeResult {
  source: InfrastructureNode;
  affectedNodes: CascadeAffectedNode[];
  countriesAffected: CascadeCountryImpact[];
  economicImpact?: {
    dailyTradeLoss?: number;
    affectedThroughput?: number;
  };
  redundancies?: {
    id: string;
    name: string;
    capacityShare: number;
  }[];
}

export type PortType = 'container' | 'oil' | 'lng' | 'naval' | 'mixed' | 'bulk';

export interface Port {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
  type: PortType;
  rank?: number;
  note: string;
}


export type RegulationType = 'comprehensive' | 'sectoral' | 'voluntary' | 'proposed';
export type ComplianceStatus = 'active' | 'proposed' | 'draft' | 'superseded';
export type RegulationStance = 'strict' | 'moderate' | 'permissive' | 'undefined';

export interface AIRegulation {
  id: string;
  name: string;
  shortName: string;
  country: string;
  region?: string;
  type: RegulationType;
  status: ComplianceStatus;
  announcedDate: string;
  effectiveDate?: string;
  complianceDeadline?: string;
  scope: string[];
  keyProvisions: string[];
  penalties?: string;
  link?: string;
  description?: string;
}

export interface RegulatoryAction {
  id: string;
  date: string;
  country: string;
  title: string;
  type: 'law-passed' | 'executive-order' | 'guideline' | 'enforcement' | 'consultation';
  regulationId?: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  source?: string;
}

export interface CountryRegulationProfile {
  country: string;
  countryCode: string;
  stance: RegulationStance;
  activeRegulations: string[];
  proposedRegulations: string[];
  lastUpdated: string;
  summary: string;
}


export interface TechCompany {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
  city?: string;
  sector?: string;
  officeType?: 'headquarters' | 'regional' | 'engineering' | 'research' | 'campus' | 'major office';
  employees?: number;
  foundedYear?: number;
  keyProducts?: string[];
  valuation?: number;
  stockSymbol?: string;
  description?: string;
}

export interface AIResearchLab {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
  city?: string;
  type: 'corporate' | 'academic' | 'government' | 'nonprofit' | 'industry' | 'research institute';
  parent?: string;
  focusAreas?: string[];
  description?: string;
  foundedYear?: number;
  notableWork?: string[];
  publications?: number;
  faculty?: number;
}

export interface StartupEcosystem {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
  city: string;
  ecosystemTier?: 'tier1' | 'tier2' | 'tier3' | 'emerging';
  totalFunding2024?: number;
  activeStartups?: number;
  unicorns?: number;
  topSectors?: string[];
  majorVCs?: string[];
  notableStartups?: string[];
  avgSeedRound?: number;
  avgSeriesA?: number;
  description?: string;
}





export type FocalPointUrgency = 'watch' | 'elevated' | 'critical';

export interface HeadlineWithUrl {
  title: string;
  url: string;
}

export interface EntityMention {
  entityId: string;
  entityType: 'country' | 'company' | 'index' | 'commodity' | 'crypto' | 'sector';
  displayName: string;
  mentionCount: number;
  avgConfidence: number;
  clusterIds: string[];
  topHeadlines: HeadlineWithUrl[];
}

export interface FocalPoint {
  id: string;
  entityId: string;
  entityType: 'country' | 'company' | 'index' | 'commodity' | 'crypto' | 'sector';
  displayName: string;


  newsMentions: number;
  newsVelocity: number;
  topHeadlines: HeadlineWithUrl[];


  signalTypes: string[];
  signalCount: number;
  highSeverityCount: number;
  signalDescriptions: string[];


  focalScore: number;
  urgency: FocalPointUrgency;


  narrative: string;
  correlationEvidence: string[];
}

export interface FocalPointSummary {
  timestamp: Date;
  focalPoints: FocalPoint[];
  aiContext: string;
  topCountries: FocalPoint[];
  topCompanies: FocalPoint[];
}





export type GulfInvestorCountry = 'SA' | 'UAE';

export type GulfInvestmentSector =
  | 'ports'
  | 'pipelines'
  | 'energy'
  | 'datacenters'
  | 'airports'
  | 'railways'
  | 'telecoms'
  | 'water'
  | 'logistics'
  | 'mining'
  | 'real-estate'
  | 'manufacturing';

export type GulfInvestmentStatus =
  | 'operational'
  | 'under-construction'
  | 'announced'
  | 'rumoured'
  | 'cancelled'
  | 'divested';

export type GulfInvestingEntity =
  | 'DP World'
  | 'AD Ports'
  | 'Mubadala'
  | 'ADIA'
  | 'ADNOC'
  | 'Masdar'
  | 'PIF'
  | 'Saudi Aramco'
  | 'ACWA Power'
  | 'STC'
  | 'Mawani'
  | 'NEOM'
  | 'Emirates Global Aluminium'
  | 'Other';

export interface GulfInvestment {
  id: string;
  investingEntity: GulfInvestingEntity;
  investingCountry: GulfInvestorCountry;
  targetCountry: string;
  targetCountryIso: string;
  sector: GulfInvestmentSector;
  assetType: string;
  assetName: string;
  lat: number;
  lon: number;
  investmentUSD?: number;
  stakePercent?: number;
  status: GulfInvestmentStatus;
  yearAnnounced?: number;
  yearOperational?: number;
  description: string;
  sourceUrl?: string;
  tags?: string[];
}

export interface MapProtestCluster {
  id: string;
  _clusterId?: number;
  lat: number;
  lon: number;
  count: number;
  items: SocialUnrestEvent[];
  country: string;
  maxSeverity: 'low' | 'medium' | 'high';
  hasRiot: boolean;
  latestRiotEventTimeMs?: number;
  totalFatalities: number;
  riotCount?: number;
  highSeverityCount?: number;
  verifiedCount?: number;
  sampled?: boolean;
}

export interface MapTechHQCluster {
  id: string;
  _clusterId?: number;
  lat: number;
  lon: number;
  count: number;
  items: TechHQ[];
  city: string;
  country: string;
  primaryType: 'faang' | 'unicorn' | 'public';
  faangCount?: number;
  unicornCount?: number;
  publicCount?: number;
  sampled?: boolean;
}

export interface MapTechEventCluster {
  id: string;
  _clusterId?: number;
  lat: number;
  lon: number;
  count: number;
  items: Array<{ id: string; title: string; location: string; lat: number; lng: number; country: string; startDate: string; endDate: string; url: string | null; daysUntil: number }>;
  location: string;
  country: string;
  soonestDaysUntil: number;
  soonCount?: number;
  sampled?: boolean;
}

export interface MapDatacenterCluster {
  id: string;
  _clusterId?: number;
  lat: number;
  lon: number;
  count: number;
  items: AIDataCenter[];
  region: string;
  country: string;
  totalChips: number;
  totalPowerMW: number;
  majorityExisting: boolean;
  existingCount?: number;
  plannedCount?: number;
  sampled?: boolean;
}

export interface CountryBriefSignals {
  criticalNews: number;
  protests: number;
  militaryFlights: number;
  militaryVessels: number;
  militaryFlightsInCountry: number;
  militaryVesselsInCountry: number;
  outages: number;
  aisDisruptions: number;
  satelliteFires: number;
  radiationAnomalies: number;
  temporalAnomalies: number;
  cyberThreats: number;
  earthquakes: number;
  displacementOutflow: number;
  climateStress: number;
  conflictEvents: number;
  activeStrikes: number;
  orefSirens: number;
  orefHistory24h: number;
  aviationDisruptions: number;
  travelAdvisories: number;
  travelAdvisoryMaxLevel: string | null;
  gpsJammingHexes: number;
  isTier1: boolean;
  thermalEscalations: number;
  sanctionsDesignations: number;
  sanctionsNewDesignations: number;
}
