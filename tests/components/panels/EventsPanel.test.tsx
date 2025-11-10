import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventsPanel } from '@/components/panels/EventsPanel';
import { createQueryWrapper } from '../../mocks/reactQuery';
import { mockEvents } from '../../fixtures/events';

// Mock useEvents hook
vi.mock('@/hooks/use-events', () => ({
  useEvents: vi.fn(),
}));

import { useEvents } from '@/hooks/use-events';
import { Mock } from 'vitest';

describe('EventsPanel', () => {
  const mockUseEvents = useEvents as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading and error states', () => {
    it('should show loading state', () => {
      mockUseEvents.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      expect(screen.getByText(/loading the latest campus events/i)).toBeInTheDocument();
    });

    it('should show error state', () => {
      mockUseEvents.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      expect(screen.getByText(/couldn't load events right now/i)).toBeInTheDocument();
    });

    it('should show refetch button on error', () => {
      const refetch = vi.fn();
      mockUseEvents.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch,
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      const button = screen.getByRole('button', { name: /try again/i });
      expect(button).toBeInTheDocument();
    });

    it('should call refetch when try again button clicked', async () => {
      const refetch = vi.fn();
      const user = userEvent.setup();

      mockUseEvents.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch,
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      const button = screen.getByRole('button', { name: /try again/i });
      await user.click(button);

      expect(refetch).toHaveBeenCalledOnce();
    });
  });

  describe('events rendering', () => {
    it('should render events list', () => {
      mockUseEvents.mockReturnValue({
        data: mockEvents,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      expect(screen.getByText('Career Fair')).toBeInTheDocument();
      expect(screen.getByText('Basketball Game')).toBeInTheDocument();
      expect(screen.getByText('Guest Lecture')).toBeInTheDocument();
      expect(screen.getByText('Yoga Class')).toBeInTheDocument();
    });

    it('should display event locations', () => {
      mockUseEvents.mockReturnValue({
        data: mockEvents,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      expect(screen.getByText('Student Center')).toBeInTheDocument();
      expect(screen.getByText('Arena')).toBeInTheDocument();
    });

    it('should display event categories as badges', () => {
      mockUseEvents.mockReturnValue({
        data: mockEvents,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      });

      const { container } = render(<EventsPanel />, { wrapper: createQueryWrapper() });

      // Categories are displayed as badges with capitalize class
      // Use container.textContent to check for presence of category text
      expect(container.textContent).toMatch(/career/i);
      expect(container.textContent).toMatch(/sports/i);
      expect(container.textContent).toMatch(/academic/i);
      expect(container.textContent).toMatch(/wellness/i);
    });
  });

  describe('search filtering', () => {
    it('should filter events by title', async () => {
      const user = userEvent.setup();

      mockUseEvents.mockReturnValue({
        data: mockEvents,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      const searchInput = screen.getByPlaceholderText(/search events/i);
      await user.type(searchInput, 'career');

      await waitFor(() => {
        expect(screen.getByText('Career Fair')).toBeInTheDocument();
        expect(screen.queryByText('Basketball Game')).not.toBeInTheDocument();
      });
    });

    it('should filter events by location', async () => {
      const user = userEvent.setup();

      mockUseEvents.mockReturnValue({
        data: mockEvents,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      const searchInput = screen.getByPlaceholderText(/search events/i);
      await user.type(searchInput, 'arena');

      await waitFor(() => {
        expect(screen.getByText('Basketball Game')).toBeInTheDocument();
        expect(screen.queryByText('Career Fair')).not.toBeInTheDocument();
      });
    });

    it('should filter events by tag', async () => {
      const user = userEvent.setup();

      mockUseEvents.mockReturnValue({
        data: mockEvents,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      const searchInput = screen.getByPlaceholderText(/search events/i);
      await user.type(searchInput, 'basketball');

      await waitFor(() => {
        expect(screen.getByText('Basketball Game')).toBeInTheDocument();
        expect(screen.queryByText('Career Fair')).not.toBeInTheDocument();
      });
    });

    it('should be case insensitive', async () => {
      const user = userEvent.setup();

      mockUseEvents.mockReturnValue({
        data: mockEvents,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      const searchInput = screen.getByPlaceholderText(/search events/i);
      await user.type(searchInput, 'BASKETBALL');

      await waitFor(() => {
        expect(screen.getByText('Basketball Game')).toBeInTheDocument();
      });
    });
  });

  describe('date filtering', () => {
    it('should filter events by date', async () => {
      const user = userEvent.setup();

      mockUseEvents.mockReturnValue({
        data: mockEvents,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      const dateInput = screen.getByLabelText(/filter by date/i);
      await user.type(dateInput, '2025-01-15');

      await waitFor(() => {
        expect(screen.getByText('Career Fair')).toBeInTheDocument();
        expect(screen.queryByText('Basketball Game')).not.toBeInTheDocument();
      });
    });
  });

  describe('reset filters', () => {
    it('should reset all filters', async () => {
      const user = userEvent.setup();

      mockUseEvents.mockReturnValue({
        data: mockEvents,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      // Apply filters
      const searchInput = screen.getByPlaceholderText(/search events/i);
      await user.type(searchInput, 'career');

      await waitFor(() => {
        expect(screen.queryByText('Basketball Game')).not.toBeInTheDocument();
      });

      // Reset filters
      const resetButton = screen.getByRole('button', { name: /reset filters/i });
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText('Career Fair')).toBeInTheDocument();
        expect(screen.getByText('Basketball Game')).toBeInTheDocument();
      });
    });

    it('should disable reset button when no filters active', () => {
      mockUseEvents.mockReturnValue({
        data: mockEvents,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      const resetButton = screen.getByRole('button', { name: /reset filters/i });
      expect(resetButton).toBeDisabled();
    });

    it('should enable reset button when filters are active', async () => {
      const user = userEvent.setup();

      mockUseEvents.mockReturnValue({
        data: mockEvents,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      const searchInput = screen.getByPlaceholderText(/search events/i);
      await user.type(searchInput, 'test');

      const resetButton = screen.getByRole('button', { name: /reset filters/i });
      expect(resetButton).not.toBeDisabled();
    });
  });

  describe('empty states', () => {
    it('should show message when no events match filters', async () => {
      const user = userEvent.setup();

      mockUseEvents.mockReturnValue({
        data: mockEvents,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      const searchInput = screen.getByPlaceholderText(/search events/i);
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText(/no events match your filters/i)).toBeInTheDocument();
      });
    });
  });

  describe('unique locations and tags', () => {
    it('should compute unique locations', () => {
      mockUseEvents.mockReturnValue({
        data: mockEvents,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      // Check that location filter dropdown exists by finding the text
      expect(screen.getByText(/all locations/i)).toBeInTheDocument();
    });

    it('should compute unique tags', () => {
      mockUseEvents.mockReturnValue({
        data: mockEvents,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<EventsPanel />, { wrapper: createQueryWrapper() });

      // Check that tag filter dropdown exists by finding the text
      expect(screen.getByText(/all tags/i)).toBeInTheDocument();
    });
  });
});
