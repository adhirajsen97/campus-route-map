import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { googleMapsStub } from './utils/googleMapsStub';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const eventsFixture = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'events.json'), 'utf-8')
);

type GeolocationSuccess = {
  status: 'success';
  position: {
    coords: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
  };
};

type GeolocationError = {
  status: 'error';
  error: {
    code: number;
    message: string;
  };
};

declare global {
  interface Window {
    __triggerAutocomplete: (
      index: number,
      place: {
        place_id?: string;
        name?: string;
        formatted_address?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
      }
    ) => void;
    __setMockDirectionsResponse: (response: unknown) => void;
    __googleMapsMock: {
      reset: () => void;
      markers: Array<{ getMap: () => unknown }>;
    };
    __setGeolocationResponses: (responses: Array<GeolocationSuccess | GeolocationError>) => void;
  }
}

const eventsResponse = JSON.stringify(eventsFixture);

test.beforeEach(async ({ context, page }) => {
  await context.grantPermissions(['geolocation']);

  await page.route('https://maps.googleapis.com/maps/api/js*', async (route) => {
    await route.fulfill({
      status: 200,
      body: googleMapsStub,
      headers: {
        'content-type': 'application/javascript',
        'access-control-allow-origin': '*',
      },
    });
  });

  await page.route('**/api/events', async (route) => {
    await route.fulfill({
      status: 200,
      body: eventsResponse,
      headers: { 'content-type': 'application/json' },
    });
  });

  await page.addInitScript(() => {
    const defaultSequence = [
      {
        status: 'success',
        position: {
          coords: { latitude: 32.7311, longitude: -97.1151, accuracy: 5 },
        },
      },
      {
        status: 'error',
        error: { code: 1, message: 'Position unavailable' },
      },
    ];

    const queue: Array<GeolocationSuccess | GeolocationError> = [...defaultSequence];

    const geolocation = {
      getCurrentPosition(success: (position: unknown) => void, error?: (error: unknown) => void) {
        const next = queue.length > 0 ? queue.shift()! : defaultSequence[defaultSequence.length - 1]!;
        setTimeout(() => {
          if (next.status === 'success') {
            success({
              coords: {
                latitude: next.position.coords.latitude,
                longitude: next.position.coords.longitude,
                accuracy: next.position.coords.accuracy ?? 5,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
              },
              timestamp: Date.now(),
            });
          } else if (error) {
            error({
              code: next.error.code,
              message: next.error.message,
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            });
          }
        }, 30);
      },
      watchPosition() {
        return 0;
      },
      clearWatch() {},
    };

    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: geolocation,
    });

    window.__setGeolocationResponses = (responses) => {
      queue.length = 0;
      if (responses.length === 0) {
        queue.push(...defaultSequence);
        return;
      }
      responses.forEach((entry) => queue.push(entry));
    };
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Campus Navigator' })).toBeVisible();
  await page.evaluate(() => {
    window.__googleMapsMock.reset();
    window.__setMockDirectionsResponse(undefined);
    window.__setGeolocationResponses([
      {
        status: 'success',
        position: { coords: { latitude: 32.7311, longitude: -97.1151, accuracy: 5 } },
      },
      {
        status: 'error',
        error: { code: 1, message: 'Position unavailable' },
      },
    ]);
  });
});

test('calculates a route from campus search inputs', async ({ page }) => {
  await page.evaluate(() => {
    window.__setMockDirectionsResponse({
      routes: [
        {
          legs: [
            {
              distance: { text: '0.5 mi', value: 805 },
              duration: { text: '10 mins', value: 600 },
              start_location: { lat: () => 32.7325, lng: () => -97.114 },
              end_location: { lat: () => 32.729, lng: () => -97.112 },
              steps: [],
            },
          ],
        },
      ],
    });
  });

  const originInput = page.getByPlaceholder('Starting point...');
  await originInput.fill('Central Library');
  await page.evaluate(() => {
    window.__triggerAutocomplete(0, {
      place_id: 'central-library',
      name: 'Central Library',
      formatted_address: '702 Planetarium Pl, Arlington, TX 76019',
      geometry: { location: { lat: 32.7325, lng: -97.114 } },
    });
  });
  await expect(originInput).toHaveValue('Central Library, 702 Planetarium Pl, Arlington, TX 76019');

  await page.getByRole('button', { name: 'Choose Destination' }).click();
  const destinationInput = page.getByPlaceholder('Destination...');
  await destinationInput.fill('Engineering Research Building');
  await page.evaluate(() => {
    window.__triggerAutocomplete(1, {
      place_id: 'erb',
      name: 'Engineering Research Building',
      formatted_address: '701 S Nedderman Dr, Arlington, TX 76019',
      geometry: { location: { lat: 32.729, lng: -97.112 } },
    });
  });
  await expect(destinationInput).toHaveValue('Engineering Research Building, 701 S Nedderman Dr, Arlington, TX 76019');

  await page.getByRole('button', { name: 'Get Directions' }).click();
  await expect(page.getByRole('button', { name: 'Calculating...' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get Directions' })).toBeVisible();

  await expect(page.getByText('Route Summary')).toBeVisible();
  await expect(page.getByText('0.5 mi')).toBeVisible();
  await expect(page.getByText('10 mins')).toBeVisible();

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByText('Route Summary')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Choose Destination' })).toBeVisible();
});

test('filters events by search, date, location, and tag', async ({ page }) => {
  await page.getByRole('button', { name: 'Events' }).click();
  await expect(page.getByRole('heading', { name: 'Campus Events' })).toBeVisible();

  const searchInput = page.getByPlaceholder('Search events by name, location, or tag');
  await searchInput.fill('Career');
  await expect(page.getByRole('heading', { name: 'Spring Career Fair' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Robotics Showcase' })).toHaveCount(0);

  const dateInput = page.getByLabel('Filter by date');
  await dateInput.fill('2025-03-05');

  await page.getByLabel('Filter by location').click();
  await page.getByRole('option', { name: 'Arlington Hall' }).click();

  await page.getByLabel('Filter by tag').click();
  await page.getByRole('option', { name: 'Networking' }).click();

  const resetButton = page.getByRole('button', { name: 'Reset filters' });
  await expect(resetButton).toBeEnabled();
  await expect(page.getByText('Spring Career Fair')).toBeVisible();
  await resetButton.click();

  await expect(searchInput).toHaveValue('');
  await expect(dateInput).toHaveValue('');
  await expect(page.getByLabel('Filter by location')).toHaveText(/All locations/i);
  await expect(page.getByLabel('Filter by tag')).toHaveText(/All tags|No tags available/i);
});

test('toggles event and shuttle layers', async ({ page }) => {
  const eventsSwitch = page.getByRole('switch', { name: 'Events' });
  await expect(eventsSwitch).toHaveAttribute('aria-checked', 'true');
  await eventsSwitch.click();
  await expect(eventsSwitch).toHaveAttribute('aria-checked', 'false');
  await eventsSwitch.click();
  await expect(eventsSwitch).toHaveAttribute('aria-checked', 'true');

  const shuttlesTrigger = page.getByRole('button', { name: /Shuttles/ });
  await shuttlesTrigger.click();

  const toggleAllButton = page.getByRole('button', { name: /Hide all|Show all/ });
  await toggleAllButton.click();
  await expect(shuttlesTrigger.getByText('All routes hidden')).toBeVisible();

  const blackRouteSwitch = page
    .locator('div:has-text("Black Route")')
    .locator('button[role="switch"]').first();
  await blackRouteSwitch.click();
  await expect(shuttlesTrigger.getByText('1/7 active')).toBeVisible();
});

test('handles geolocation success and failure with toasts', async ({ page }) => {
  const geolocateButton = page.getByRole('button', { name: 'Find my location' });

  await geolocateButton.click();
  await expect(geolocateButton).toBeDisabled();
  await expect(page.getByText('Location found', { exact: true })).toBeVisible();
  await expect(page.getByText('Map centered on your current location', { exact: true })).toBeVisible();
  await expect(geolocateButton).toBeEnabled();

  await page.evaluate(() => {
    window.__setGeolocationResponses([
      {
        status: 'error',
        error: { code: 1, message: 'Permission denied' },
      },
    ]);
  });

  await geolocateButton.click();
  await expect(geolocateButton).toBeDisabled();
  await expect(page.getByText('Location error')).toBeVisible();
  await expect(page.getByText('Unable to get your current location. Please check permissions.')).toBeVisible();
  await expect(geolocateButton).toBeEnabled();
});
