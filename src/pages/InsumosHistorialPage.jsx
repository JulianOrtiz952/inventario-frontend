import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";
import CreateInsumoMovimientoModal from "../components/CreateInsumoMovimientoModal";
import { asRows, fetchAllPages, buildQueryParams } from "../utils/api";
import { formatCurrency, formatDateTime } from "../utils/format";

const PAGE_SIZE = 30;



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
      return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
    case "ENTRADA":
      return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800";
    case "SALIDA":
      return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800";
    case "CONSUMO_ENSAMBLE":
      return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800";
    case "AJUSTE":
      return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800";
    case "EDICION":
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    default:
      return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
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

    setInsumos(insAll.filter((x) => x.es_activo !== false));
    setBodegas(bodAll.filter((x) => x.es_activo !== false));
    setTerceros(terAll.filter((x) => x.es_activo !== false));
  }

  async function loadMovimientos(targetPage = 1, overrideFilters = null) {
    const filters = overrideFilters || {
      insumo: fInsumo,
      tipo: fTipo,
      bodega_id: fBodega,
      tercero_id: fTercero,
    };

    const query = buildQueryParams({
      page: targetPage,
      page_size: PAGE_SIZE,
      ...filters,
    });

    const url = `${API_BASE}/insumo-movimientos/${query}`;

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
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Historial de Insumos (Kardex)</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Movimientos globales: creación, entradas, salidas, consumos por ensamble y ajustes.
          </p>
        </div>

        <button
          className="hidden items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700"
          onClick={openMoveModal}
        >
          <span className="text-lg leading-none">＋</span>
          Registrar movimiento
        </button>
      </div>

      {/* filtros */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Insumo</label>
            <select
              value={fInsumo}
              onChange={(e) => setFInsumo(e.target.value)}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Tipo</label>
            <select
              value={fTipo}
              onChange={(e) => setFTipo(e.target.value)}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              {TIPOS.map((t) => (
                <option key={t.value || "all"} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Bodega</label>
            <select
              value={fBodega}
              onChange={(e) => setFBodega(e.target.value)}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Tercero</label>
            <select
              value={fTercero}
              onChange={(e) => setFTercero(e.target.value)}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Buscar (en esta página)</label>
            <div className="flex items-center bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
              <span className="mr-2 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                className="w-full bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
            className="px-3 py-2 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-70 transition-colors"
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
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Total: <b className="text-slate-900 dark:text-slate-100">{count}</b> • Página <b className="text-slate-900 dark:text-slate-100">{page}</b>
          <span className="ml-2 text-[11px] text-slate-400 dark:text-slate-500">(mostrando {PAGE_SIZE} por página)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!prevUrl || loading}
            onClick={goPrev}
            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            ← Anterior
          </button>
          <button
            type="button"
            disabled={!nextUrl || loading}
            onClick={goNext}
            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      </div>

      <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading && <div className="p-6 text-sm text-slate-600 dark:text-slate-400">Cargando kardex...</div>}
        {error && !loading && <div className="p-6 text-sm text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3 text-center">Fecha</th>
                  <th className="px-4 py-3 text-center">Insumo</th>
                  <th className="px-4 py-3 text-center">Tipo</th>
                  <th className="px-4 py-3 text-center">Bodega</th>
                  <th className="px-4 py-3 text-center">Tercero</th>
                  <th className="px-4 py-3 text-center">Cantidad</th>
                  <th className="px-4 py-3 text-center">U.M.</th>
                  <th className="px-4 py-3 text-center">Costo</th>
                  <th className="px-4 py-3 text-center">Total</th>
                  <th className="px-4 py-3 text-center">Saldo</th>
                  <th className="px-4 py-3 text-center">Factura</th>
                  <th className="px-4 py-3 text-center">Observación</th>
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
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 text-center whitespace-nowrap">
                      {formatDateTime(r.fecha)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="text-sm text-slate-800 dark:text-slate-200 font-medium">{r.insumo_codigo}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{r.insumo_nombre}</div>
                    </td>

                    <td className="px-4 py-3 text-xs text-center">
                      <span className={`inline-flex px-2 py-1 rounded-md border text-[10px] font-semibold tracking-wide ${getTipoColor(r.tipo)}`}>
                        {r.tipo}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 text-center">{r.bodega_nombre || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 text-center">{r.tercero_nombre || "—"}</td>

                    <td className="px-4 py-3 text-sm text-center tabular-nums text-slate-800 dark:text-slate-200">
                      {formatCurrency(r.cantidad)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase">
                        {r.unidad_medida || "UN"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm text-center tabular-nums text-slate-700 dark:text-slate-300">
                      {r.costo_unitario ? `$${formatCurrency(r.costo_unitario)}` : "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-center tabular-nums text-slate-700 dark:text-slate-300">
                      {r.total ? `$${formatCurrency(r.total)}` : "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-center tabular-nums text-slate-700 dark:text-slate-300">
                      {r.saldo_resultante !== null && r.saldo_resultante !== undefined ? formatCurrency(r.saldo_resultante) : "—"}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 text-center">{r.factura || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 text-center">{r.observacion || "—"}</td>

                    <td className="px-4 py-3 text-center text-xs text-slate-700 dark:text-slate-300">
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
