import { useQuery } from "@tanstack/react-query";

import { getWallets } from "@/features/transactions/walletsService";

export const WALLETS_QUERY_KEY = ["wallets"] as const;

export function useWallets() {
  return useQuery({ queryKey: WALLETS_QUERY_KEY, queryFn: getWallets });
}
