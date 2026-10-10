"use client";
import { useState } from 'react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientError } from '@/lib/api/client';

/**
 * A 401 from any query or mutation means the session ended (expired, logged
 * out elsewhere, account deleted), so send the user to /login instead of
 * leaving a screen full of failed requests. The full navigation also drops
 * every cached query and in-memory store.
 */
function redirectOnUnauthorized(error: unknown) {
  if (error instanceof ApiClientError && error.status === 401 && window.location.pathname !== '/login') {
    // A full page load (not router.push) on purpose: it drops every cached query and in-memory store.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/login';
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    queryCache: new QueryCache({ onError: redirectOnUnauthorized }),
    mutationCache: new MutationCache({ onError: redirectOnUnauthorized }),
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
