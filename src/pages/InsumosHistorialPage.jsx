import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";
import CreateInsumoMovimientoModal from "../components/CreateInsumoMovimientoModal";

const PAGE_SIZE = 30;

function asRows(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
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
    const rows = asRows(data);
    all.push(...rows);

    next = data?.next || null;
    pages += 1;

    if (Array.isArray(data)) break;
  }

  return all;
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

const TIPOS = [
  { value: "", label: "Todos" },
  { value: "CREACION", label: "CREACION" },
  { value: "ENTRADA", label: "ENTRADA" },
  { value: "SALIDA", label: "SALIDA" },
  { value: "CONSUMO_ENSAMBLE", label: "CONSUMO_ENSAMBLE" },
  { value: "AJUSTE", label: "AJUSTE" },
  { value: "EDICION", label: "EDICION" },
];

function getTipoColor(tipo) {
  switch (tipo) {
    case "CREACION":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "ENTRADA":
      return "bg-green-100 text-green-800 border-green-200";
    case "SALIDA":
      return "bg-red-100 text-red-800 border-red-200";
    case "CONSUMO_ENSAMBLE":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "AJUSTE":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "EDICION":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export default function InsumosHistorialPage() {
  // movimientos (paginado)
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  // catálogos para filtros y modal
  const [insumos, setInsumos] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [terceros, setTerceros] = useState([]);

  // filtros
  const [fInsumo, setFInsumo] = useState("");
  const [fTipo, setFTipo] = useState("");
  const [fBodega, setFBodega] = useState("");
  const [fTercero, setFTercero] = useState("");

  // búsqueda local (en la página)
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // modal movimiento
  const [isMoveOpen, setIsMoveOpen] = useState(false);

  const insumoOptions = useMemo(
    () =>
      insumos.map((i) => ({
        codigo: i.codigo,
        label: `${i.codigo} - ${i.nombre}`,
      })),
    [insumos]
  );

  const bodegaOptions = useMemo(
    () =>
      bodegas.map((b) => ({
        id: b.id,
        label: `${b.codigo} - ${b.nombre}`,
      })),
    [bodegas]
  );

  const terceroOptions = useMemo(
    () =>
      terceros.map((t) => ({
        id: t.id,
        label: `${t.codigo} - ${t.nombre}`,
      })),
    [terceros]
  );

  async function loadCatalogs() {
    const [insAll, bodAll, terAll] = await Promise.all([
      fetchAllPages(`${API_BASE}/insumos/?page_size=200`),
      fetchAllPages(`${API_BASE}/bodegas/?page_size=200`),
      fetchAllPages(`${API_BASE}/terceros/?page_size=200`),
    ]);

    setInsumos(insAll);
    setBodegas(bodAll);
    setTerceros(terAll);
  }

  async function loadMovimientos(targetPage = 1, overrideFilters = null) {
    const filters = overrideFilters || {
      insumo: fInsumo,
      tipo: fTipo,
      bodega_id: fBodega,
      tercero_id: fTercero,
    };

    const qs = buildQuery({
      page: targetPage,
      page_size: PAGE_SIZE,
      ...filters,
    });

    const url = `${API_BASE}/insumo-movimientos/?${qs}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo cargar el kardex de insumos.");

    const data = await res.json();

    setRows(asRows(data));
    setCount(Number(data?.count || 0));
    setNextUrl(data?.next || null);
    setPrevUrl(data?.previous || null);
    setPage(targetPage);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        await Promise.all([loadCatalogs(), loadMovimientos(1)]);
      } catch (e) {
        console.error(e);
        setError(e.message || "Error cargando kardex.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLocalRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((r) => {
      const a = (r.insumo_codigo || "").toLowerCase().includes(term);
      const b = (r.insumo_nombre || "").toLowerCase().includes(term);
      const c = (r.tipo || "").toLowerCase().includes(term);
      const d = (r.tercero_nombre || "").toLowerCase().includes(term);
      const e = (r.bodega_nombre || "").toLowerCase().includes(term);
      const f = (r.factura || "").toLowerCase().includes(term);
      const g = (r.observacion || "").toLowerCase().includes(term);
      return a || b || c || d || e || f || g;
    });
  }, [rows, search]);

  async function applyFilters() {
    try {
      setLoading(true);
      setError("");
      await loadMovimientos(1);
    } catch (e) {
      console.error(e);
      setError(e.message || "Error aplicando filtros.");
    } finally {
      setLoading(false);
    }
  }

  async function clearFilters() {
    setFInsumo("");
    setFTipo("");
    setFBodega("");
    setFTercero("");
    setSearch("");

    try {
      setLoading(true);
      setError("");
      await loadMovimientos(1, { insumo: "", tipo: "", bodega_id: "", tercero_id: "" });
    } catch (e) {
      console.error(e);
      setError(e.message || "Error limpiando filtros.");
    } finally {
      setLoading(false);
    }
  }

  async function goPrev() {
    if (!prevUrl || loading) return;
    try {
      setLoading(true);
      setError("");
      await loadMovimientos(Math.max(1, page - 1));
    } catch (e) {
      console.error(e);
      setError(e.message || "Error paginando.");
    } finally {
      setLoading(false);
    }
  }

  async function goNext() {
    if (!nextUrl || loading) return;
    try {
      setLoading(true);
      setError("");
      await loadMovimientos(page + 1);
    } catch (e) {
      console.error(e);
      setError(e.message || "Error paginando.");
    } finally {
      setLoading(false);
    }
  }

  function openMoveModal() {
    setIsMoveOpen(true);
  }

  function closeMoveModal() {
    setIsMoveOpen(false);
  }

  async function onCreatedMovement() {
    // refrescar kardex manteniendo filtros y página actual
    await loadMovimientos(page);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Historial de Insumos (Kardex)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Movimientos globales: creación, entradas, salidas, consumos por ensamble y ajustes.
          </p>
        </div>

        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700"
          onClick={openMoveModal}
        >
          <span className="text-lg leading-none">＋</span>
          Registrar movimiento
        </button>
      </div>

      {/* filtros */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Insumo</label>
            <select
              value={fInsumo}
              onChange={(e) => setFInsumo(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              {insumoOptions.map((i) => (
                <option key={i.codigo} value={i.codigo}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Tipo</label>
            <select
              value={fTipo}
              onChange={(e) => setFTipo(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {TIPOS.map((t) => (
                <option key={t.value || "all"} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Bodega</label>
            <select
              value={fBodega}
              onChange={(e) => setFBodega(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas</option>
              {bodegaOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Tercero</label>
            <select
              value={fTercero}
              onChange={(e) => setFTercero(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              {terceroOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Buscar (en esta página)</label>
            <div className="flex items-center bg-white rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm">
              <span className="mr-2 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                placeholder="insumo, tipo, tercero, bodega..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <button
            type="button"
            onClick={clearFilters}
            disabled={loading}
            className="px-3 py-2 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-70"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={applyFilters}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-slate-900 text-white text-xs font-medium shadow-sm hover:bg-slate-800 disabled:opacity-70"
          >
            Aplicar filtros
          </button>
        </div>
      </div>

      {/* header paginación */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-xs text-slate-500">
          Total: <b>{count}</b> • Página <b>{page}</b>
          <span className="ml-2 text-[11px] text-slate-400">(mostrando {PAGE_SIZE} por página)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!prevUrl || loading}
            onClick={goPrev}
            className="px-3 py-1.5 rounded-md border border-slate-200 text-xs disabled:opacity-50 hover:bg-slate-50"
          >
            ← Anterior
          </button>
          <button
            type="button"
            disabled={!nextUrl || loading}
            onClick={goNext}
            className="px-3 py-1.5 rounded-md border border-slate-200 text-xs disabled:opacity-50 hover:bg-slate-50"
          >
            Siguiente →
          </button>
        </div>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading && <div className="p-6 text-sm text-slate-600">Cargando kardex...</div>}
        {error && !loading && <div className="p-6 text-sm text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Insumo</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Bodega</th>
                  <th className="px-4 py-3 text-left">Tercero</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                  <th className="px-4 py-3 text-left">U.M.</th>
                  <th className="px-4 py-3 text-right">Costo</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3 text-left">Factura</th>
                  <th className="px-4 py-3 text-left">Observación</th>
                  <th className="px-4 py-3 text-center">Nota</th>
                </tr>
              </thead>

              <tbody>
                {filteredLocalRows.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-6 py-6 text-center text-sm text-slate-500">
                      No hay movimientos para mostrar.
                    </td>
                  </tr>
                )}

                {filteredLocalRows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-xs text-slate-600">{r.fecha}</td>

                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-800 font-medium">{r.insumo_codigo}</div>
                      <div className="text-xs text-slate-500">{r.insumo_nombre}</div>
                    </td>

                    <td className="px-4 py-3 text-xs">
                      <span className={`inline-flex px-2 py-1 rounded-md border text-[10px] font-semibold tracking-wide ${getTipoColor(r.tipo)}`}>
                        {r.tipo}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-700">{r.bodega_nombre || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{r.tercero_nombre || "—"}</td>

                    <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-800">{r.cantidad}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{r.unidad_medida || "—"}</td>

                    <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-700">
                      {r.costo_unitario ? `$${r.costo_unitario}` : "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-700">
                      {r.total ? `$${r.total}` : "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-700">
                      {r.saldo_resultante ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-700">{r.factura || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{r.observacion || "—"}</td>

                    <td className="px-4 py-3 text-center text-xs text-slate-700">
                      {r.nota_ensamble ? `#${r.nota_ensamble}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CreateInsumoMovimientoModal
        isOpen={isMoveOpen}
        onClose={closeMoveModal}
        insumoOptions={insumoOptions}
        terceroOptions={terceroOptions}
        bodegaOptions={bodegaOptions}
        onCreated={onCreatedMovement}
      />
    </div>
  );
}
