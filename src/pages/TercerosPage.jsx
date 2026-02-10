import { useEffect, useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { API_BASE } from "../config/api";
import { RotateCcw, Trash2, Pencil, Search, Plus } from "lucide-react";
import ConfirmActionModal from "../components/ConfirmActionModal";
import { asRows, buildQueryParams } from "../utils/api";

const PAGE_SIZE = 30;

export default function TercerosPage() {
  const { refreshCatalogs } = useInventory();
  const [terceros, setTerceros] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  // Modal estado
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // tercero o null
  const [form, setForm] = useState({ codigo: "", nombre: "" });

  // ✅ ACCIONES (Activar/Desactivar)
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [itemToAction, setItemToAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  async function loadTerceros(targetPage = 1) {
    setError("");
    try {
      setLoading(true);
      const query = buildQueryParams({
        page: targetPage,
        page_size: PAGE_SIZE,
        search,
      });

      const res = await fetch(`${API_BASE}/terceros/${query}`);
      if (!res.ok) throw new Error("Error cargando terceros.");

      const data = await res.json();

      setTerceros(asRows(data));
      setCount(Number(data?.count || 0));
      setNextUrl(data?.next || null);
      setPrevUrl(data?.previous || null);
      setPage(targetPage);
    } catch (e) {
      console.error(e);
      setError(e.message || "Error cargando terceros.");
      setTerceros([]);
      setCount(0);
      setNextUrl(null);
      setPrevUrl(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!search) loadTerceros(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      loadTerceros(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm({ codigo: "", nombre: "" });
    setError("");
    setIsModalOpen(true);
  }

  function openEdit(t) {
    setEditing(t);
    setForm({ codigo: t.codigo || "", nombre: t.nombre || "" });
    setError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditing(null);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    const upperValue = (name === "codigo" || name === "nombre") ? value.toUpperCase() : value;
    setForm((p) => ({ ...p, [name]: upperValue }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.codigo || !form.nombre) {
      setError("Código y nombre son obligatorios.");
      return;
    }

    try {
      setSaving(true);

      const isEdit = !!editing?.id;
      const url = isEdit
        ? `${API_BASE}/terceros/${editing.id}/`
        : `${API_BASE}/terceros/`;
      const method = isEdit ? "PATCH" : "POST";
      const payload = { codigo: form.codigo, nombre: form.nombre };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data && typeof data === 'object') {
          const firstKey = Object.keys(data)[0];
          const firstMsg = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
          if (firstMsg && firstKey !== 'detail') {
            throw new Error(firstMsg);
          }
        }
        throw new Error(data?.detail || "No se pudo guardar el tercero.");
      }

      await loadTerceros(1);
      refreshCatalogs();
      closeModal();
    } catch (e2) {
      setError(e2.message || "Error guardando tercero.");
    } finally {
      setSaving(false);
    }
  }

  const openActionModal = (tercero) => {
    setItemToAction(tercero);
    setActionError("");
    setActionModalOpen(true);
  };

  const closeActionModal = () => {
    if (actionLoading) return;
    setActionModalOpen(false);
    setItemToAction(null);
  };

  const handleToggleActiveConfirm = async () => {
    if (!itemToAction) return;

    const item = itemToAction;
    const isActive = item.es_activo !== false;
    const action = isActive ? "Desactivar" : "Reactivar";

    try {
      setActionLoading(true);
      let res;
      if (isActive) {
        res = await fetch(`${API_BASE}/terceros/${item.id}/`, { method: "DELETE" });
      } else {
        res = await fetch(`${API_BASE}/terceros/${item.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ es_activo: true }),
        });
      }

      if (!res.ok && res.status !== 204) throw new Error(`No se pudo ${action.toLowerCase()} el tercero.`);

      closeActionModal();
      await loadTerceros(page);
      refreshCatalogs();
    } catch (err) {
      setActionError(err.message || `Error al ${action.toLowerCase()} tercero.`);
    } finally {
      setActionLoading(false);
    }
  };

  const goPrev = async () => {
    if (!prevUrl || loading) return;
    await loadTerceros(Math.max(1, page - 1));
  };

  const goNext = async () => {
    if (!nextUrl || loading) return;
    await loadTerceros(page + 1);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 italic tracking-tight">
            Terceros <span className="text-blue-600 dark:text-blue-400 not-italic">Asociados</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Clientes y talleres externos vinculados al sistema.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={18} />
          Nuevo Tercero
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="relative group">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
            <Search size={18} />
          </span>
          <input
            className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 pl-11 pr-4 py-3 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            placeholder="Buscar por código o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Pagination Bar */}
      <div className="flex items-center justify-between gap-3 mb-4 px-1">
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Total: <b className="text-slate-900 dark:text-slate-100">{count}</b>
          <span className="mx-1">•</span>
          Página <b className="text-slate-900 dark:text-slate-100">{page}</b>
          <span className="ml-2 text-[11px] text-slate-400 dark:text-slate-500">(mostrando {PAGE_SIZE} por página)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!prevUrl || loading}
            onClick={goPrev}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-white dark:hover:bg-slate-900 hover:border-blue-500 transition-all shadow-sm"
          >
            ←
          </button>
          <button
            type="button"
            disabled={!nextUrl || loading}
            onClick={goNext}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-white dark:hover:bg-slate-900 hover:border-blue-500 transition-all shadow-sm"
          >
            →
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-xs text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Código</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Nombre</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400" colSpan={5}>
                    Cargando...
                  </td>
                </tr>
              )}

              {!loading && terceros.length === 0 && (
                <tr>
                  <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-400" colSpan={5}>
                    No hay terceros{search ? " que coincidan" : ""}.
                  </td>
                </tr>
              )}

              {!loading &&
                terceros.map((t) => {
                  const isActive = t.es_activo !== false;
                  return (
                    <tr
                      key={t.id}
                      className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${!isActive ? "bg-slate-50/70 dark:bg-slate-800/20" : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"}`}
                    >
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{t.id}</td>
                      <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 font-mono">
                        {t.codigo}
                      </td>
                      <td className={`px-6 py-4 font-medium ${!isActive ? "text-slate-400 dark:text-slate-600 line-through decoration-slate-300 dark:decoration-slate-700" : "text-slate-700 dark:text-slate-200"}`}>
                        {t.nombre}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(t)}
                            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-900"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openActionModal(t)}
                            className={`p-1.5 rounded-md border transition-colors bg-white dark:bg-slate-900 ${isActive
                              ? "border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                              : "border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                              }`}
                            title={isActive ? "Desactivar" : "Reactivar"}
                          >
                            {isActive ? <Trash2 size={14} /> : <RotateCcw size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 dark:bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-md border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {editing ? "Editar tercero" : "Nuevo tercero"}
              </h2>
              <button
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                onClick={closeModal}
                disabled={saving}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Código</label>
                <input
                  type="text"
                  name="codigo"
                  value={form.codigo}
                  onChange={handleChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-3 py-2 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 disabled:opacity-70 transition-all active:scale-95"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación Acción */}
      <ConfirmActionModal
        isOpen={actionModalOpen}
        onClose={closeActionModal}
        onConfirm={handleToggleActiveConfirm}
        loading={actionLoading}
        error={actionError}
        title={itemToAction?.es_activo !== false ? "Desactivar Tercero" : "Reactivar Tercero"}
        message={
          itemToAction?.es_activo !== false
            ? <span>¿Estás seguro de que deseas desactivar el tercero <strong>{itemToAction?.nombre}</strong>?</span>
            : <span>¿Deseas reactivar el tercero <strong>{itemToAction?.nombre}</strong>?</span>
        }
        description={
          itemToAction?.es_activo !== false
            ? "El tercero dejará de estar disponible en registros."
            : "El tercero volverá a estar activo."
        }
        confirmText={itemToAction?.es_activo !== false ? "Desactivar" : "Reactivar"}
        isDestructive={itemToAction?.es_activo !== false}
      />
    </div>
  );
}
