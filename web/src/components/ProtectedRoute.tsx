import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useSession } from "../hooks/useAuth";
import { ErrorState } from "./States";

export function ProtectedRoute() {
  const session = useSession();
  const location = useLocation();

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

  // Render immediately while the session check is in flight so the page's
  // heading is not blocked on /api/auth/me. A successful check keeps the
  // outlet mounted; a failed one redirects as soon as the answer is known.
  if (session.data === false) {
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
