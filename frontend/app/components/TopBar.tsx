import { useMatches, useNavigate, useRevalidator } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { PERSONAS, usePersonaStore } from "~/stores/persona";

function IconHelp() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="8" />
      <path d="M6.8 6.8a2.2 2.2 0 014 1.4c0 1.4-2 2-2 3" />
      <circle cx="9" cy="13.5" r=".5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1.5a5.5 5.5 0 015.5 5.5c0 3 1 4 1.5 5H2c.5-1 1.5-2 1.5-5A5.5 5.5 0 019 1.5z" />
      <path d="M7 14.5a2 2 0 004 0" />
    </svg>
  );
}

export function TopBar() {
  const matches = useMatches();
  const { persona, setPersona } = usePersonaStore();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showPersonaSwitcher, setShowPersonaSwitcher] = useState(false);

  useEffect(() => {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const hasParam =
      new URLSearchParams(window.location.search).get("persona-switcher") === "1";
    if (hasParam) {
      try { localStorage.setItem("bnw_persona_switcher", "1"); } catch { /* ignore */ }
    }
    const persisted = (() => { try { return localStorage.getItem("bnw_persona_switcher") === "1"; } catch { return false; } })();
    setShowPersonaSwitcher(isLocalhost || hasParam || persisted);
  }, []);

  const pageTitle = matches
    .slice()
    .reverse()
    .find((m) => (m.handle as { pageTitle?: string } | undefined)?.pageTitle)
    ?.handle as { pageTitle?: string } | undefined;

  const title = pageTitle?.pageTitle ?? "BlueNorth WFM";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handlePersonaSelect(id: (typeof PERSONAS)[number]["id"]) {
    setPersona(id);
    setDropdownOpen(false);
    navigate(0); // reload current route so loader data re-fetches
    revalidator.revalidate();
  }

  return (
    <header className="topbar">
      <div className="topbar__title">{title}</div>
      <div className="topbar__actions">
        <button className="topbar__icon-btn" aria-label="Help" type="button">
          <IconHelp />
        </button>
        <button className="topbar__icon-btn" aria-label="Notifications" type="button">
          <IconBell />
        </button>

        <div style={{ position: "relative" }} ref={dropdownRef}>
          <button
            className="topbar__icon-btn"
            style={{
              background: persona.color,
              color: persona.textColor,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 12,
              borderRadius: "50%",
              width: 32,
              height: 32,
            }}
            aria-label="User menu"
            type="button"
            onClick={() => showPersonaSwitcher && setDropdownOpen((v) => !v)}
            title={showPersonaSwitcher ? undefined : persona.name}
          >
            {persona.initials}
          </button>

          {showPersonaSwitcher && dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                background: "var(--c-white)",
                border: "var(--border-ink)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-sticker)",
                minWidth: 200,
                zIndex: 50,
                padding: "8px 0",
              }}
            >
              <div
                style={{
                  padding: "4px 16px 8px",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--c-ink-60)",
                  borderBottom: "var(--border-default)",
                  marginBottom: 4,
                }}
              >
                Switch Persona
              </div>
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePersonaSelect(p.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "8px 16px",
                    background: persona.id === p.id ? "var(--c-signal-light)" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: persona.id === p.id ? 700 : 500,
                    color: "var(--c-ink)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: p.color,
                      color: p.textColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 800,
                      fontFamily: "var(--font-display)",
                      flexShrink: 0,
                    }}
                  >
                    {p.initials}
                  </span>
                  <span>
                    <div>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--c-ink-60)", fontWeight: 400 }}>{p.role}</div>
                  </span>
                </button>
              ))}
              <div style={{ borderTop: "var(--border-default)", marginTop: 4, paddingTop: 4 }}>
                <button
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "8px 16px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--c-ink-60)",
                    fontFamily: "var(--font-body)",
                  }}
                  onClick={() => setDropdownOpen(false)}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
