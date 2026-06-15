import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Code,
  History,
  Database,
  LogOut,
  User,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Chat Assistant", icon: MessageSquare, end: true },
  { to: "/sql-editor", label: "SQL Editor", icon: Code },
  { to: "/history", label: "Query History", icon: History },
  { to: "/schema", label: "Schema Explorer", icon: Database },
];

export function AppLayout() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "User";
  const role = localStorage.getItem("role") || "User";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="p-5 border-b border-slate-800">
          <h1 className="text-lg font-bold text-white tracking-tight">
            Banking Analytics Copilot
          </h1>
          <p className="text-xs text-slate-400 mt-1">Oracle AI SQL Assistant</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <User className="w-3.5 h-3.5" />
            <span>
              {username}{" "}
              <span className="text-slate-500">({role})</span>
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
