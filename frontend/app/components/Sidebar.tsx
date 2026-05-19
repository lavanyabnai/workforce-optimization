import { NavLink } from "@remix-run/react";
import { usePersonaStore } from "~/stores/persona";

function IconDashboard() {
  return (
    <svg className="nav-item__icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="7" height="7" rx="1" />
      <rect x="10" y="1" width="7" height="7" rx="1" />
      <rect x="1" y="10" width="7" height="7" rx="1" />
      <rect x="10" y="10" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconPlans() {
  return (
    <svg className="nav-item__icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="14" height="14" rx="2" />
      <line x1="5" y1="6" x2="13" y2="6" />
      <line x1="5" y1="9" x2="13" y2="9" />
      <line x1="5" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconPerformance() {
  return (
    <svg className="nav-item__icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,14 6,9 10,11 14,5 16,7" />
      <line x1="2" y1="16" x2="16" y2="16" />
    </svg>
  );
}

function IconSchedules() {
  return (
    <svg className="nav-item__icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="14" height="13" rx="2" />
      <line x1="5" y1="1" x2="5" y2="5" />
      <line x1="13" y1="1" x2="13" y2="5" />
      <line x1="2" y1="7" x2="16" y2="7" />
    </svg>
  );
}

function IconStores() {
  return (
    <svg className="nav-item__icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7.5L9 2l7 5.5V16a1 1 0 01-1 1H3a1 1 0 01-1-1V7.5z" />
      <rect x="6" y="10" width="6" height="7" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className="nav-item__icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="2.5" />
      <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.1 3.1l1.4 1.4M13.5 13.5l1.4 1.4M3.1 14.9l1.4-1.4M13.5 4.5l1.4-1.4" />
    </svg>
  );
}

const LIN_TOOLTIP = "Available to your manager only";

export function Sidebar() {
  const { persona } = usePersonaStore();
  const isLin = persona.id === "lin";

  function DisabledNavItem({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
      <span
        className="nav-item nav-item--disabled"
        title={LIN_TOOLTIP}
        aria-disabled="true"
        style={{ cursor: "not-allowed", opacity: 0.4 }}
      >
        {icon}
        {label}
      </span>
    );
  }

  return (
    <nav className="sidebar">
      <div className="sidebar__brand">
        <svg
          className="sidebar__logo-mark"
          viewBox="0 0 45 60"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="7-Eleven"
        >
          <style>{`.st0{clip-path:url(#SVGID_2_);fill:#147350;}.st1{clip-path:url(#SVGID_2_);fill:#FF6C00;}.st2{clip-path:url(#SVGID_2_);fill:#EB0F2A;}`}</style>
          <g>
            <defs>
              <rect id="SVGID_1_" width="45" height="59.9" />
            </defs>
            <clipPath id="SVGID_2_">
              <use href="#SVGID_1_" style={{ overflow: "visible" }} />
            </clipPath>
            <path className="st0" d="M34.2,45c0.9,0,1.7,0.8,1.7,1.7c0,0.9-0.7,1.7-1.7,1.7c-0.9,0-1.6-0.8-1.6-1.7C32.6,45.8,33.3,45,34.2,45 M34.2,48c0.7,0,1.3-0.6,1.3-1.3c0-0.8-0.6-1.3-1.3-1.3c-0.7,0-1.3,0.6-1.3,1.3C32.9,47.5,33.5,48,34.2,48 M34,47.6h-0.3v-1.8h0.6c0.4,0,0.6,0.2,0.6,0.6c0,0.3-0.2,0.5-0.4,0.5l0.4,0.7h-0.4l-0.4-0.7H34V47.6z M34.2,46.6c0.2,0,0.3-0.1,0.3-0.3c0-0.2-0.1-0.3-0.3-0.3H34v0.5H34.2z" />
            <path className="st0" d="M42.2,32.3c-0.9,0-1.5,0.4-2.1,0.9l-0.4,0.6l-0.1-0.1l0.5-0.8v-0.5h-3.2v10.6h2.9v-6.7c0-1.1,0.7-1.4,1.2-1.5c0.5-0.1,1.1,0.2,1.1,0.8v7.4H45v-7.3C45,33.4,44,32.3,42.2,32.3" />
            <polygon className="st0" points="9.9,40.6 12.9,40.6 12.9,42.9 7,42.9 7,32.3 9.9,32.3" />
            <polygon className="st0" points="0,42.9 5.9,42.9 5.9,40.8 2.9,40.8 2.9,38.5 5.9,38.5 5.9,36.5 2.9,36.5 2.9,34.5 5.9,34.5 5.9,32.3 0,32.3" />
            <polygon className="st0" points="13.9,42.9 19.9,42.9 19.9,40.8 16.8,40.8 16.8,38.5 19.9,38.5 19.9,36.5 16.8,36.5 16.8,34.5 19.9,34.5 19.9,32.3 13.9,32.3" />
            <polygon className="st0" points="29.9,42.9 35.9,42.9 35.9,40.8 32.8,40.8 32.8,38.5 35.9,38.5 35.9,36.5 32.8,36.5 32.8,34.5 35.9,34.5 35.9,32.3 29.9,32.3" />
            <polygon className="st0" points="26.1,32.3 26.1,32.3 26.1,32.3 25,39 24.9,40.2 24.9,40.3 24.8,40.3 24.8,40.2 24.7,39 23.6,32.3 23.6,32.3 20.7,32.3 23.1,42.9 26.7,42.9 29.1,32.3" />
            <path className="st1" d="M37.7,0H0v15h19.9C24.4,8.5,30.5,3.3,37.7,0" />
            <polygon className="st2" points="15,59.9 30,59.9 30,44.9 15,44.9" />
            <path className="st2" d="M45,15V0C30.7,3.9,19.5,15.4,16.1,30h15.3C33.7,23.3,38.7,17.9,45,15" />
          </g>
        </svg>
        <span className="sidebar__wordmark">BlueNorth WFM</span>
      </div>

      <div className="sidebar__nav">
        <div className="sidebar__nav-section">
          <span className="sidebar__nav-label">Workspace</span>

          {isLin ? (
            <DisabledNavItem icon={<IconDashboard />} label="Dashboard" />
          ) : (
            <NavLink to="/dashboard" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
              <IconDashboard />
              Dashboard
            </NavLink>
          )}

          {isLin ? (
            <DisabledNavItem icon={<IconPlans />} label="Plans" />
          ) : (
            <NavLink to="/plans" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
              <IconPlans />
              Plans
            </NavLink>
          )}

          {isLin ? (
            <DisabledNavItem icon={<IconPerformance />} label="Performance" />
          ) : (
            <NavLink to="/performance" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
              <IconPerformance />
              Performance
            </NavLink>
          )}

          {/* Schedules: always enabled */}
          <NavLink to="/schedules" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            <IconSchedules />
            Schedules
          </NavLink>
        </div>

        <div className="sidebar__nav-section">
          <span className="sidebar__nav-label">Admin</span>

          {isLin ? (
            <DisabledNavItem icon={<IconStores />} label="Stores" />
          ) : (
            <NavLink to="/stores" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
              <IconStores />
              Stores
            </NavLink>
          )}

          {isLin ? (
            <DisabledNavItem icon={<IconSettings />} label="Settings" />
          ) : (
            <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
              <IconSettings />
              Settings
            </NavLink>
          )}
        </div>
      </div>

      <div className="sidebar__footer">
        <div
          className="sidebar__avatar"
          style={{ background: persona.color, color: persona.textColor }}
        >
          {persona.initials}
        </div>
        <div>
          <div className="sidebar__user-name">{persona.name}</div>
          <div className="sidebar__user-role">{persona.role}</div>
        </div>
      </div>
    </nav>
  );
}
