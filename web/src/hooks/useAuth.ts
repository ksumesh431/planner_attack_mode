import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, ApiError } from "../api/client";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        await api.get("/api/auth/me");
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return false;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (password: string) => api.post("/api/auth/login", { password }),
    onSuccess: () => {
      queryClient.setQueryData(["session"], true);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post("/api/auth/logout"),
    onSettled: () => {
      queryClient.setQueryData(["session"], false);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "session" });
    },
  });
}
