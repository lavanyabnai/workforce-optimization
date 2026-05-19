import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useNavigation,
  useRouteError,
} from "@remix-run/react";

import { Sidebar } from "~/components/Sidebar";
import { TopBar } from "~/components/TopBar";
import colorsAndType from "~/styles/colors_and_type.css?url";
import appStyles from "~/styles/app.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: colorsAndType },
  { rel: "stylesheet", href: appStyles },
];

function PendingBar() {
  const navigation = useNavigation();
  if (navigation.state === "idle") return null;
  return <div className="pending-bar" />;
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="seven-eleven">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>404 — BlueNorth WFM</title>
          <Links />
        </head>
        <body className="seven-eleven">
          <div className="not-found">
            <div className="not-found__inner">
              <span className="eyebrow">BlueNorth WFM</span>
              <h1>Page not found</h1>
              <p>The page you&rsquo;re looking for doesn&rsquo;t exist.</p>
              <a href="/plans" className="btn btn-primary">
                Go to Plans
              </a>
            </div>
          </div>
          <Scripts />
        </body>
      </html>
    );
  }

  const message =
    isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText}`
      : error instanceof Error
      ? error.message
      : "Unknown error";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Error — BlueNorth WFM</title>
        <Links />
      </head>
      <body className="seven-eleven">
        <div className="not-found">
          <div className="not-found__inner">
            <span className="eyebrow">Error</span>
            <h1>Something went wrong</h1>
            <p style={{ color: "var(--c-ink-60)", fontSize: 13 }}>{message}</p>
            <a href="/plans" className="btn btn-primary">
              Return home
            </a>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <div className="app">
      <PendingBar />
      <Sidebar />
      <main className="main">
        <TopBar />
        <Outlet />
      </main>
    </div>
  );
}
