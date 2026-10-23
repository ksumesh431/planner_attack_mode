import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useSession } from "../hooks/useAuth";
import { ErrorState, PageLoader } from "./States";

export function ProtectedRoute() {
  const session = useSession();
  const location = useLocation();

  if (session.isLoading) {
    return <PageLoader label="Opening attack mode…" />;
  }

  if (session.isError) {
    return (
      <div className="full-page-center">
        <ErrorState
          title="Could not reach the server"
          message={session.error instanceof Error ? session.error.message : "Check the API and try again."}
          onRetry={() => void session.refetch()}
        />
      </div>
    );
  }

  if (!session.data) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}
