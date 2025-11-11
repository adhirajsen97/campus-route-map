# MavPath Setup Guide

## Getting Your Google Maps API Key

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name your project (e.g., "MavPath")
4. Click "Create"

### Step 2: Enable Required APIs

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for and enable these APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Directions API**
   - **Geocoding API** (optional, for better address lookups)

### Step 3: Create API Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **"API key"**
3. Your API key will be created and displayed
4. Click **"Edit API key"** to restrict it (recommended):
   - **Application restrictions**:
     - For development: None
     - For production: HTTP referrers (add your domain)
   - **API restrictions**:
     - Select "Restrict key"
     - Check: Maps JavaScript API, Places API, Directions API
5. Click **"Save"**

### Step 4: Configure Your App

1. Copy your API key
2. Create a `.env.local` file in your project root:
   ```bash
   VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
   ```
3. Restart your development server

### Step 5: Verify Setup

1. Start the dev server: `npm run dev`
2. Open http://localhost:8080
3. You should see the map load successfully
4. If you see errors, check the browser console

## Optional: Custom Map Styling

To use custom map styles:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Maps** → **Map Styles**
3. Click **"+ CREATE MAP STYLE"**
4. Customize your map appearance
5. Save and copy the **Map ID**
6. Add to `.env.local`:
   ```bash
   VITE_GOOGLE_MAPS_MAP_ID=YOUR_MAP_ID_HERE
   ```

## Troubleshooting

### Map not loading?

- Check that your API key is correctly set in `.env.local`
- Verify all required APIs are enabled
- Check browser console for specific error messages
- Ensure you've restarted the dev server after adding `.env.local`

### "This page can't load Google Maps correctly"?

- Your API key may have restrictions that are blocking localhost
- Go to Google Cloud Console → Credentials → Edit your API key
- Under "Application restrictions", select "None" for development
- For production, add your domain to HTTP referrers

### Quota exceeded?

- Google Maps has a free tier with $200 monthly credit
- Check your usage at Google Cloud Console → APIs & Services → Dashboard
- Consider implementing usage limits or upgrading your plan

## Best Practices

1. **Never commit API keys**: The `.env.local` file is gitignored by default
2. **Restrict your keys**: Always use API restrictions in production
3. **Monitor usage**: Set up billing alerts in Google Cloud Console
4. **Use Map IDs**: For better performance and styling control

## Need Help?

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [Pricing Calculator](https://mapsplatform.google.com/pricing/)
