import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../api/client";
import type {
  CalendarResponse,
  CreateTaskInput,
  DaySummary,
  Stats,
  Task,
  TasksResponse,
  UpdateTaskInput,
} from "../api/types";

function invalidateTaskViews(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
  queryClient.invalidateQueries({ queryKey: ["calendar"] });
  queryClient.invalidateQueries({ queryKey: ["stats"] });
}

export function useTasks(date: string, enabled = true) {
  return useQuery({
    queryKey: ["tasks", date],
    queryFn: async () => {
      const params = new URLSearchParams({ date });
      const response = await api.get<TasksResponse>(`/api/tasks?${params.toString()}`);
      return response.tasks;
    },
    enabled: enabled && Boolean(date),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.post<Task>("/api/tasks", input),
    onSuccess: () => invalidateTaskViews(queryClient),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTaskInput }) =>
      api.patch<Task>(`/api/tasks/${id}`, input),
    onSuccess: () => invalidateTaskViews(queryClient),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/tasks/${id}`),
    onSuccess: () => invalidateTaskViews(queryClient),
  });
}

export function useCalendar(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: ["calendar", from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      const response = await api.get<CalendarResponse>(`/api/calendar?${params.toString()}`);
      return response.days as DaySummary[];
    },
    enabled: enabled && Boolean(from) && Boolean(to),
  });
}

export function useStats(from?: string, to?: string, enabled = true) {
  return useQuery({
    queryKey: ["stats", from ?? "all", to ?? "all"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from && to) {
        params.set("from", from);
        params.set("to", to);
      }
      const suffix = params.toString();
      return api.get<Stats>(`/api/stats${suffix ? `?${suffix}` : ""}`);
    },
    enabled,
  });
}
