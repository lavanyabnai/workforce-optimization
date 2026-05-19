import type { MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { apiUrl } from "~/lib/api";

export const meta: MetaFunction = () => [
  { title: "Schedules — BlueNorth WFM" },
];

type Store = { id: string; name: string; city: string; state: string; division: string };

export async function loader() {
  try {
    const res = await fetch(apiUrl("/api/stores"));
    const stores: Store[] = res.ok ? await res.json() : [];
    return json({ stores });
  } catch {
    return json({ stores: [] as Store[] });
  }
}

export default function Schedules() {
  const { stores } = useLoaderData<typeof loader>();

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Schedules</h1>
        <p className="subtitle">Select a store to build or review its weekly schedule.</p>
      </div>

      {stores.length === 0 ? (
        <div className="empty">
          <div className="spinner" />
          <p className="empty__label" style={{ marginTop: 12 }}>Loading stores…</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Store</th>
                <th>Location</th>
                <th>Division</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        className="pill pill-grey"
                        style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
                      >
                        {store.id}
                      </span>
                      <span style={{ fontWeight: 600 }}>{store.name}</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--c-ink-60)" }}>
                    {store.city}, {store.state}
                  </td>
                  <td>
                    <span className="pill pill-grey">{store.division}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      to={`/schedules/${store.id}/setup`}
                      className="btn btn-primary btn-sm"
                    >
                      Schedule →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
