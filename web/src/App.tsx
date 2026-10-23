import { lazy, useEffect } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ToastProvider } from "./components/Toast";
import { DayPage } from "./pages/DayPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import "./index.css";

const CalendarPage = lazy(() =>
  import("./pages/CalendarPage").then((module) => ({ default: module.CalendarPage })),
);
const StatsPage = lazy(() =>
  import("./pages/StatsPage").then((module) => ({ default: module.StatsPage })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

function AuthExpiryListener() {
  const client = useQueryClient();

  useEffect(() => {
    const handleExpiry = () => {
      client.setQueryData(["session"], false);
      client.removeQueries({ predicate: (query) => query.queryKey[0] !== "session" });
    };

    window.addEventListener("auth:expired", handleExpiry);
    return () => window.removeEventListener("auth:expired", handleExpiry);
  }, [client]);

  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthExpiryListener />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/today" replace />} />
                <Route path="today" element={<DayPage mode="today" />} />
                <Route path="tomorrow" element={<DayPage mode="tomorrow" />} />
                <Route path="day/:date" element={<DayPage mode="date" />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="stats" element={<StatsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
