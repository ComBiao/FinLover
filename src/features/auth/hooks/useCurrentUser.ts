import { useQuery } from "@tanstack/react-query";

import { getApi } from "@/lib/api/client";
import type { CurrentUser } from "@/shared/contracts";

export const CURRENT_USER_QUERY_KEY = ["current-user"] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: async () => (await getApi<{ user: CurrentUser }>("/api/v1/auth/me")).user,
    staleTime: 5 * 60 * 1000,
  });
}

/** Name to show in the UI: the stored display name, else the part of the email before "@". */
export function displayName(user: CurrentUser | undefined) {
  if (!user) return "";
  return user.name?.trim() || user.email.split("@")[0];
}
