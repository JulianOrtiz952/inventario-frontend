import { useEffect, useMemo, useState } from "react";
import CreateNotaEnsambleModal from "../components/CreateNotaEnsambleModal";
import { API_BASE } from "../config/api";
import { asRows, safeJson, fetchAllPages, buildQueryParams } from "../utils/api";
import { Trash2 } from "lucide-react";
import ViewNotaEnsambleModal from "../components/ViewNotaEnsambleModal";
import ConfirmActionModal from "../components/ConfirmActionModal";
import { formatCurrency } from "../utils/format";

const PAGE_SIZE = 30;

const num = (v) => formatCurrency(v);
const money = (v) => `$${formatCurrency(v)}`;


import { useInventory } from "../context/InventoryContext"; // ✅ Contexto

export default function NotasEnsamblePage() {
  const [notas, setNotas] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  // ✅ Usar Contexto
  const { bodegas, terceros } = useInventory();

  const [loading, setLoading] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editNotaId, setEditNotaId] = useState(null);

  // filtros (backend)
  const [q, setQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [bodegaId, setBodegaId] = useState("");
  const [terceroId, setTerceroId] = useState("");

  // catálogos para filtros
  // NOTA: removemos la carga manual de bodegas/terceros
  // const [bodegas, setBodegas] = useState([]);
  // const [terceros, setTerceros] = useState([]);

  // detalle seleccionado
  const [selectedNotaId, setSelectedNotaId] = useState(null);
  const [selectedNota, setSelectedNota] = useState(null);

  // deletion modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ------------------ helpers ------------------
  const getBodegaLabel = (nota) => {
    return nota?.bodega?.nombre || nota?.bodega_id || "—";
  };

  const getTerceroLabel = (nota) => {
    return nota?.tercero?.nombre || nota?.tercero_id || "—";
  };

  const getProductosResumen = (nota) => {
    if (nota?.productos_resumen) return nota.productos_resumen;
    const det = Array.isArray(nota?.detalles) ? nota.detalles : [];
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

  const getTotalCantidad = (nota) => {
    if (nota?.total_cantidad !== undefined && nota?.total_cantidad !== null) {
      return Number(nota.total_cantidad);
    }
    const det = Array.isArray(nota?.detalles) ? nota.detalles : [];
    return det.reduce((acc, d) => acc + Number(d?.cantidad || 0), 0);
  };

  // ------------------ loaders ------------------
  const loadNotas = async (targetPage = 1) => {
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
      const r = await fetch(`${API_BASE}/notas-ensamble/${query}`);
      if (!r.ok) throw new Error("Error cargando notas de ensamble.");
      const d = await r.json();

      setNotas(asRows(d));
      setCount(Number(d?.count || 0));
      setNextUrl(d?.next || null);
      setPrevUrl(d?.previous || null);
      setPage(targetPage);
    } catch (e) {
      console.error(e);
      setError(e.message || "Error cargando notas.");
      setNotas([]);
      setCount(0);
      setNextUrl(null);
      setPrevUrl(null);
    } finally {
      setLoading(false);
    }
  };

  // const loadCatalogs = async () => { ... } // REMOVIDO
  // useEffect(() => { loadCatalogs(); }, []); // REMOVIDO

  useEffect(() => {
    loadNotas(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, fromDate, toDate, bodegaId, terceroId]);

  const loadDetalle = async (id) => {
    setError("");
    setSuccess("");
    setSelectedNotaId(id);
    setSelectedNota(null);

    try {
      setLoadingDetalle(true);
      const r = await fetch(`${API_BASE}/notas-ensamble/${id}/`);
      if (!r.ok) throw new Error("No se pudo cargar el detalle de la nota.");
      const d = await r.json();
      setSelectedNota(d);
      setIsViewOpen(true);
    } catch (e) {
      console.error(e);
      setError(e.message || "Error cargando detalle.");
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleOpenEdit = async (id) => {
    setEditNotaId(id);
    setIsEditOpen(true);
    if (selectedNotaId === id) await loadDetalle(id);
  };

  const confirmDelete = async () => {
    setDeleteError("");
    setDeleteLoading(true);

    try {
      const id = deletingId;
      const r = await fetch(`${API_BASE}/notas-ensamble/${id}/`, { method: "DELETE" });

      if (!r.ok) {
        const data = await r.json().catch(() => null);
        throw new Error(data?.detail || "No se pudo eliminar la nota.");
      }

      setSuccess("Nota eliminada. Stock revertido y limpio (según lógica del backend).");
      setIsDeleteOpen(false);
      setDeletingId(null);

      if (selectedNotaId === id) {
        setSelectedNotaId(null);
        setSelectedNota(null);
      }

      const newCount = Math.max(0, count - 1);
      const maxPage = Math.max(1, Math.ceil(newCount / PAGE_SIZE));
      const target = Math.min(page, maxPage);

      await loadNotas(target);
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

  // ✅ El filtrado ahora es 100% backend
  const notasFiltradas = notas;

  // ------------------ paginación UI ------------------
  const goPrev = async () => {
    if (!prevUrl || loading) return;
    await loadNotas(Math.max(1, page - 1));
  };

  const goNext = async () => {
    if (!nextUrl || loading) return;
    await loadNotas(page + 1);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Notas de Ensamble</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Crear actualiza stock y descuenta insumos. Editar revierte y reaplica (según backend). Eliminar revierte.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadNotas(page)}
                className="px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                disabled={loading}
              >
                {loading ? "Actualizando…" : "Actualizar"}
              </button>

              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-all active:scale-95 shadow-sm shadow-blue-500/20"
              >
                + Nueva nota
              </button>
            </div>
          </div>

          {(error || success) && (
            <div className="space-y-2">
              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-sm text-red-700 dark:text-red-400 whitespace-pre-line flex items-center gap-2">
                  <span className="shrink-0">⚠️</span>
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900/50 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <span className="shrink-0">✅</span>
                  {success}
                </div>
              )}
            </div>
          )}

          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Filtros</h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Buscador Global
                </label>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Producto, Obs, ID..."
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bodega</label>
                <select
                  value={bodegaId}
                  onChange={(e) => setBodegaId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
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
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
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
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hasta</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>
          </section>

          {/* ✅ Barra de paginación */}
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
                className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                ← Anterior
              </button>
              <button
                type="button"
                disabled={!nextUrl || loading}
                onClick={goNext}
                className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>

          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Listado de Notas ({notasFiltradas.length})
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">Haz clic en "Ver" para ver el detalle completo e insumos consumidos.</p>
            </div>

            <div className="overflow-x-auto">
              {notasFiltradas.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  {loading ? "Cargando…" : "No se encontraron notas de ensamble."}
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                    <tr className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Productos</th>
                      <th className="px-4 py-3 text-left">Bodega</th>
                      <th className="px-4 py-3 text-left">Operador / Taller</th>
                      <th className="px-4 py-3 text-right">Cant. total</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {notasFiltradas.map((n) => {
                      const totalCant = getTotalCantidad(n);

                      return (
                        <tr
                          key={n.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${n.operador_id ? "bg-blue-50/40 dark:bg-blue-900/10" : ""}`}
                        >
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-bold">#{n.id}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">{n.fecha_elaboracion || "—"}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">{getProductosResumen(n)}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{getBodegaLabel(n)}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {n.operador_nombre ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase truncate max-w-[120px]" title={n.operador_nombre}>
                                <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                                {n.operador_nombre}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{num(totalCant)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => loadDetalle(n.id)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm flex items-center gap-1.5 transition-all"
                              >
                                Ver
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(n.id)}
                                className="px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/20 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 shadow-sm transition-all"
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteClick(n.id)}
                                className="p-1.5 rounded-lg border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all font-medium"
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

      {/* CREATE */}
      <CreateNotaEnsambleModal
        isOpen={isCreateOpen}
        mode="create"
        onClose={() => setIsCreateOpen(false)}
        onSaved={async () => {
          await loadNotas(page);
        }}
      />

      {/* EDIT */}
      <CreateNotaEnsambleModal
        isOpen={isEditOpen}
        mode="edit"
        notaId={editNotaId}
        onClose={() => {
          setIsEditOpen(false);
          setEditNotaId(null);
        }}
        onSaved={async (nota) => {
          await loadNotas(page);
          if (selectedNotaId === nota?.id) await loadDetalle(nota.id);
        }}
      />

      {/* VIEW MODAL */}
      <ViewNotaEnsambleModal
        isOpen={isViewOpen}
        nota={selectedNota}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedNotaId(null);
          setSelectedNota(null);
        }}
      />

      {/* CONFIRM DELETE */}
      <ConfirmActionModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        error={deleteError}
        title="Eliminar Nota de Ensamble"
        message="¿Estás seguro que deseas eliminar esta nota?"
        description="Esta acción revertirá el stock de los productos e insumos asociados automáticamente."
        confirmText="Sí, eliminar"
        isDestructive={true}
      />
    </div>
  );
}
