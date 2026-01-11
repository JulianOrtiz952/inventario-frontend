import { useEffect, useMemo, useState } from "react";
import CreateNotaEnsambleModal from "../components/CreateNotaEnsambleModal";
import { API_BASE } from "../config/api";
import { asRows, buildQueryParams } from "../utils/api";
import { Trash2 } from "lucide-react";
import ViewNotaEnsambleModal from "../components/ViewNotaEnsambleModal";
import ConfirmActionModal from "../components/ConfirmActionModal";

const PAGE_SIZE = 30;

const nf = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const num = (n) => nf.format(Number(n || 0));



export default function NotasEnsamblePage() {
  const [notas, setNotas] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

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
  const [bodegas, setBodegas] = useState([]);
  const [terceros, setTerceros] = useState([]);

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

  const loadCatalogs = async () => {
    try {
      const [bData, tData] = await Promise.all([
        fetch(`${API_BASE}/bodegas/?page_size=200`).then(r => r.json()),
        fetch(`${API_BASE}/terceros/?page_size=200`).then(r => r.json()),
      ]);
      setBodegas(asRows(bData));
      setTerceros(asRows(tData));
    } catch (e) {
      console.error("Error cargando catálogos:", e);
    }
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

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
      <div className="flex-1 p-6 lg:p-8 bg-slate-50 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Notas de Ensamble</h1>
              <p className="text-sm text-slate-500">
                Crear actualiza stock y descuenta insumos. Editar revierte y reaplica (según backend). Eliminar revierte.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadNotas(page)}
                className="px-4 py-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                disabled={loading}
              >
                {loading ? "Actualizando…" : "Actualizar"}
              </button>

              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
              >
                + Nueva nota
              </button>
            </div>
          </div>

          {(error || success) && (
            <div className="space-y-2">
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 whitespace-pre-line">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">
                  {success}
                </div>
              )}
            </div>
          )}

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Filtros</h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Buscador Global
                </label>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Producto, Obs, ID..."
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bodega</label>
                <select
                  value={bodegaId}
                  onChange={(e) => setBodegaId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="">Todas</option>
                  {bodegas.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tercero</label>
                <select
                  value={terceroId}
                  onChange={(e) => setTerceroId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="">Todos</option>
                  {terceros.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Desde</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hasta</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>
          </section>

          {/* ✅ Barra de paginación */}
          <div className="flex items-center justify-between gap-3">
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

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Listado de Notas ({notasFiltradas.length})
              </h2>
              <p className="text-[11px] text-slate-500 italic">Haz clic en "Ver" para ver el detalle completo e insumos consumidos.</p>
            </div>

            <div className="overflow-x-auto">
              {notasFiltradas.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  {loading ? "Cargando…" : "No se encontraron notas de ensamble."}
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Productos</th>
                      <th className="px-4 py-3 text-left">Bodega</th>
                      <th className="px-4 py-3 text-left">Tercero</th>
                      <th className="px-4 py-3 text-right">Cant. total</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {notasFiltradas.map((n) => {
                      const totalCant = getTotalCantidad(n);

                      return (
                        <tr
                          key={n.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-4 py-3 text-slate-700 font-bold">#{n.id}</td>
                          <td className="px-4 py-3 text-slate-600 font-medium">{n.fecha_elaboracion || "—"}</td>
                          <td className="px-4 py-3 text-slate-700 font-medium">{getProductosResumen(n)}</td>
                          <td className="px-4 py-3 text-slate-700">{getBodegaLabel(n)}</td>
                          <td className="px-4 py-3 text-slate-700">{getTerceroLabel(n)}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{num(totalCant)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => loadDetalle(n.id)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm flex items-center gap-1.5 transition-all"
                              >
                                Ver
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(n.id)}
                                className="px-3 py-1.5 rounded-lg border border-blue-100 bg-blue-50 text-xs font-semibold text-blue-700 hover:bg-blue-100 shadow-sm transition-all"
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteClick(n.id)}
                                className="p-1.5 rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 transition-all"
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
