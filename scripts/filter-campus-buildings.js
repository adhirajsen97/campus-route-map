#!/usr/bin/env node

/**
 * Filter Tarrant County building footprints to only UTA campus area
 *
 * This script reads the full Tarrant County GeoJSON file and filters
 * it to only include buildings within the UTA campus boundaries.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// UTA Campus boundaries (same as in mapsClient.ts)
const UTA_BOUNDS = {
  north: 32.7380,  // Northern edge near I-30
  south: 32.7240,  // Southern edge near Park Row
  east: -97.1080,  // Eastern edge near Cooper St
  west: -97.1220,  // Western edge near Davis St
};

// Check if a point is within the UTA campus bounds
function isWithinCampus(lat, lng) {
  return lat >= UTA_BOUNDS.south &&
         lat <= UTA_BOUNDS.north &&
         lng >= UTA_BOUNDS.west &&
         lng <= UTA_BOUNDS.east;
}

// Check if any point of a polygon is within campus bounds
function polygonIntersectsCampus(coordinates) {
  // Handle both Polygon and MultiPolygon geometries
  const rings = Array.isArray(coordinates[0][0]) ? coordinates : [coordinates];

  for (const ring of rings) {
    for (const point of ring) {
      const [lng, lat] = point;
      if (isWithinCampus(lat, lng)) {
        return true;
      }
    }
  }
  return false;
}

async function filterBuildings() {
  console.log('Reading Tarrant County building footprints...');

  const inputPath = path.join(__dirname, '..', 'Tarrant County Building Footprints.geojson');
  const outputPath = path.join(__dirname, '..', 'src', 'data', 'uta-buildings.geojson');

  // Read the full GeoJSON file
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  console.log(`Total features in Tarrant County: ${data.features.length}`);

  // Filter to only campus buildings
  const campusFeatures = data.features.filter(feature => {
    if (!feature.geometry || feature.geometry.type !== 'Polygon') {
      return false;
    }
    return polygonIntersectsCampus(feature.geometry.coordinates);
  });

  console.log(`Features within UTA campus: ${campusFeatures.length}`);

  // Create filtered GeoJSON
  const filteredData = {
    type: 'FeatureCollection',
    name: 'UTA_Campus_Building_Footprints',
    crs: data.crs,
    features: campusFeatures
  };

  // Write filtered data
  fs.writeFileSync(outputPath, JSON.stringify(filteredData, null, 2));

  console.log(`✓ Filtered GeoJSON saved to: ${outputPath}`);
  console.log(`✓ Reduced from ${data.features.length} to ${campusFeatures.length} buildings`);
}

filterBuildings().catch(console.error);
