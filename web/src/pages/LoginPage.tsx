import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { errorMessage } from "../api/client";
import { PageLoader } from "../components/States";
import { useLogin, useSession } from "../hooks/useAuth";

interface LocationState {
  from?: string;
}

export function LoginPage() {
  const session = useSession();
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as LocationState | null)?.from ?? "/today";

  if (session.isLoading) {
    return <PageLoader label="Checking your session…" />;
  }

  if (session.data) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setError(null);
    try {
      await login.mutateAsync(password);
      navigate(from, { replace: true });
    } catch (loginError) {
      setError(errorMessage(loginError));
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>Attack Mode</span>
        </div>

        <div className="login-heading">
          <span className="eyebrow">Private planner</span>
          <h1>ATTACK TODAY</h1>
          <p>Enter your password to open your plan.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Password</span>
            <div className="input-with-icon">
              <Lock size={17} aria-hidden="true" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                autoFocus
              />
            </div>
          </label>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="button primary login-submit" disabled={login.isPending}>
            {login.isPending ? "Opening…" : "Open attack mode"}
          </button>
        </form>

        <p className="login-footnote">Single-user, self-hosted. Your plan stays in your SQLite database.</p>
      </div>
    </div>
  );
}
