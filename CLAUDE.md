# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Campus Navigator is a Google Maps-powered campus navigation web application built with React 18, TypeScript, and Tailwind CSS. The app provides interactive campus mapping, building search, route planning, and location-based features. It uses a hybrid data approach: Google Maps POI data for buildings and a web scraper for campus events.

## Development Commands

### Core Commands
```bash
# Start development server (runs on http://localhost:8080)
npm run dev

# Build for production
npm run build

# Build in development mode (for debugging)
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm preview

# Manually scrape campus events
npm run scrape:events
```

### Environment Setup
- Create `.env.local` file with required Google Maps API key:
  ```
  VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
  VITE_GOOGLE_MAPS_MAP_ID=your_map_id_here  # Optional
  ```
- Google Maps APIs required: Maps JavaScript API, Places API, Directions API, Advanced Markers API
- Default campus location configured in `src/lib/mapsClient.ts:26` (currently set to coordinates 32.7311, -97.1151)

### Events Scraper
- **Automatic execution**: Runs before `dev`, `build`, and `preview` commands (see `predev`, `prebuild`, `prepreview` scripts)
- **Cadence control**: Set `SCRAPE_EVENTS_FREQUENCY_DAYS` in `.env` (defaults to 3 days)
- **Implementation**: Node.js script at `scripts/scrape-uta-events.js` using native SQLite
- **Output**: Writes to `data/events.json` which backs `/api/events` endpoint
- **Data source**: Scrapes https://events.uta.edu/calendar/day for next 14 days
- **Schema**: Extracts event name, date/time, location, tags, URL, coordinates from HTML and JSON-LD

## Architecture Overview

### State Management Pattern
The app uses **Zustand** for centralized state management (not Context API or Redux). All map-related state lives in a single store:
- **Store location**: `src/lib/mapState.ts`
- **Store hook**: `useMapStore()`
- **State includes**: map center/zoom, showEvents toggle, map instance reference
- **Usage pattern**: Components import `useMapStore` and destructure needed state/actions

### Component Architecture

**Layout**: Single-page application with fixed header and split-pane main content
- Main page: `src/pages/Index.tsx` orchestrates all major components
- Left pane: Full-screen map canvas with floating controls
- Right pane: Tabbed sidebar with Directions and Events panels
- Sidebar uses animated tab indicator (`anime.js` library for smooth transitions)

**Maps Components** (`src/components/maps/`):
- `MapCanvas.tsx`: Base Google Maps renderer (wraps `@react-google-maps/api`)
- `SearchAutocomplete.tsx`: Places API autocomplete search (used in DirectionsPanel)
- `DirectionsPanel.tsx`: Route planning UI with travel mode selection and step-by-step directions
- `BuildingMarkers.tsx`: Handles clicks on Google Maps POI markers, shows InfoWindow with place details
- `BuildingFootprints.tsx`: Renders building polygons from `uta-buildings.ts` data
- `GeolocateButton.tsx`: User location centering control
- `LayersToggle.tsx`: Toggle visibility of buildings/events layers
- `CampusMask.tsx`: Visual mask to highlight campus area
- `CampusBoundary.tsx`: Renders campus boundary polygon

**Panels Components** (`src/components/panels/`):
- `EventsPanel.tsx`: Displays campus events with search and filtering (date/location)

**Component Communication**:
- Map components read/write to Zustand store for shared state
- Building selection flows: POI marker click → Places API details → InfoWindow display
- Search selection flows: Place selected → store updates center/zoom → map pans
- Events fetched via React Query hook (`useEvents`) from `/api/events` endpoint

**Google Maps Integration**:
- Uses `@react-google-maps/api` library (NOT vanilla Google Maps SDK)
- Configuration centralized in `src/lib/mapsClient.ts`
- API key loaded from Vite env vars (`import.meta.env.VITE_GOOGLE_MAPS_API_KEY`)
- Required libraries loaded: `['places', 'geometry', 'marker']`
- DirectionsService/DirectionsRenderer components used for routing
- **POI system**: BuildingMarkers component intercepts clicks on Google's native POI markers, uses `place_id` to fetch full details via Places API

### Type System
- Core types defined in `src/lib/types.ts`:
  - `Building`: Campus building with location, metadata (legacy, not currently used)
  - `CampusEvent`: Scheduled events with location/category
  - `RouteResult`, `RouteStep`: Directions API response shapes
  - `TravelMode`: Union type for Google Maps travel modes
  - `MapState`: Shape of Zustand store state
- TypeScript strict mode is RELAXED (`strictNullChecks: false`, `noImplicitAny: false`)
- Use `@/` path alias for `./src/` imports (configured in tsconfig and vite.config)

### Data Layer

**Building Data**:
- **Primary source**: Google Maps POI (Points of Interest) system
- `BuildingMarkers.tsx` listens for clicks on Google's native campus POI markers
- Uses Places API `getDetails()` to fetch building info (name, address, hours)
- Static building footprints defined in `src/data/uta-buildings.ts` for polygon rendering
- No custom backend API for buildings (fully Google Maps-based)

**Events Data**:
- **Source**: Web scraper (`scripts/scrape-uta-events.js`) fetches from https://events.uta.edu
- **Storage**: SQLite database (`data/events.sqlite`) + JSON export (`data/events.json`)
- **API**: Vite dev server middleware serves `/api/events` endpoint (see `vite.config.ts:55-63`)
- **Frontend**: `useEvents` hook (React Query) fetches from `/api/events`
- **Schema**: Events have `id`, `title`, `description`, `start`/`end` dates, `location`, `url`, `tags`, `category`, optional `lat`/`lng`

**React Query**:
- Used for server state management (events data)
- `useEvents` hook configured with 30-minute stale time, no refetch on window focus
- Returns `{ data, isLoading, isError, refetch, isRefetching }`

### UI Component System
- Uses **shadcn/ui** components (not Material-UI or Ant Design)
- Components are in `src/components/ui/` (copied into project, not imported from package)
- Styling: Tailwind CSS with custom design tokens defined in `src/index.css`
- Color system: CSS variables for `--primary` (university blue), `--accent` (campus coral)
- Custom gradient: `bg-gradient-primary` for headers

## Key Implementation Patterns

### Adding New Map Features
1. Add state to Zustand store in `src/lib/mapState.ts` if needed
2. Create component in `src/components/maps/`
3. Import Google Maps types: `google.maps.*` (loaded via `@react-google-maps/api`)
4. Add to `MapCanvas` children or as floating control in `Index.tsx`
5. Connect to store using `useMapStore()` hook

### Working with Google Maps API
- Always check if `google` is defined before using Maps APIs
- Use `@react-google-maps/api` hooks: `useLoadScript`, `useJsApiLoader`
- DirectionsService pattern: Use callback-based API, not promises
- Places API pattern: Use PlacesService with `getDetails()` for POI information
- Marker pattern: Intercept POI clicks via map click listeners, check for `placeId` in event

### Adding New Event Sources
1. Modify `scripts/scrape-uta-events.js` to fetch from new source
2. Ensure data conforms to `RawEvent` interface in `src/hooks/use-events.ts`
3. Update category inference logic in scraper if needed (`inferCategory` function)
4. Events automatically served via `/api/events` endpoint (no backend changes needed)

### Vite Dev Server API
- Custom middleware in `vite.config.ts` serves `/api/events` endpoint
- Reads from `data/events.json` file
- Returns `{ scrapedAt: string, events: RawEvent[] }` shape
- Falls back to empty array if file doesn't exist
- Same middleware used in both dev and preview modes

## Common Customization Tasks

### Change Campus Location
Edit `src/lib/mapsClient.ts:26`:
```typescript
export const DEFAULT_CENTER = { lat: YOUR_LAT, lng: YOUR_LNG };
```
Also update initial state in `src/lib/mapState.ts:12`

### Update Campus Boundaries
Edit `src/lib/mapsClient.ts:31-36` for restriction bounds, or modify `src/data/campusBoundary.ts` for visual boundary polygon

### Customize Building Footprints
Edit `src/data/uta-buildings.ts` to add/remove building polygons. Each building needs:
- `placeId`: Google Maps place ID
- `buildingName`: Display name
- `coordinates`: Array of `{lat, lng}` points forming polygon

### Customize Events Scraper
Edit `scripts/scrape-uta-events.js`:
- `BASE_URL`: Change event source URL
- `DAYS_TO_FETCH`: Adjust how far ahead to scrape (default: 14 days)
- `parseEvent()`: Modify HTML parsing logic for different source format
- `inferCategory()`: Add/change category detection rules

### Customize Colors/Branding
Edit CSS variables in `src/index.css`:
- `--primary`: Main brand color (affects buttons, links, markers)
- `--accent`: Secondary color (CTAs, highlights)
- `--gradient-primary`: Header gradient colors

## Tech Stack Dependencies

**Core**: React 18.3, TypeScript 5.8, Vite 5.4
**Maps**: @react-google-maps/api 2.20
**State**: Zustand 5.0 (global state), @tanstack/react-query 5.83 (server state)
**UI**: shadcn/ui (Radix UI primitives) + Tailwind CSS 3.4
**Forms**: react-hook-form + zod (not used extensively yet)
**Routing**: react-router-dom 6.30 (single-page app, minimal routing)
**Icons**: lucide-react
**Animation**: anime.js (custom wrapper at `src/lib/anime.ts`)
**Utilities**: date-fns 3.6 (date formatting)
**Scraper**: Node.js native fetch, node:sqlite (DatabaseSync), node:fs/path

## Important Notes

- **No test suite configured**: No Jest, Vitest, or testing library setup
- **TypeScript is lenient**: Strict mode disabled, allows implicit any
- **Single-page app**: Minimal routing, main logic in `Index.tsx`
- **Environment variables**: Vite requires `VITE_` prefix for client-side vars
- **Port**: Dev server runs on 8080 (not 3000 or 5173)
- **Google Maps billing**: Requires valid API key with billing enabled
- **Building data**: No backend API; uses Google Maps POI system directly
- **Events data**: Scraper runs automatically before dev/build; can be disabled by removing pre-scripts
- **SQLite**: Events scraper uses Node.js native SQLite (`node:sqlite`), requires Node 22+
