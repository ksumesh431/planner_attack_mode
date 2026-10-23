import {
  BarChart3,
  CalendarDays,
  LogOut,
  Sun,
  Sunrise,
  type LucideIcon,
} from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { useLogout } from "../hooks/useAuth";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { to: "/today", label: "Today", icon: Sun },
  { to: "/tomorrow", label: "Tomorrow", icon: Sunrise },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/stats", label: "Stats", icon: BarChart3 },
];

export function AppShell() {
  const logout = useLogout();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate("/login", { replace: true }),
    });
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <Link to="/today" className="brand" aria-label="Attack Mode home">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Attack Mode</span>
        </Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `desktop-nav-link${isActive ? " active" : ""}`}
            >
              <item.icon size={16} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="icon-button logout-button"
          onClick={handleLogout}
          disabled={logout.isPending}
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={18} />
        </button>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `bottom-nav-link${isActive ? " active" : ""}`}
          >
            <item.icon size={20} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
