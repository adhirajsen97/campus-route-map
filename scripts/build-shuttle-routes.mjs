import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';

/** @typedef {string[]} CsvRow */

/**
 * @typedef StopCoordinate
 * @property {number} lat
 * @property {number} lng
 * @property {string} [name]
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const csvPath = path.join(projectRoot, 'data', 'shuttle_routes_all.csv');
const lookupPath = path.join(projectRoot, 'data', 'shuttle-stop-locations.json');
const outputPath = path.join(projectRoot, 'src', 'data', 'shuttleRoutes.ts');

const rawCsv = readFileSync(csvPath, 'utf8');
const parsed = Papa.parse(rawCsv, { header: false, skipEmptyLines: true });

if (parsed.errors.length > 0) {
  const formatted = parsed.errors.map((error) => `${error.message} (row ${error.row})`).join('\n');
  throw new Error(`Failed to parse shuttle routes CSV:\n${formatted}`);
}

const [headerRow, ...dataRows] = parsed.data;
if (!headerRow || headerRow.length < 18) {
  throw new Error('Unexpected shuttle routes CSV header shape.');
}

/** @type {Record<string, StopCoordinate>} */
const stopCoordinates = JSON.parse(readFileSync(lookupPath, 'utf8'));

const normalizeStopId = (name) =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, 'and')
    .replace(/@/g, ' at ')
    .replace(/\+/g, ' plus ')
    .replace(/[./]/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const cleanString = (value) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseBoolean = (value) => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === 'yes';
};

const parseDelimited = (value, delimiter) => {
  if (!value) return [];
  return value
    .split(delimiter)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
};

/** @typedef {ReturnType<typeof createRouteAccumulator>} RouteAccumulator */

const createRouteAccumulator = ({
  routeCode,
  routeName,
  routeColor,
  serviceLabel,
  serviceDays,
  serviceTz,
  serviceStart,
  serviceEnd,
}) => ({
  code: routeCode,
  name: routeName,
  color: routeColor,
  service: {
    label: serviceLabel,
    days: serviceDays,
    timeZone: serviceTz,
    start: serviceStart,
    end: serviceEnd,
  },
  stops: [],
});

const routes = new Map();

for (const row of dataRows) {
  if (!row || row.length === 0) {
    continue;
  }

  // Pad the row to the expected length so destructuring works even if trailing columns are missing.
  while (row.length < 19) {
    row.push('');
  }

  const [
    routeCode,
    routeName,
    routeColor,
    serviceLabel,
    serviceDays,
    serviceTz,
    serviceStart,
    serviceEnd,
    stopSequence,
    stopName,
    stopAddress,
    _unused,
    _latitude,
    _longitude,
    isTransferHubRaw,
    transfersToRaw,
    departurePatternRaw,
    departureTimesRaw,
    notesRaw,
    ...extra
  ] = row;

  if (extra.some((value) => cleanString(value))) {
    throw new Error(`Encountered unexpected extra columns in CSV row for stop "${stopName}".`);
  }

  if (!routeCode || !routeName || !routeColor || !stopName || !stopSequence) {
    continue;
  }

  const sequenceNumber = Number(stopSequence);
  if (Number.isNaN(sequenceNumber)) {
    throw new Error(`Invalid stop sequence "${stopSequence}" for stop "${stopName}".`);
  }

  const stopId = normalizeStopId(stopName);
  const coords = stopCoordinates[stopId];
  if (!coords) {
    const availableStops = Object.keys(stopCoordinates)
      .sort()
      .join(', ');
    throw new Error(
      `Missing coordinates for stop "${stopName}" (normalized id: "${stopId}").\n` +
        `Available stop ids: ${availableStops}`
    );
  }

  let route = routes.get(routeCode);

  if (!route) {
    route = createRouteAccumulator({
      routeCode,
      routeName,
      routeColor,
      serviceLabel,
      serviceDays,
      serviceTz,
      serviceStart,
      serviceEnd,
    });
    routes.set(routeCode, route);
  } else {
    const inconsistentFields = [];
    if (route.name !== routeName) inconsistentFields.push('route_name');
    if (route.color !== routeColor) inconsistentFields.push('route_color');
    if (route.service.label !== serviceLabel) inconsistentFields.push('service_label');
    if (route.service.days !== serviceDays) inconsistentFields.push('service_days');
    if (route.service.timeZone !== serviceTz) inconsistentFields.push('service_tz');
    if (route.service.start !== serviceStart) inconsistentFields.push('service_start');
    if (route.service.end !== serviceEnd) inconsistentFields.push('service_end');

    if (inconsistentFields.length > 0) {
      throw new Error(`Route metadata mismatch for ${routeCode}: ${inconsistentFields.join(', ')}.`);
    }
  }

  const transfersTo = parseDelimited(transfersToRaw, /\|/);
  const departureTimes = parseDelimited(departureTimesRaw, /\s*;\s*/);

  route.stops.push({
    id: stopId,
    name: stopName,
    sequence: sequenceNumber,
    lat: coords.lat,
    lng: coords.lng,
    address: cleanString(stopAddress),
    isTransferHub: parseBoolean(isTransferHubRaw),
    transfersTo,
    departurePattern: cleanString(departurePatternRaw),
    departureTimes: departureTimes.length > 0 ? departureTimes : undefined,
    notes: cleanString(notesRaw),
  });
}

const orderedRoutes = Array.from(routes.values())
  .map((route) => ({
    ...route,
    stops: route.stops
      .sort((a, b) => a.sequence - b.sequence)
      .map((stop) => ({
        ...stop,
        address: cleanString(stop.address ?? undefined),
        departurePattern: cleanString(stop.departurePattern ?? undefined),
        notes: cleanString(stop.notes ?? undefined),
      })),
  }))
  .sort((a, b) => a.code.localeCompare(b.code));

const fileHeader = `// This file is auto-generated by scripts/build-shuttle-routes.mjs.\n` +
  `// Do not edit this file directly. Update data/shuttle_routes_all.csv instead and\n` +
  `// run \`npm run build:shuttle-routes\`.\n\n`;

const fileContents =
  `${fileHeader}import type { ShuttleRoute } from '../lib/types';\n\n` +
  `export const shuttleRoutes = ${JSON.stringify(orderedRoutes, null, 2)} satisfies ShuttleRoute[];\n\n` +
  `export default shuttleRoutes;\n`;

writeFileSync(outputPath, fileContents);

console.log(`Generated ${path.relative(projectRoot, outputPath)} (${orderedRoutes.length} routes).`);
