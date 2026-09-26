import { useAuth } from "./context/AuthContext";

/**
 * Shared shell for both dashboards. Tabs are swapped purely via React state
 * (see activeTab/onTabChange) — there is no route change and no browser
 * navigation here, which is what makes the switch instant with zero page
 * reload, the defining trait of a React single-page app.
 */
export default function DashboardFrame({ title, tabs, activeTab, onTabChange, children }) {
  const { logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-mark">IAP</div>
          <div>
            <h1>{title}</h1>
            <p className="sidebar-sub">Internship Approval Portal</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={activeTab === t.key ? "active" : ""}
              onClick={() => onTabChange(t.key)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </nav>

        <button className="sidebar-logout" onClick={logout} type="button">
          Logout
        </button>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}