import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeolocateButton } from '@/components/maps/GeolocateButton';
import { useMapStore } from '@/lib/mapState';

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

import { toast } from '@/hooks/use-toast';

// Helper function to create mock GeolocationPosition
const createMockPosition = (lat: number, lng: number): GeolocationPosition => ({
  coords: {
    latitude: lat,
    longitude: lng,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    toJSON: () => ({
      latitude: lat,
      longitude: lng,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    }),
  },
  timestamp: Date.now(),
  toJSON: () => ({
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  }),
});

describe('GeolocateButton', () => {
  const mockGeolocation = {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset Zustand store
    useMapStore.setState({
      center: { lat: 32.7311, lng: -97.1151 },
      zoom: 16,
      showEvents: true,
      mapInstance: null,
      hoveredStopId: null,
      selectedStopId: null,
      routeVisibility: {},
    });

    // Mock navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      writable: true,
      value: mockGeolocation,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render geolocate button', () => {
      render(<GeolocateButton />);

      const button = screen.getByRole('button', { name: /find my location/i });
      expect(button).toBeInTheDocument();
    });

    it('should render crosshair icon initially', () => {
      render(<GeolocateButton />);

      const button = screen.getByRole('button', { name: /find my location/i });
      expect(button).toBeInTheDocument();
      // Icon should be rendered
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('should not be disabled initially', () => {
      render(<GeolocateButton />);

      const button = screen.getByRole('button', { name: /find my location/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe('geolocation not supported', () => {
    it('should show error toast when geolocation is not supported', async () => {
      const user = userEvent.setup();

      // Remove geolocation support
      Object.defineProperty(navigator, 'geolocation', {
        writable: true,
        value: undefined,
      });

      render(<GeolocateButton />);

      const button = screen.getByRole('button', { name: /find my location/i });
      await user.click(button);

      expect(toast).toHaveBeenCalledWith({
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation.',
        variant: 'destructive',
      });
    });

    it('should not call getCurrentPosition when not supported', async () => {
      const user = userEvent.setup();

      Object.defineProperty(navigator, 'geolocation', {
        writable: true,
        value: undefined,
      });

      render(<GeolocateButton />);

      const button = screen.getByRole('button', { name: /find my location/i });
      await user.click(button);

      expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled();
    });
  });

  describe('successful geolocation', () => {
    it('should call getCurrentPosition on click', async () => {
      const user = userEvent.setup();

      render(<GeolocateButton />);

      const button = screen.getByRole('button', { name: /find my location/i });
      await user.click(button);

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });

    it('should update map center on success', async () => {
      const user = userEvent.setup();

      const mockPosition = createMockPosition(40.7128, -74.006);

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      render(<GeolocateButton />);

      const button = screen.getByRole('button', { name: /find my location/i });
      await user.click(button);

      await waitFor(() => {
        const state = useMapStore.getState();
        expect(state.center).toEqual({ lat: 40.7128, lng: -74.006 });
      });
    });

    it('should update map zoom on success', async () => {
      const user = userEvent.setup();

      const mockPosition = createMockPosition(40.7128, -74.006);

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      render(<GeolocateButton />);

      const button = screen.getByRole('button', { name: /find my location/i });
      await user.click(button);

      await waitFor(() => {
        const state = useMapStore.getState();
        expect(state.zoom).toBe(17);
      });
    });

    it('should show success toast', async () => {
      const user = userEvent.setup();

      const mockPosition = createMockPosition(40.7128, -74.006);

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      render(<GeolocateButton />);

      const button = screen.getByRole('button', { name: /find my location/i });
      await user.click(button);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Location found',
          description: 'Map centered on your current location',
        });
      });
    });

    it('should disable button during geolocation', async () => {
      const user = userEvent.setup();

      let successCallback: PositionCallback | undefined;
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        successCallback = success;
      });

      render(<GeolocateButton />);

      const button = screen.getByRole('button', { name: /find my location/i });
      await user.click(button);

      // Button should be disabled while locating
      expect(button).toBeDisabled();

      // Complete the geolocation
      const mockPosition = createMockPosition(40.7128, -74.006);
      successCallback!(mockPosition);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('geolocation error', () => {
    it('should show error toast on geolocation error', async () => {
      const user = userEvent.setup();

      const mockError = {
        code: 1,
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error(mockError);
      });

      render(<GeolocateButton />);

      const button = screen.getByRole('button', { name: /find my location/i });
      await user.click(button);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Location error',
          description: 'Unable to get your current location. Please check permissions.',
          variant: 'destructive',
        });
      });
    });

    it('should re-enable button after error', async () => {
      const user = userEvent.setup();

      const mockError = {
        code: 1,
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error(mockError);
      });

      render(<GeolocateButton />);

      const button = screen.getByRole('button', { name: /find my location/i });
      await user.click(button);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should not update map state on error', async () => {
      const user = userEvent.setup();

      const initialCenter = useMapStore.getState().center;
      const initialZoom = useMapStore.getState().zoom;

      const mockError = {
        code: 1,
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error(mockError);
      });

      render(<GeolocateButton />);

      const button = screen.getByRole('button', { name: /find my location/i });
      await user.click(button);

      await waitFor(() => {
        expect(toast).toHaveBeenCalled();
      });

      const state = useMapStore.getState();
      expect(state.center).toEqual(initialCenter);
      expect(state.zoom).toBe(initialZoom);
    });
  });

  describe('geolocation options', () => {
    it('should request high accuracy position', async () => {
      const user = userEvent.setup();

      render(<GeolocateButton />);

      const button = screen.getByRole('button', { name: /find my location/i });
      await user.click(button);

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          enableHighAccuracy: true,
        })
      );
    });

    it('should set timeout for geolocation', async () => {
      const user = userEvent.setup();

      render(<GeolocateButton />);

      const button = screen.getByRole('button', { name: /find my location/i });
      await user.click(button);

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          timeout: 5000,
        })
      );
    });

    it('should not use cached position', async () => {
      const user = userEvent.setup();

      render(<GeolocateButton />);

      const button = screen.getByRole('button', { name: /find my location/i });
      await user.click(button);

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          maximumAge: 0,
        })
      );
    });
  });
});
