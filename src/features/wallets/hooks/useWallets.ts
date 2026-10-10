import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createWallet,
  deleteWallet,
  getWallets,
  updateWallet,
  updateWalletSaving,
  type CreateWalletInput,
  type UpdateWalletInput,
  type UpdateWalletSavingInput,
} from "@/features/wallets/walletsService";

export const WALLETS_QUERY_KEY = ["wallets"] as const;

export function useWallets() {
  return useQuery({
    queryKey: WALLETS_QUERY_KEY,
    queryFn: getWallets,
  });
}

function invalidateWalletQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: WALLETS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["home-summary"] });
  queryClient.invalidateQueries({ queryKey: ["transactions"] });
}

export function useCreateWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWalletInput) => createWallet(input),
    onSuccess: (created) => {
      invalidateWalletQueries(queryClient);
      toast.success(`Wallet "${created.name}" created`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Couldn't create wallet");
    },
  });
}

export function useUpdateWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWalletInput }) =>
      updateWallet(id, input),
    onSuccess: (updated) => {
      invalidateWalletQueries(queryClient);
      toast.success(`Wallet "${updated.name}" updated`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Couldn't update wallet");
    },
  });
}

export function useUpdateWalletSaving() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWalletSavingInput }) =>
      updateWalletSaving(id, input),
    onSuccess: (updated) => {
      invalidateWalletQueries(queryClient);
      const msg = updated.isSaving
        ? `Saving goal for "${updated.name}" enabled`
        : `Saving goal for "${updated.name}" disabled`;
      toast.success(msg);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Couldn't update saving status");
    },
  });
}

export function useDeleteWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWallet(id),
    onSuccess: () => {
      invalidateWalletQueries(queryClient);
      toast.success("Wallet deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Couldn't delete wallet");
    },
  });
}

