import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="page not-found-page">
      <div className="page-state empty-state">
        <span className="not-found-code">404</span>
        <h2>This page does not exist</h2>
        <p>The date or link may be wrong. Head back to today's plan.</p>
        <Link to="/today" className="button primary">
          Back to today
        </Link>
      </div>
    </div>
  );
}
