import { useEffect, useMemo, useState } from "react";
import CreateSalidaProductoModal from "../components/CreateSalidaProductoModal";
import EditSalidaProductoModal from "../components/EditSalidaProductoModal";
import ViewSalidaProductoModal from "../components/ViewSalidaProductoModal";
import ConfirmActionModal from "../components/ConfirmActionModal";
import { API_BASE } from "../config/api";
import { asRows, safeJson, fetchAllPages, buildQueryParams } from "../utils/api";
import { formatCurrency } from "../utils/format";
import { Trash2 } from "lucide-react";
import { useInventory } from "../context/InventoryContext";

const PAGE_SIZE = 30;

const num = (v) => formatCurrency(v);
const money = (v) => `$${formatCurrency(v)}`;

export default function SalidasProductoPage() {
  const [salidas, setSalidas] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // filtros (backend)
  const [q, setQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [bodegaId, setBodegaId] = useState("");
  const [terceroId, setTerceroId] = useState("");

  // catálogos para filtros
  const { bodegas, terceros } = useInventory();

  // detalle seleccionado
  const [selectedSalida, setSelectedSalida] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // deletion
  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ------------------ helpers ------------------
  const getBodegaLabel = (s) => {
    const b = s?.bodega;
    return b?.nombre || s?.bodega_id || "—";
  };

  const getTerceroLabel = (s) => {
    const t = s?.tercero;
    return t?.nombre || s?.tercero_id || "—";
  };

  const getProductosResumen = (s) => {
    const det = Array.isArray(s?.detalles) ? s.detalles : [];
    if (det.length === 0) return "—";

    const uniq = [];
    const seen = new Set();
    for (const d of det) {
      const sku = d?.producto?.codigo_sku || d?.producto_id || "";
      const name = d?.producto?.nombre || "";
      const key = `${sku}::${name}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniq.push({ sku, name });
      }
    }

    if (uniq.length === 0) return "—";
    if (uniq.length === 1) return uniq[0].name || uniq[0].sku;
    return `${uniq[0].name || uniq[0].sku} (+${uniq.length - 1})`;
  };

  const getTotalCantidad = (s) => {
    const det = Array.isArray(s?.detalles) ? s.detalles : [];
    return det.reduce((acc, d) => acc + Number(d?.cantidad || 0), 0);
  };

  const getTotalPrecio = (s) => {
    const det = Array.isArray(s?.detalles) ? s.detalles : [];
    return det.reduce((acc, d) => acc + (Number(d?.cantidad || 0) * Number(d?.costo_unitario || 0)), 0);
  };

  // ------------------ loaders ------------------
  const loadSalidas = async (targetPage = 1) => {
    setError("");
    setSuccess("");

    try {
      setLoading(true);
      const query = buildQueryParams({
        page: targetPage,
        page_size: PAGE_SIZE,
        search: q,
        fecha_inicio: fromDate,
        fecha_fin: toDate,
        bodega: bodegaId,
        tercero: terceroId,
      });
      const r = await fetch(`${API_BASE}/salidas-producto/${query}`);
      if (!r.ok) throw new Error("Error cargando salidas de producto.");
      const d = await r.json();

      setSalidas(asRows(d));
      setCount(Number(d?.count || 0));
      setNextUrl(d?.next || null);
      setPrevUrl(d?.previous || null);
      setPage(targetPage);
    } catch (e) {
      console.error(e);
      setError(e.message || "Error cargando salidas.");
      setSalidas([]);
      setCount(0);
      setNextUrl(null);
      setPrevUrl(null);
    } finally {
      setLoading(false);
    }
  };

  // const loadCatalogs = async ... (REMOVIDO)
  // useEffect(() => { loadCatalogs(); }, []); (REMOVIDO)

  useEffect(() => {
    loadSalidas(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, fromDate, toDate, bodegaId, terceroId]);

  const loadDetalle = async (id) => {
    setError("");
    setSuccess("");
    try {
      setLoadingDetalle(true);
      const r = await fetch(`${API_BASE}/salidas-producto/${id}/`);
      if (!r.ok) throw new Error("No se pudo cargar el detalle de la salida.");
      const d = await r.json();
      setSelectedSalida(d);
      setIsViewOpen(true);
    } catch (e) {
      console.error(e);
      setError(e.message || "Error cargando detalle.");
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleEditClick = (id) => {
    setEditingId(id);
    setIsEditOpen(true);
  };

  const confirmDelete = async () => {
    setDeleteError("");
    setDeleteLoading(true);

    try {
      const id = deletingId;
      const r = await fetch(`${API_BASE}/salidas-producto/${id}/`, { method: "DELETE" });

      if (!r.ok) {
        const data = await r.json().catch(() => null);
        throw new Error(data?.detail || "No se pudo eliminar la nota de salida.");
      }

      setSuccess("Nota de salida eliminada correctamente.");
      setIsDeleteOpen(false);
      setDeletingId(null);

      const newCount = Math.max(0, count - 1);
      const maxPage = Math.max(1, Math.ceil(newCount / PAGE_SIZE));
      const target = Math.min(page, maxPage);

      await loadSalidas(target);
      setCount(newCount);
    } catch (e) {
      console.error(e);
      setDeleteError(e.message || "Error eliminando nota.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setDeletingId(id);
    setIsDeleteOpen(true);
    setDeleteError("");
  };

  // ------------------ paginación UI ------------------
  const goPrev = async () => {
    if (!prevUrl || loading) return;
    await loadSalidas(Math.max(1, page - 1));
  };

  const goNext = async () => {
    if (!nextUrl || loading) return;
    await loadSalidas(page + 1);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Notas de Salida</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Despachos de producto terminado. Descuenta stock por FIFO.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadSalidas(page)}
                className="px-4 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                disabled={loading}
              >
                {loading ? "Actualizando…" : "Actualizar"}
              </button>

              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
              >
                + Nueva salida
              </button>
            </div>
          </div>

          {(error || success) && (
            <div className="space-y-2">
              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 px-4 py-2 text-sm text-red-700 dark:text-red-400 whitespace-pre-line">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                  {success}
                </div>
              )}
            </div>
          )}

          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Filtros</h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Buscador Global
                </label>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Producto, ID..."
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bodega</label>
                <select
                  value={bodegaId}
                  onChange={(e) => setBodegaId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="">Todas</option>
                  {bodegas.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tercero</label>
                <select
                  value={terceroId}
                  onChange={(e) => setTerceroId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="">Todos</option>
                  {terceros.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Desde</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hasta</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>
          </section>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Total: <b className="text-slate-900 dark:text-slate-100">{count}</b> • Página <b className="text-slate-900 dark:text-slate-100">{page}</b>
              <span className="ml-2 text-[11px] text-slate-400 dark:text-slate-500">(mostrando {PAGE_SIZE} por página)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!prevUrl || loading}
                onClick={goPrev}
                className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                ← Anterior
              </button>
              <button
                type="button"
                disabled={!nextUrl || loading}
                onClick={goNext}
                className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Siguiente →
              </button>
            </div>
          </div>

          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Listado de Salidas ({salidas.length})
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">Haz clic en "Ver" para ver el detalle completo.</p>
            </div>

            <div className="overflow-x-auto">
              {salidas.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  {loading ? "Cargando…" : "No se encontraron notas de salida."}
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <tr className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Número / ID</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Productos</th>
                      <th className="px-4 py-3 text-left">Bodega</th>
                      <th className="px-4 py-3 text-left">Tercero / Cliente</th>
                      <th className="px-4 py-3 text-right">Cant. total</th>
                      <th className="px-4 py-3 text-right">Total ($)</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {salidas.map((s) => {
                      const totalCant = getTotalCantidad(s);

                      return (
                        <tr
                          key={s.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200 font-bold">
                            {s.numero || `#${s.id}`}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">{s.fecha || "—"}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">{getProductosResumen(s)}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{getBodegaLabel(s)}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{getTerceroLabel(s)}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{num(totalCant)}</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-700 dark:text-blue-400">{money(getTotalPrecio(s))}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => loadDetalle(s.id)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm flex items-center gap-1.5 transition-all"
                              >
                                Ver
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEditClick(s.id)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm flex items-center gap-1.5 transition-all"
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteClick(s.id)}
                                className="p-1.5 rounded-lg border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>

      <CreateSalidaProductoModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSaved={async () => {
          setIsCreateOpen(false);
          await loadSalidas(page);
          setSuccess("Salida creada correctamente.");
        }}
      />

      <EditSalidaProductoModal
        isOpen={isEditOpen}
        salidaId={editingId}
        onClose={() => {
          setIsEditOpen(false);
          setEditingId(null);
        }}
        onSaved={async () => {
          setIsEditOpen(false);
          setEditingId(null);
          await loadSalidas(page);
          setSuccess("Salida actualizada correctamente.");
        }}
      />

      <ViewSalidaProductoModal
        isOpen={isViewOpen}
        salida={selectedSalida}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedSalida(null);
        }}
      />

      <ConfirmActionModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        error={deleteError}
        title="Eliminar Nota de Salida"
        message="¿Estás seguro que deseas eliminar esta nota de salida?"
        description="Esta acción intentará revertir el stock deducido (si el backend lo permite)."
        confirmText="Sí, eliminar"
        isDestructive={true}
      />
    </div>
  );
}
