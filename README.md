# Campus Navigator

A modern, Google Maps-powered campus navigation web app built with React, TypeScript, and Tailwind CSS.

## Features

- 🗺️ **Google Maps Integration**: Full-featured map with Places Autocomplete and Directions
- 🔍 **Smart Search**: Find campus buildings and locations with autocomplete
- 🚶 **Multi-Modal Routing**: Get directions by walking, driving, biking, or transit
- 📍 **Building Markers**: Interactive markers with detailed building information
- 📱 **Responsive Design**: Mobile-first UI that works on all devices
- 🎯 **Geolocation**: Center map on your current location
- 🎨 **Modern UI**: Clean, accessible design with university-themed colors

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- Google Maps API key with the following APIs enabled:
  - Maps JavaScript API
  - Places API
  - Directions API

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Google Maps API:**
   
   Create a `.env.local` file in the root directory:
   ```bash
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   # Optional: VITE_GOOGLE_MAPS_MAP_ID=your_map_id_here
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

   App will be available at http://localhost:8080

## Project Structure

```
src/
├── components/
│   ├── maps/              # Google Maps components
│   │   ├── MapCanvas.tsx           # Base map renderer
│   │   ├── SearchAutocomplete.tsx  # Places autocomplete search
│   │   ├── DirectionsPanel.tsx     # Route planning interface
│   │   ├── MarkerLayer.tsx         # Building markers
│   │   ├── GeolocateButton.tsx     # User location control
│   │   └── LayersToggle.tsx        # Layer visibility controls
│   ├── panels/            # Side panels
│   │   └── BuildingInfoPanel.tsx   # Building details drawer
│   └── ui/                # Reusable UI components (shadcn)
├── data/
│   ├── buildings.mock.ts  # Mock building data
│   └── events.mock.ts     # Mock campus events
├── lib/
│   ├── mapsClient.ts      # Google Maps configuration
│   ├── mapState.ts        # State management (Zustand)
│   ├── types.ts           # TypeScript interfaces
│   └── utils.ts           # Utility functions
└── pages/
    └── Index.tsx          # Main application page
```

## API Integration Points

The app is UI-ready with clearly marked integration points for backend APIs. Search for `TODO(api)` comments to find these wiring points:

### 1. **Search API** (`SearchAutocomplete.tsx`)
```typescript
// TODO(api): Replace Places API with custom search
// const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
```

### 2. **Buildings API** (`MarkerLayer.tsx`)
```typescript
// TODO(api): Fetch buildings from backend
// const { data: buildings } = await fetch('/api/buildings');
```

### 3. **Building Details** (`BuildingInfoPanel.tsx`)
```typescript
// TODO(api): Fetch full building details
// const { data } = await fetch(`/api/buildings/${building.id}`);
```

### 4. **Events API** (`LayersToggle.tsx`)
```typescript
// TODO(api): Fetch campus events
// const { data: events } = await fetch('/api/events');
```

### 5. **Route Logging** (`DirectionsPanel.tsx`)
```typescript
// TODO(api): Log route analytics
// await fetch('/api/routes/log', {
//   method: 'POST',
//   body: JSON.stringify({ origin, destination, mode })
// });
```

## Customization

### Update Campus Location

Edit `src/lib/mapsClient.ts`:
```typescript
export const DEFAULT_CENTER = {
  lat: 37.7749,  // Your campus latitude
  lng: -122.4194 // Your campus longitude
};
```

### Add Real Building Data

Replace mock data in `src/data/buildings.mock.ts` with your campus buildings following the `Building` interface.

### Customize Colors

The app uses a university-themed design system. Edit `src/index.css` to customize:
- `--primary`: University blue (main brand color)
- `--accent`: Campus coral (highlights and CTAs)
- `--gradient-primary`: Header gradient

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **@react-google-maps/api** - Google Maps integration
- **Zustand** - State management
- **React Router** - Routing

## Next Steps

1. **Backend Integration**: Replace mock data with REST/GraphQL APIs
2. **Authentication**: Add user accounts for saved routes and favorites
3. **Real-time Updates**: WebSocket integration for live event updates
4. **Accessibility**: WCAG 2.1 AA compliance audit
5. **Analytics**: Track popular routes and search queries
6. **Mobile App**: React Native version with offline maps

## License

MIT

---

**Need help?** Check the [Google Maps Platform documentation](https://developers.google.com/maps/documentation).
