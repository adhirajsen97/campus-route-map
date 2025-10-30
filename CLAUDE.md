# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Campus Navigator is a Google Maps-powered campus navigation web application built with React 18, TypeScript, and Tailwind CSS. The app provides interactive campus mapping, building search, route planning, and location-based features. Currently uses mock data with clearly marked integration points for future backend APIs.

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
```

### Environment Setup
- Create `.env.local` file with required Google Maps API key:
  ```
  VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
  VITE_GOOGLE_MAPS_MAP_ID=your_map_id_here  # Optional
  ```
- Google Maps APIs required: Maps JavaScript API, Places API, Directions API
- Default campus location configured in `src/lib/mapsClient.ts:24` (currently set to coordinates 32.7311, -97.1151)

## Architecture Overview

### State Management Pattern
The app uses **Zustand** for centralized state management (not Context API or Redux). All map-related state lives in a single store:
- **Store location**: `src/lib/mapState.ts`
- **Store hook**: `useMapStore()`
- **State includes**: map center/zoom, selected building, layer visibility toggles
- **Usage pattern**: Components import `useMapStore` and destructure needed state/actions

### Component Architecture

**Layout**: Single-page application with fixed header, split-pane main content (map + sidebar)
- Main page: `src/pages/Index.tsx` orchestrates all major components
- Left pane: Full-screen map canvas with floating controls
- Right pane: Building info panel, directions panel, quick start instructions

**Maps Components** (`src/components/maps/`):
- `MapCanvas.tsx`: Base Google Maps renderer (wraps `@react-google-maps/api`)
- `SearchAutocomplete.tsx`: Places API autocomplete search
- `DirectionsPanel.tsx`: Route planning UI with travel mode selection
- `MarkerLayer.tsx`: Renders building markers from data array
- `GeolocateButton.tsx`: User location centering control
- `LayersToggle.tsx`: Toggle visibility of buildings/events layers

**Component Communication**:
- Map components read/write to Zustand store for shared state
- Building selection flows: Marker click → store update → info panel renders
- Search selection flows: Place selected → store updates center/zoom → map pans

**Google Maps Integration**:
- Uses `@react-google-maps/api` library (NOT vanilla Google Maps SDK)
- Configuration centralized in `src/lib/mapsClient.ts`
- API key loaded from Vite env vars (`import.meta.env.VITE_GOOGLE_MAPS_API_KEY`)
- Required libraries loaded: `['places', 'geometry']`
- DirectionsService/DirectionsRenderer components used for routing

### Type System
- Core types defined in `src/lib/types.ts`:
  - `Building`: Campus building with location, metadata
  - `CampusEvent`: Scheduled events with location/category
  - `RouteResult`, `RouteStep`: Directions API response shapes
  - `TravelMode`: Union type for Google Maps travel modes
  - `MapState`: Shape of Zustand store state
- TypeScript strict mode is RELAXED (`strictNullChecks: false`, `noImplicitAny: false`)
- Use `@/` path alias for `./src/` imports (configured in tsconfig and vite.config)

### Data Layer
- Currently uses **mock data** from `src/data/*.mock.ts` files
- `TODO(api)` comments mark future backend integration points:
  - Search API integration point: `SearchAutocomplete.tsx`
  - Buildings API fetch: `MarkerLayer.tsx`
  - Building details API: `BuildingInfoPanel.tsx`
  - Events API fetch: `LayersToggle.tsx`
  - Route logging endpoint: `DirectionsPanel.tsx`
- Backend API URLs are stubbed in comments (e.g., `/api/buildings`, `/api/search`)

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
- Marker pattern: Use `MarkerLayer` component, iterate over data array

### Backend Integration Points
- Search for `TODO(api)` comments to find integration locations
- Mock data provides schema examples (maintain compatibility)
- Expected API patterns: RESTful JSON endpoints
- No authentication layer implemented yet

## Common Customization Tasks

### Change Campus Location
Edit `src/lib/mapsClient.ts:24`:
```typescript
export const DEFAULT_CENTER = { lat: YOUR_LAT, lng: YOUR_LNG };
```
Also update initial state in `src/lib/mapState.ts:13`

### Replace Mock Data with Real API
1. Find `TODO(api)` comment for the data type
2. Replace mock import with `fetch()` or `@tanstack/react-query` call
3. Maintain existing data shape (defined in `src/lib/types.ts`)
4. Handle loading/error states in component

### Customize Colors/Branding
Edit CSS variables in `src/index.css`:
- `--primary`: Main brand color (affects buttons, links, markers)
- `--accent`: Secondary color (CTAs, highlights)
- `--gradient-primary`: Header gradient colors

## Tech Stack Dependencies

**Core**: React 18.3, TypeScript 5.8, Vite 5.4
**Maps**: @react-google-maps/api 2.20
**State**: Zustand 5.0 (NOT Redux or Context API)
**UI**: shadcn/ui (Radix UI primitives) + Tailwind CSS 3.4
**Forms**: react-hook-form + zod (not used extensively yet)
**Routing**: react-router-dom 6.30 (single-page app, minimal routing)
**Icons**: lucide-react

## Important Notes

- **No test suite configured**: No Jest, Vitest, or testing library setup
- **TypeScript is lenient**: Strict mode disabled, allows implicit any
- **Single-page app**: Minimal routing, main logic in `Index.tsx`
- **Environment variables**: Vite requires `VITE_` prefix for client-side vars
- **Port**: Dev server runs on 8080 (not 3000 or 5173)
- **Google Maps billing**: Requires valid API key with billing enabled
