import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Create a new QueryClient for each test to ensure isolation
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: Infinity, // Keep cache indefinitely during tests
      },
    },
  });

// Test wrapper component for React Query
export const createQueryWrapper = (queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient();

  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
};
