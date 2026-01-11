import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";
import { RotateCcw, Trash2, Pencil } from "lucide-react";
import ConfirmActionModal from "../components/ConfirmActionModal";
import { asRows, buildQueryParams } from "../utils/api";

const PAGE_SIZE = 30;



export default function TercerosPage() {
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

  // ELIMINADO client-side filtering
  // const filtered = ...

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
    setForm((p) => ({ ...p, [name]: value }));
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
        console.error("Error guardando tercero:", data);
        throw new Error(data?.detail || "No se pudo guardar el tercero.");
      }

      // ✅ Para que el nuevo se vea sí o sí, volvemos a la página 1
      await loadTerceros(1);
      closeModal();
    } catch (e2) {
      console.error(e2);
      setError(e2.message || "Error guardando tercero.");
    } finally {
      setSaving(false);
    }
  }

  // ELIMINADO handleDelete original

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
        // Desactivar (Soft Delete)
        res = await fetch(`${API_BASE}/terceros/${item.id}/`, { method: "DELETE" });
      } else {
        // Reactivar (Patch)
        res = await fetch(`${API_BASE}/terceros/${item.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ es_activo: true }),
        });
      }

      if (!res.ok && res.status !== 204) throw new Error(`No se pudo ${action.toLowerCase()} el tercero.`);

      closeActionModal();
      await loadTerceros(page);
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Terceros</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Clientes / terceros asociados (código + nombre).
          </p>
        </div>

        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
        >
          + Nuevo tercero
        </button>
      </div>

      {/* Search + reload */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm">
          <span className="mr-2 text-slate-400 text-sm">🔍</span>
          <input
            className="w-full bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            placeholder="Buscar por código o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={() => loadTerceros(page)}
          className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          disabled={loading}
        >
          {loading ? "..." : "Recargar"}
        </button>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Total: <b className="text-slate-900 dark:text-slate-100">{count}</b> • Página <b className="text-slate-900 dark:text-slate-100">{page}</b>{" "}
          <span className="ml-2 text-[11px] text-slate-400 dark:text-slate-500">
            (mostrando {PAGE_SIZE} por página)
          </span>
          <span className="ml-2 text-[11px] text-slate-400 dark:text-slate-500">
            *La búsqueda filtra solo la página actual.
          </span>
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

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Listado ({terceros.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
              <tr className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400" colSpan={5}>
                    Cargando...
                  </td>
                </tr>
              )}

              {!loading && terceros.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={5}>
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
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{t.id}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 font-mono">
                        {t.codigo}
                      </td>
                      <td className={`px-4 py-3 font-medium ${!isActive ? "text-slate-400 dark:text-slate-600 line-through decoration-slate-300 dark:decoration-slate-700" : "text-slate-700 dark:text-slate-200"}`}>
                        {t.nombre}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
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
              {error && <div className="text-xs text-red-600 dark:text-red-400">{error}</div>}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Código</label>
                <input
                  type="text"
                  name="codigo"
                  value={form.codigo}
                  onChange={handleChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 disabled:opacity-70"
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
