import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";

/* ===================== helpers ===================== */

function asRows(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}

async function safeJson(res) {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function buildQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    const s = String(v).trim();
    if (!s) return;
    qs.set(k, s);
  });
  return qs.toString();
}

async function fetchAllPages(url, { maxPages = 20 } = {}) {
  const all = [];
  let next = url;
  let pages = 0;

  while (next && pages < maxPages) {
    // eslint-disable-next-line no-await-in-loop
    const res = await fetch(next);
    if (!res.ok) break;
    // eslint-disable-next-line no-await-in-loop
    const data = await res.json();
    all.push(...asRows(data));
    next = data?.next || null;
    pages += 1;
    if (Array.isArray(data)) break;
  }
  return all;
}

const nfNum = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const nfMoney = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const num = (n) => nfNum.format(Number(n || 0));
const money = (n) => `$${nfMoney.format(Number(n || 0))}`;

function looksMoneyUnit(unit) {
  return unit === "valor" || unit === "costo";
}

function formatMaybeNumber(s, unit) {
  // backend manda números como string. intentamos formatear sin romper.
  const v = Number(String(s ?? "").replace(",", "."));
  if (!Number.isFinite(v)) return String(s ?? "");
  return looksMoneyUnit(unit) ? money(v) : num(v);
}

/* ===================== UI blocks ===================== */

function Card({ title, right, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        </div>
        {right ? <div className="text-xs text-slate-500">{right}</div> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function KpiGrid({ kpis }) {
  const entries = Object.entries(kpis || {});
  if (entries.length === 0) {
    return <div className="text-sm text-slate-500">Sin KPIs para este reporte.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {entries.map(([k, v]) => (
        <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{k.replaceAll("_", " ")}</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{String(v)}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Render simple (sin librerías) de charts del contrato:
 * - Muestra título + unidad + preview en tabla (labels x serie)
 * Esto evita depender de Recharts ahora mismo, pero deja el backend “listo”.
 */
function ChartPreview({ chart }) {
  if (!chart) return null;

  const labels = Array.isArray(chart.labels) ? chart.labels : [];
  const series = Array.isArray(chart.series) ? chart.series : [];
  const unit = chart.unit || "";

  if (labels.length === 0 || series.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        <div className="font-semibold text-slate-800">{chart.title || chart.id}</div>
        <div className="text-xs text-slate-500 mt-1">Sin datos para graficar.</div>
      </div>
    );
  }

  // Solo preview de primeras 12 filas para no reventar UI
  const max = Math.min(labels.length, 12);

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-900">{chart.title || chart.id}</div>
            <div className="text-xs text-slate-500">
              tipo: <span className="font-mono">{chart.type}</span> • unidad:{" "}
              <span className="font-mono">{unit || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Periodo / Label</th>
              {series.map((s) => (
                <th key={s?.name} className="text-left px-4 py-2.5 font-semibold">
                  {s?.name || "Serie"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: max }).map((_, idx) => (
              <tr key={labels[idx]} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">{labels[idx]}</td>
                {series.map((s, sidx) => (
                  <td key={`${labels[idx]}-${sidx}`} className="px-4 py-2.5 text-slate-700">
                    {formatMaybeNumber(s?.data?.[idx], unit)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {labels.length > max && (
        <div className="px-4 py-2 text-[11px] text-slate-400 border-t border-slate-100">
          Mostrando {max} de {labels.length} puntos.
        </div>
      )}
    </div>
  );
}

function RowsTable({ rows }) {
  if (!rows) return <div className="text-sm text-slate-500">Sin filas.</div>;

  // Caso especial: rows es objeto con secciones (stock por bodega)
  if (!Array.isArray(rows) && typeof rows === "object") {
    const keys = Object.keys(rows);
    if (keys.length === 0) return <div className="text-sm text-slate-500">Sin filas.</div>;

    return (
      <div className="space-y-4">
        {keys.map((k) => (
          <Card key={k} title={`Tabla: ${k}`}>
            <RowsTable rows={rows[k]} />
          </Card>
        ))}
      </div>
    );
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return <div className="text-sm text-slate-500">Sin filas (rows vacío).</div>;
  }

  const columns = Object.keys(rows[0] || {});
  if (columns.length === 0) return <div className="text-sm text-slate-500">Sin columnas.</div>;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs">
            <tr>
              {columns.map((c) => (
                <th key={c} className="text-left px-4 py-2.5 font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                {columns.map((c) => (
                  <td key={c} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                    {String(r?.[c] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===================== main page ===================== */

export default function ReportesPage() {
  // pestañas
  const tabs = useMemo(
    () => [
      { id: "resumen", label: "Dashboard", endpoint: "/reportes/resumen/", hint: "KPIs + series principales" },

      { id: "ins_top_comprados", label: "Insumos • Top comprados", endpoint: "/reportes/insumos/top-comprados/" },
      { id: "ins_top_consumidos", label: "Insumos • Top consumidos", endpoint: "/reportes/insumos/top-consumidos/" },

      { id: "prod_top_vendidos", label: "Productos • Top vendidos", endpoint: "/reportes/productos/top-vendidos/" },
      { id: "prod_serie_ventas", label: "Productos • Serie ventas", endpoint: "/reportes/productos/serie-ventas/" },

      { id: "prod_top_producidos", label: "Producción • Top producidos", endpoint: "/reportes/produccion/top-producidos/" },

      { id: "bod_stock", label: "Bodegas • Stock actual", endpoint: "/reportes/bodegas/stock/" },

      { id: "notas_salidas", label: "Notas • Salidas resumen", endpoint: "/reportes/notas/salidas/resumen/" },
    ],
    []
  );

  const [tab, setTab] = useState("resumen");
  const active = tabs.find((t) => t.id === tab) || tabs[0];

  // catálogos filtros
  const [bodegas, setBodegas] = useState([]);
  const [terceros, setTerceros] = useState([]);

  // filtros estándar
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [bodegaId, setBodegaId] = useState("");
  const [terceroId, setTerceroId] = useState("");
  const [top, setTop] = useState("10");
  const [groupBy, setGroupBy] = useState("dia");

  // data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  // cargar catálogos una vez
  useEffect(() => {
    const load = async () => {
      try {
        const [bodAll, terAll] = await Promise.all([
          fetchAllPages(`${API_BASE}/bodegas/?page_size=200`),
          fetchAllPages(`${API_BASE}/terceros/?page_size=200`),
        ]);
        setBodegas(bodAll);
        setTerceros(terAll);
      } catch (e) {
        // no bloquea reportes, pero muestra warning
        console.error(e);
      }
    };
    load();
  }, []);

  const canUseTop = active.id.includes("top-") || active.id.includes("top_"); // top-* endpoints
  const canUseGroupBy = active.id.includes("serie"); // serie-* endpoints

  const query = useMemo(() => {
    return buildQuery({
      fecha_desde: fechaDesde || null,
      fecha_hasta: fechaHasta || null,
      bodega_id: bodegaId || null,
      tercero_id: terceroId || null,
      top: canUseTop ? top || "10" : null,
      group_by: canUseGroupBy ? groupBy || "dia" : null,
    });
  }, [fechaDesde, fechaHasta, bodegaId, terceroId, top, groupBy, canUseTop, canUseGroupBy]);

  const fetchReport = async () => {
    setError("");
    setPayload(null);
    setLoading(true);

    try {
      const url = `${API_BASE}${active.endpoint}${query ? `?${query}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const d = await safeJson(res);
        throw new Error(d?.detail || JSON.stringify(d) || "Error cargando reporte.");
      }
      const d = await res.json();
      setPayload(d);
    } catch (e) {
      console.error(e);
      setError(e.message || "Error cargando reporte.");
    } finally {
      setLoading(false);
    }
  };

  // auto-load cuando cambias de tab (sin disparar por cada tecla de fecha; solo tab)
  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const charts = Array.isArray(payload?.charts) ? payload.charts : [];
  const kpis = payload?.kpis || {};
  const rows = payload?.rows || [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 lg:p-8 bg-slate-50 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Reportes</h1>
              <p className="text-sm text-slate-500">
                KPIs, series y tablas basadas en <span className="font-mono">/api/reportes/</span>.
              </p>
            </div>
          </div>

          {/* Tabs (mismo look que tu app) */}
          <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-col md:flex-row gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setError("");
                  setPayload(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Filtros estándar */}
          <Card
            title="Filtros"
            right={
              active.hint ? (
                <span className="text-[11px] text-slate-400">{active.hint}</span>
              ) : (
                <span className="text-[11px] text-slate-400">{active.endpoint}</span>
              )
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Bodega</label>
                <select
                  value={bodegaId}
                  onChange={(e) => setBodegaId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Todas</option>
                  {bodegas.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.codigo ? `${b.codigo} — ${b.nombre}` : `${b.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Tercero</label>
                <select
                  value={terceroId}
                  onChange={(e) => setTerceroId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Todos</option>
                  {terceros.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.codigo ? `${t.codigo} — ${t.nombre}` : `${t.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-700">Top</label>
                  <input
                    type="number"
                    min="1"
                    value={top}
                    onChange={(e) => setTop(e.target.value)}
                    disabled={!canUseTop}
                    className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
                      canUseTop ? "border-slate-200" : "border-slate-100 bg-slate-50 text-slate-400"
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">Group by</label>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    disabled={!canUseGroupBy}
                    className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
                      canUseGroupBy ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 text-slate-400"
                    }`}
                  >
                    <option value="dia">dia</option>
                    <option value="mes">mes</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-[11px] text-slate-400">
                URL: <span className="font-mono">{active.endpoint}{query ? `?${query}` : ""}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFechaDesde("");
                    setFechaHasta("");
                    setBodegaId("");
                    setTerceroId("");
                    setTop("10");
                    setGroupBy("dia");
                  }}
                  className="px-4 py-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Limpiar
                </button>

                <button
                  type="button"
                  onClick={fetchReport}
                  disabled={loading}
                  className="px-5 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 disabled:opacity-70"
                >
                  {loading ? "Cargando..." : "Aplicar filtros"}
                </button>
              </div>
            </div>
          </Card>

          {/* Alertas */}
          {(error || loading) && (
            <div className="space-y-2">
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 whitespace-pre-wrap">
                  {error}
                </div>
              )}
              {loading && (
                <div className="rounded-md bg-slate-100 border border-slate-200 px-4 py-3 text-sm text-slate-600">
                  Cargando reporte…
                </div>
              )}
            </div>
          )}

          {/* Contenido */}
          {!loading && payload && (
            <div className="space-y-6">
              <Card title="KPIs">
                <KpiGrid kpis={kpis} />
              </Card>

              <Card title="Gráficos">
                {charts.length === 0 ? (
                  <div className="text-sm text-slate-500">Sin charts (charts vacío).</div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {charts.map((c) => (
                      <ChartPreview key={c.id || c.title} chart={c} />
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Detalle (rows)">
                <RowsTable rows={rows} />
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
