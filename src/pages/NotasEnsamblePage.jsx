import { useEffect, useState } from "react";
import CreateNotaEnsambleModal from "../components/CreateNotaEnsambleModal";
import { API_BASE } from "../config/api";
import { asRows, buildQueryParams } from "../utils/api";
import { Trash2, Search, Filter, Calendar, RefreshCcw, Plus, Eye, Pencil, FileText } from "lucide-react";
import ViewNotaEnsambleModal from "../components/ViewNotaEnsambleModal";
import ConfirmActionModal from "../components/ConfirmActionModal";
import { formatCurrency } from "../utils/format";
import { useInventory } from "../context/InventoryContext";

const PAGE_SIZE = 30;
const num = (v) => formatCurrency(v);

export default function NotasEnsamblePage() {
  const [notas, setNotas] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  const { bodegas, terceros } = useInventory();

  const [loading, setLoading] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editNotaId, setEditNotaId] = useState(null);

  // filtros
  const [q, setQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [bodegaId, setBodegaId] = useState("");
  const [terceroId, setTerceroId] = useState("");

  const [selectedNota, setSelectedNota] = useState(null);

  // deletion modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotas(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, fromDate, toDate, bodegaId, terceroId]);

  const loadDetalle = async (id) => {
    setError("");
    setSuccess("");
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
  };

  const confirmDelete = async () => {
    setDeleteError("");
    setDeleteLoading(true);

    try {
      const r = await fetch(`${API_BASE}/notas-ensamble/${deletingId}/`, { method: "DELETE" });
      if (!r.ok) throw new Error("No se pudo eliminar la nota.");

      setSuccess("Nota eliminada con éxito.");
      setIsDeleteOpen(false);
      setDeletingId(null);
      await loadNotas(page);
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
  };

  const getProductosResumen = (nota) => {
    if (nota?.productos_resumen) return nota.productos_resumen;
    const det = Array.isArray(nota?.detalles) ? nota.detalles : [];
    if (det.length === 0) return "—";
    const first = det[0]?.producto?.nombre || det[0]?.producto_id || "Producto";
    return det.length > 1 ? `${first} (+${det.length - 1})` : first;
  };

  const getTotalCantidad = (nota) => {
    if (nota?.total_cantidad !== undefined) return Number(nota.total_cantidad);
    return (nota?.detalles || []).reduce((acc, d) => acc + Number(d?.cantidad || 0), 0);
  };

  const goPrev = async () => { if (prevUrl && !loading) await loadNotas(Math.max(1, page - 1)); };
  const goNext = async () => { if (nextUrl && !loading) await loadNotas(page + 1); };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 italic tracking-tight">
            Notas <span className="text-blue-600 dark:text-blue-400 not-italic">de Ensamble</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registro y control de procesos de ensamble de productos terminados.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={18} />
          Nueva Nota
        </button>
      </div>

      {(error || success) && (
        <div className="mb-6 space-y-2">
          {error && <div className="rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 px-5 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2"><Trash2 size={16} />{error}</div>}
          {success && <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900/50 px-5 py-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2"><RefreshCcw size={16} />{success}</div>}
        </div>
      )}

      {/* Filtros Avanzados */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <h2 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Filtros de Búsqueda</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Buscador</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej: ID, Producto..." className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bodega</label>
            <select value={bodegaId} onChange={(e) => setBodegaId(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
              <option value="">Todas</option>
              {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tercero / Operador</label>
            <select value={terceroId} onChange={(e) => setTerceroId(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
              <option value="">Todos</option>
              {terceros.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Desde</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hasta</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
          </div>
        </div>
      </section>

      {/* Pagination Bar */}
      <div className="flex items-center justify-between gap-3 mb-4 px-1">
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Total: <b className="text-slate-900 dark:text-slate-100">{count}</b>
          <span className="mx-1">•</span>
          Página <b className="text-slate-900 dark:text-slate-100">{page}</b>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={!prevUrl || loading} onClick={goPrev} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-white dark:hover:bg-slate-900 hover:border-blue-500 transition-all shadow-sm">←</button>
          <button type="button" disabled={!nextUrl || loading} onClick={goNext} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-white dark:hover:bg-slate-900 hover:border-blue-500 transition-all shadow-sm">→</button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden text-center">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">ID / Fecha</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Productos</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Bodega</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Operador</th>
                <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total u.</th>
                <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-xs text-slate-400 italic">Actualizando registros...</td></tr>
              ) : notas.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-xs text-slate-400 italic">No se encontraron notas de ensamble.</td></tr>
              ) : (
                notas.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 text-left">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">#{n.id}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{n.fecha_elaboracion || "—"}</div>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{getProductosResumen(n)}</div>
                      {n.observaciones && <div className="text-[10px] text-slate-400 italic truncate max-w-[200px]">{n.observaciones}</div>}
                    </td>
                    <td className="px-6 py-4 text-left">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{n.bodega?.nombre || "—"}</span>
                    </td>
                    <td className="px-6 py-4 text-left">
                      {n.tercero?.nombre ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-tight">
                          <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                          {n.tercero.nombre}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-sm text-slate-900 dark:text-white">{num(getTotalCantidad(n))}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => loadDetalle(n.id)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Ver Detalle"><Eye size={14} /></button>
                        <button onClick={() => handleOpenEdit(n.id)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Editar"><Pencil size={14} /></button>
                        <button onClick={() => handleDeleteClick(n.id)} className="p-1.5 rounded-lg border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all" title="Eliminar"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CreateNotaEnsambleModal isOpen={isCreateOpen} mode="create" onClose={() => setIsCreateOpen(false)} onSaved={() => loadNotas(page)} />
      <CreateNotaEnsambleModal isOpen={isEditOpen} mode="edit" notaId={editNotaId} onClose={() => { setIsEditOpen(false); setEditNotaId(null); }} onSaved={() => loadNotas(page)} />
      <ViewNotaEnsambleModal isOpen={isViewOpen} nota={selectedNota} onClose={() => { setIsViewOpen(false); setSelectedNota(null); }} />

      <ConfirmActionModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        error={deleteError}
        title="Anular Nota de Ensamble"
        message="¿Realmente deseas anular esta nota?"
        description="El sistema revertirá el stock de productos e insumos automáticamente. Esta acción no se puede deshacer."
        confirmText="Anular Nota"
        isDestructive={true}
      />
    </div>
  );
}
