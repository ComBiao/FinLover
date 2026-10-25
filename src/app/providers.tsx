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
let signingOut = false;

function redirectOnUnauthorized(error: unknown) {
  if (error instanceof ApiClientError && error.status === 401 && window.location.pathname !== '/login' && !signingOut) {
    signingOut = true;
    // The cookie may still hold a JWT that verifies but whose user no longer exists (e.g. DB re-seeded).
    // /login and the private layouts only check the JWT signature, so without clearing the cookie first
    // /login would bounce straight back to /homepage and loop. Logout is idempotent; navigate regardless.
    void fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } })
      .catch(() => undefined)
      .finally(() => {
        // A full page load (not router.push) on purpose: it drops every cached query and in-memory store.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/login';
      });
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    queryCache: new QueryCache({ onError: redirectOnUnauthorized }),
    mutationCache: new MutationCache({ onError: redirectOnUnauthorized }),
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
