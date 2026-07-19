# Akashic

[![Akashic Demo](https://github.com/user-attachments/assets/d3065938-0475-4131-b199-2f7546ded0c2)](https://www.youtube.com/watch?v=qsWHhuIwR8c)

<p align="center">
  <strong>Live public-source geospatial intelligence in one operational workspace requiring NO API keys.</strong>
</p>

<p align="center">
  <img alt="next.js 15" src="https://img.shields.io/badge/next.js-15.5.20-111111?style=flat-square&logo=nextdotjs">
  <img alt="typescript" src="https://img.shields.io/badge/typescript-5-3178c6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="deck.gl" src="https://img.shields.io/badge/deck.gl-live_map-ea4335?style=flat-square">
  <img alt="no api keys" src="https://img.shields.io/badge/api_keys-none_required-20b486?style=flat-square">
  <img alt="agpl v3" src="https://img.shields.io/badge/license-agpl_v3-663399?style=flat-square">
</p>

  [![Discord](https://img.shields.io/discord/1300368230320697404?label=Discord)](https://discord.gg/P7HaRayqTh)

Akashic is a self-hosted intelligence workspace that brings aircraft, satellites, earthquakes, weather, public radio, infrastructure, country intelligence, public cameras, and open-source reconnaissance onto a single interactive map.

it is built for exploration and correlation, not passive dashboard watching. layers can be combined, entities can be inspected in place, and the intelligence deck keeps live events and strategic context visible without replacing the map.

> [!important]
> Akashic consumes public and third-party data that can be delayed, incomplete, inaccurate, unavailable, or subject to separate terms. it is not an authoritative source and must not be used as the sole basis for safety, navigation, emergency, military, legal, or financial decisions.

## why Akashic

- one map for live and strategic geospatial data
- key-free default setup with no required `.env` values
- flat map, globe, satellite, terrain, street, night, weather, and photorealistic views
- dense entity details instead of shallow map markers
- streamed username and email reconnaissance with structured findings
- live public radio discovery with station metadata and resilient playback
- country, city, building, airport, aircraft, satellite, seismic, and camera inspection
- an intelligence deck for events, indicators, infrastructure, markets, and regional context
- server-side upstream adapters that keep browser integrations small

## Workspace

| surface               | capability                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| global air traffic    | live ads-b aircraft, military/private filters, trails, telemetry, airports, and selected-flight tracking                   |
| orbital layer         | celestrak tle ingestion, satellite categories, orbital positions, and selected-object details                              |
| seismic layer         | global usgs events with magnitude, depth, recency, and location context                                                    |
| weather map           | atmospheric fields, wind particles, precipitation, radar, temperature, humidity, and pressure                              |
| disaster layer        | gdacs alerts and related natural-event context                                                                             |
| air quality           | open-meteo pollution sampling across mapped cities                                                                         |
| radio layer           | radio garden and radio-browser catalogs, station intelligence, now-playing metadata, and live audio                        |
| recon mode            | concurrent username or email checks, streamed fetch logs, structured entities, profile images, and mapped locations        |
| geo-intelligence      | strategic cities, conflict zones, bases, cables, pipelines, nuclear facilities, chokepoints, sanctions, and related layers |
| building intelligence | openstreetmap geometry and tags, wikidata enrichment, public imagery, and optional architecture details                    |
| intelligence deck     | live news, country context, risk indicators, infrastructure, events, and investigation views                               |

## Map Experience

Akashic keeps the map as the primary interface. the surrounding controls expose:

- independent data-layer switches with live counts and source state
- standard, crt, night-vision, thermal, radar, satcom, and noir treatments
- aerial, satellite, street, light, dark, topographic, national geographic, night-lights, hybrid, and 3d imagery modes
- map and globe projection switching
- entity search, camera controls, zoom, coordinate readout, scale, and camera altitude
- draggable detail surfaces that preserve spatial context

## Intelligence layers

the Geo-Intelligence workspace combines live upstreams with curated or derived strategic registries. representative coverage includes:

- conflicts, unrest, displacement, sanctions, and military activity
- airports, aircraft, satellites, spaceports, and gps interference
- ports, shipping lanes, waterways, chokepoints, cables, and pipelines
- nuclear facilities, radiation, thermal anomalies, and seismic activity
- internet infrastructure, air quality, health, weather, and natural hazards
- markets, trade, consumer prices, economic centers, and infrastructure pressure
- public news, live streams, country summaries, and positive events

each layer should be interpreted according to its source label. a rendered point is not automatically a verified live incident.

## Recon mode

Recon mode performs a concurrent public-profile sweep using the source definitions in `data/recon-sources/`.

- checks are streamed into the ui as each request finishes
- found, missing, blocked, timeout, and error states remain distinct
- common block pages and false-positive responses are rejected
- metadata is normalized into titles, bios, profile images, links, and location hints
- favicons provide source identity without maintaining a separate logo bundle
- email sources can use a browser fallback when a normal request times out
- extracted locations can be geocoded and plotted on the map

> [!warning]
> only investigate identifiers you are legally authorized to process. requests are sent to third-party services and may be logged by those services. respect privacy law, site terms, rate limits, and consent requirements.

## Live radio

the radio layer merges two complementary catalogs:

- radio garden supplies place and channel context
- radio-browser supplies broad station coverage, codecs, bitrates, tags, votes, and health signals

playback uses a guarded server proxy first, retries transient dns and redirect failures, then falls back to the resolved media url when the browser can connect directly. now-playing metadata is probed separately so icy metadata bytes never corrupt the audio stream.

## Quick start

### Requirements

- node.js 20 or newer
- npm 10 or newer
- a modern browser with webgl enabled
- network access to the public upstreams used by enabled layers

### Install and run

```bash
git clone https://github.com/nullure/Akashic.git
cd Akashic
npm install
npm run dev
```

open [http://localhost:3000](http://localhost:3000).

NO API key or environment variable is required by the current application. ignored `.env` files remain available for local extensions.

### Production

```bash
npm run build
npm run start
```

### Verification

```bash
npx tsc --noEmit
npm audit
```

## Architecture

```mermaid
flowchart lr
    src[public upstreams] --> api[next.js route adapters]
    reg[curated registries] --> api
    api --> norm[normalization and enrichment]
    norm --> map[deck.gl and maplibre map]
    norm --> deck[intelligence deck]
    norm --> detail[entity detail surfaces]
    recon[recon source registry] --> stream[streaming recon worker]
    stream --> map
    stream --> detail
```

### Repository Layout

```text
app/
  api/                    server-side source adapters and intelligence endpoints
  page.tsx                primary workspace composition and interaction state
components/
  intelligence/           recon, country, risk, and investigation surfaces
  layout/                 navigation, layer controls, and intelligence decks
  map/                    map engine, weather controls, styles, and overlays
  sidebars/               entity-specific intelligence views
data/
  recon-sources/          public username and email source definitions
lib/
  geo-intelligence/       correlation, scoring, ingestion, and feed normalization
  live/                   aircraft, camera, and city signal adapters
  net/                    guarded public-network fetch utilities
  recon/                  concurrent recon engine and result normalization
  worldmonitor/           strategic geographic registries
public/                   static geographic datasets and browser assets
```

### API Groups

| group                                          | purpose                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| `/api/radar`, `/api/aircraft`, `/api/airports` | aircraft and airport intelligence                                   |
| `/api/celestrak`                               | orbital element ingestion                                           |
| `/api/usgs`, `/api/gdacs`, `/api/air-quality`  | hazard and environmental feeds                                      |
| `/api/weather`, `/api/wind`                    | weather fields and radar products                                   |
| `/api/radio/*`                                 | station catalogs, metadata, and guarded audio proxying              |
| `/api/recon/*`                                 | streamed public-profile checks and geocoding                        |
| `/api/city*`, `/api/countries/*`               | city and country enrichment                                         |
| `/api/wm/*`                                    | strategic layers, infrastructure, events, and building intelligence |
| `/api/analytics/*`, `/api/spatial/*`           | correlations, risk, proximity, and trajectory analysis              |

## Source Model

Akashic does not own its upstream data. representative providers and registries include:

| source                                   | use                                         |
| ---------------------------------------- | ------------------------------------------- |
| celestrak                                | public orbital element sets                 |
| usgs                                     | earthquake events                           |
| gdacs                                    | global disaster alerts                      |
| open-meteo                               | weather and air-quality fields              |
| rainviewer                               | radar imagery                               |
| radio garden and radio-browser           | station discovery and stream metadata       |
| openstreetmap and overpass               | buildings, places, and geographic structure |
| wikidata and wikimedia                   | entity facts and public media               |
| archdaily                                | optional architecture-page enrichment       |
| esri, carto, nasa, and open map services | basemaps and visual context                 |

upstream availability and usage rights can change. operators are responsible for reviewing each provider's current terms, attribution rules, caching limits, and redistribution conditions before public deployment.

## security

- secrets and local environment files are ignored
- radio urls are limited to public `http` and `https` targets
- private, loopback, link-local, and internal dns results are blocked
- every server-side radio redirect is revalidated
- architecture deep scans are restricted to approved public hosts
- recon requests are generated from repository-controlled source definitions
- production dependencies are audited with `npm audit`

public deployment still requires normal perimeter controls such as rate limiting, request-size limits, observability, abuse handling, and a reverse proxy appropriate to the deployment environment.

## Data and Performance

some static geographic datasets are intentionally committed because the browser or server reads them at runtime. large transient exports, build output, local caches, ai working memory, browser artifacts, and dependency directories are ignored.

live layers load independently. enabling every layer at once increases network traffic, map memory, and upstream pressure; use the layer controls to keep the workspace scoped to the investigation.

## limitations

- public feeds can disappear, rate-limit, redirect, or change schema without notice
- radio stations can be offline even when a directory reports them as healthy
- satellite and aircraft positions are estimates between source updates
- 3d coverage depends on the selected provider and location
- building details vary sharply by open-data coverage
- recon results can contain false positives and require human verification
- curated strategic registries are context, not proof of current activity
- the current lint baseline contains legacy findings even though type checking and production builds pass

## contributing

1. keep integrations key-free when a reliable public source exists
2. preserve source attribution and terms metadata
3. distinguish live, cached, curated, simulated, and derived records in the ui
4. normalize upstream data at the server boundary
5. add focused verification for shared parsers, scoring, and source adapters
6. run `npx tsc --noEmit`, `npm audit`, and `npm run build` before opening a change

## responsible use

Akashic is intended for lawful research, journalism, education, situational awareness, and development with public data. do not use it to harass, stalk, discriminate, bypass access controls, invade privacy, or target individuals or infrastructure.

## license and attribution

Akashic is distributed under the [gnu affero general public license version 3 or later](LICENSE).

Parts of the strategic layer model, geographic registries, and related implementation were adapted from [world monitor](https://github.com/koala73/worldmonitor), copyright 2024-2026 elie habib, also licensed under the gnu affero general public license. the original copyright and license notice are retained in [license](LICENSE).

third-party datasets, map tiles, feeds, and media remain subject to their respective licenses and terms.
