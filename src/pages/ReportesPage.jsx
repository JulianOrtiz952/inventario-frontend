import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";
import { asRows, safeJson, fetchAllPages, buildQueryParams } from "../utils/api";
import { formatCurrency } from "../utils/format";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, Package, ShoppingCart, Truck, Layers,
  BarChart3, PieChart as PieChartIcon, LayoutDashboard, Calendar, Search, FilterX,
  CreditCard, Boxes, Activity, ArrowUpRight, ArrowDownRight
} from "lucide-react";

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#a855f7'
];

const num = (n) => formatCurrency(n);
const money = (n) => `$${formatCurrency(n)}`;

function looksMoneyUnit(unit) {
  const u = String(unit || "").toLowerCase();
  return u.includes("valor") || u.includes("costo") || u.includes("total");
}

function formatMaybeNumber(s, unit) {
  // backend manda números como string. intentamos formatear sin romper.
  const v = Number(String(s ?? "").replace(",", "."));
  if (!Number.isFinite(v)) return String(s ?? "");
  return looksMoneyUnit(unit) ? money(v) : num(v);
}

/* ===================== UI blocks ===================== */

function Card({ title, subtitle, icon: Icon, right, children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          {Icon && <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
            <Icon size={18} />
          </div>}
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {right && <div className="text-xs text-slate-500 dark:text-slate-400">{right}</div>}
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

function KpiItem({ label, value, icon: Icon, color = "blue" }) {
  const colorMaps = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  };

  return (
    <div className="relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-all hover:scale-[1.02] hover:shadow-lg">
      <div className="flex items-center justify-between items-start">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {label.replaceAll("_", " ")}
          </p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={`rounded-xl p-3 ${colorMaps[color] || colorMaps.blue}`}>
            <Icon size={24} />
          </div>
        )}
      </div>
      <div className="absolute -bottom-6 -right-6 opacity-[0.03] dark:opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform">
        {Icon && <Icon size={120} />}
      </div>
    </div>
  );
}

function KpiGrid({ kpis }) {
  const entries = Object.entries(kpis || {});
  if (entries.length === 0) {
    return <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">Sin KPIs para este reporte.</div>;
  }

  const getIcon = (k) => {
    const key = k.toLowerCase();
    if (key.includes("venta") || key.includes("salida")) return ShoppingCart;
    if (key.includes("compra") || key.includes("entrada")) return CreditCard;
    if (key.includes("producc") || key.includes("ensamble")) return Layers;
    if (key.includes("inve") || key.includes("stock") || key.includes("unidad")) return Package;
    if (key.includes("traslado")) return Truck;
    if (key.includes("costo") || key.includes("valor")) return Activity;
    return BarChart3;
  };

  const getColor = (k) => {
    const key = k.toLowerCase();
    if (key.includes("venta") || key.includes("salida")) return "green";
    if (key.includes("compra") || key.includes("entrada")) return "blue";
    if (key.includes("producc") || key.includes("ensamble")) return "purple";
    if (key.includes("costo") || key.includes("valor")) return "orange";
    return "blue";
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {entries.map(([k, v]) => (
        <KpiItem
          key={k}
          label={k}
          value={formatMaybeNumber(v, k)}
          icon={getIcon(k)}
          color={getColor(k)}
        />
      ))}
    </div>
  );
}

function CustomTooltip({ active, payload, label, unit }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 shadow-xl rounded-xl">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 py-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{entry.name}</p>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {formatMaybeNumber(entry.value, unit)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function ChartRenderer({ chart }) {
  if (!chart) return null;

  const labels = Array.isArray(chart.labels) ? chart.labels : [];
  const series = Array.isArray(chart.series) ? chart.series : [];
  const unit = chart.unit || "";

  if (labels.length === 0 || series.length === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
        <BarChart3 className="text-slate-300 dark:text-slate-600 mb-3" size={48} />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sin datos para graficar.</p>
      </div>
    );
  }

  // Prepara datos para recharts
  const data = labels.map((label, idx) => {
    const obj = { name: label };
    series.forEach(s => {
      obj[s.name] = Number(s?.data?.[idx]) || 0;
    });
    return obj;
  });

  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const renderChart = () => {
    switch (chart.type) {
      case 'pie':
        const pieData = series[0]?.data?.map((val, idx) => ({
          name: labels[idx],
          value: Number(val)
        })) || [];
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="rgba(0,0,0,0.1)" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
          </PieChart>
        );

      case 'line':
        return (
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="name" stroke={textColor} fontSize={10} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke={textColor} fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ stroke: gridColor, strokeWidth: 2 }} />
            {series.map((s, idx) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: isDark ? '#0f172a' : '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1500}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {series.map((s, idx) => (
                <linearGradient key={`grad-${idx}`} id={`color-${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="name" stroke={textColor} fontSize={10} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke={textColor} fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            {series.map((s, idx) => (
              <Area
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                fillOpacity={1}
                fill={`url(#color-${idx})`}
                strokeWidth={2}
                animationDuration={1500}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
      default:
        return (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="name" stroke={textColor} fontSize={10} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke={textColor} fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }} />
            {series.map((s, idx) => (
              <Bar
                key={s.name}
                dataKey={s.name}
                fill={CHART_COLORS[idx % CHART_COLORS.length]}
                radius={[4, 4, 0, 0]}
                barSize={32}
                animationDuration={1500}
              />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className="h-[350px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}

function RowsTable({ rows }) {
  if (!rows) return <div className="text-sm text-slate-500 dark:text-slate-400 italic">Sin filas.</div>;

  if (!Array.isArray(rows) && typeof rows === "object") {
    const keys = Object.keys(rows).filter(k => k !== 'ok' && k !== 'filters' && k !== 'kpis' && k !== 'charts');
    if (keys.length === 0) return <div className="text-sm text-slate-500 dark:text-slate-400 italic text-center p-8">Sin filas.</div>;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {keys.map((k) => (
          <Card key={k} title={`Detalle: ${k}`} icon={Search}>
            <RowsTable rows={rows[k]} />
          </Card>
        ))}
      </div>
    );
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return <div className="text-sm text-slate-500 dark:text-slate-400 italic text-center p-8">Sin datos para mostrar en la tabla.</div>;
  }

  const columns = Object.keys(rows[0] || {});
  if (columns.length === 0) return <div className="text-sm text-slate-500 dark:text-slate-400 italic">Sin columnas.</div>;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="overflow-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest font-bold">
            <tr>
              {columns.map((c) => (
                <th key={c} className="text-left px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                  {c.replaceAll("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                {columns.map((c) => (
                  <td key={c} className="px-5 py-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                    {formatMaybeNumber(r?.[c] ?? "—", c)}
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
        setBodegas(bodAll || []);
        setTerceros(terAll || []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const canUseTop = active.id.includes("top-") || active.id.includes("top_");
  const canUseGroupBy = active.id.includes("serie");

  const query = useMemo(() => {
    return buildQueryParams({
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
      const url = `${API_BASE}${active.endpoint}${query}`;
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

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const charts = Array.isArray(payload?.charts) ? payload.charts : [];
  const kpis = payload?.kpis || {};
  const rows = payload?.rows || [];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 p-6 lg:p-10 overflow-auto scroll-smooth">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200 dark:shadow-none">
                  <LayoutDashboard size={24} />
                </div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Reportes de Negocio</h1>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium opacity-80">
                Visualiza el rendimiento de <span className="text-blue-600 dark:text-blue-400 font-bold">CALA</span> en tiempo real.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTab(t.id);
                    setError("");
                    setPayload(null);
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${tab === t.id
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg scale-[1.05]"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Filtros */}
            <div className="lg:col-span-1 space-y-6">
              <Card
                title="Filtros"
                subtitle="Refina tus resultados"
                icon={FilterX}
                right={active.hint || active.endpoint}
              >
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={12} /> Periodo Desde
                    </label>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={12} /> Periodo Hasta
                    </label>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Bodega</label>
                    <select
                      value={bodegaId}
                      onChange={(e) => setBodegaId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      <option value="">Todas las bodegas</option>
                      {bodegas.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.codigo ? `${b.codigo} — ${b.nombre}` : `${b.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tercero</label>
                    <select
                      value={terceroId}
                      onChange={(e) => setTerceroId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      <option value="">Todos los terceros</option>
                      {terceros.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.codigo ? `${t.codigo} — ${t.nombre}` : `${t.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Top</label>
                      <input
                        type="number"
                        min="1"
                        value={top}
                        onChange={(e) => setTop(e.target.value)}
                        disabled={!canUseTop}
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${canUseTop
                            ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            : "border-slate-100 dark:border-slate-900 bg-slate-100/50 dark:bg-slate-900/50 text-slate-400 cursor-not-allowed"
                          }`}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Agrupar</label>
                      <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                        disabled={!canUseGroupBy}
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${canUseGroupBy
                            ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            : "border-slate-100 dark:border-slate-900 bg-slate-100/50 dark:bg-slate-900/50 text-slate-400 cursor-not-allowed"
                          }`}
                      >
                        <option value="dia">Día</option>
                        <option value="mes">Mes</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={fetchReport}
                      disabled={loading}
                      className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-xl shadow-blue-200 dark:shadow-none transition-all disabled:opacity-70 flex items-center justify-center gap-2 active:scale-95"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Search size={16} />
                          Aplicar Filtros
                        </>
                      )}
                    </button>
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
                      className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      Limpiar todo
                    </button>
                  </div>
                </div>
              </Card>

              {error && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                    <Activity size={16} />
                    <p className="text-xs font-bold uppercase tracking-wider">Error de Carga</p>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium whitespace-pre-wrap">{error}</p>
                </div>
              )}
            </div>

            {/* Contenido Principal */}
            <div className="lg:col-span-3 space-y-8">
              {loading ? (
                <div className="h-[600px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10 pointer-events-none"></div>
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 border-4 border-blue-600/10 border-b-blue-600 rounded-full animate-spin-reverse"></div>
                    </div>
                  </div>
                  <p className="mt-8 text-slate-500 dark:text-slate-400 font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Analizando indicadores...</p>
                </div>
              ) : payload ? (
                <>
                  {/* KPIs Section */}
                  <KpiGrid kpis={kpis} />

                  {/* Charts Section */}
                  {charts.length > 0 && (
                    <div className="grid grid-cols-1 gap-8">
                      {charts.map((c, idx) => (
                        <Card
                          key={c.id || idx}
                          title={c.title || "Análisis Visual"}
                          subtitle={`${c.type.toUpperCase()} chart • Unidad: ${c.unit || 'N/A'}`}
                          icon={c.type === 'pie' ? PieChartIcon : BarChart3}
                        >
                          <ChartRenderer chart={c} />
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Table Section */}
                  <Card
                    title="Detalle de Datos"
                    subtitle="Vista tabular completa"
                    icon={Search}
                  >
                    <RowsTable rows={rows} />
                  </Card>
                </>
              ) : (
                <div className="h-[600px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="p-8 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-300 dark:text-slate-700 mb-8 transform hover:scale-110 transition-transform">
                    <Search size={80} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Sin información disponible</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-sm text-center font-medium px-6 leading-relaxed">
                    Ajusta los filtros o selecciona otra pestaña para comenzar a visualizar los datos estratégicos de tu negocio.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
