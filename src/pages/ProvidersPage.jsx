import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";
import {
  Search, Plus, ChevronLeft, ChevronRight,
  Pencil, Trash2, RotateCcw, X
} from "lucide-react";
import ConfirmActionModal from "../components/ConfirmActionModal";

const PAGE_SIZE = 30;

function asRows(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}

export default function ProvidersPage() {
  const [proveedores, setProveedores] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  // Modal Edit State
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ nombre: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [initialName, setInitialName] = useState("");

  // Modal Action State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [providerToAction, setProviderToAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  async function loadProveedores(targetPage = 1) {
    const res = await fetch(`${API_BASE}/proveedores/?page=${targetPage}&page_size=${PAGE_SIZE}`);
    if (!res.ok) throw new Error("Error al cargar proveedores.");

    const data = await res.json();

    setProveedores(asRows(data));
    setCount(Number(data?.count || 0));
    setNextUrl(data?.next || null);
    setPrevUrl(data?.previous || null);
    setPage(targetPage);
  }

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        await loadProveedores(1);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error al cargar proveedores.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return proveedores;
    return proveedores.filter((p) => (p.nombre || "").toLowerCase().includes(term));
  }, [proveedores, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ nombre: "" });
    setInitialName("");
    setSaveError("");
    setIsModalOpen(true);
  };

  const openEdit = (prov) => {
    setEditingId(prov.id);
    setForm({ nombre: prov.nombre || "" });
    setInitialName(prov.nombre || "");
    setSaveError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const executeSave = async (nombreToSave) => {
    try {
      setSaving(true);
      const payload = { nombre: nombreToSave };
      const url = editingId ? `${API_BASE}/proveedores/${editingId}/` : `${API_BASE}/proveedores/`;
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Error guardando proveedor:", data);
        throw new Error("No se pudo guardar el proveedor.");
      }

      setIsModalOpen(false);
      setEditingId(null);
      setPendingSave(null);
      setShowConfirm(false);

      await loadProveedores(page);
    } catch (err) {
      console.error(err);
      setSaveError(err.message || "Error al guardar proveedor.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError("");

    const nombre = form.nombre.trim();
    if (!nombre) {
      setSaveError("El nombre es obligatorio.");
      return;
    }

    if (editingId && initialName !== nombre) {
      setPendingSave(nombre);
      setShowConfirm(true);
      return;
    }

    await executeSave(nombre);
  };

  const handleConfirmSave = async () => {
    if (!pendingSave) return;
    await executeSave(pendingSave);
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
    setPendingSave(null);
  };

  // Toggle Action Logic
  const openActionModal = (prov) => {
    setProviderToAction(prov);
    setActionError("");
    setActionModalOpen(true);
  };

  const closeActionModal = () => {
    if (actionLoading) return;
    setActionModalOpen(false);
    setProviderToAction(null);
  };

  const handleToggleActiveConfirm = async () => {
    if (!providerToAction) return;

    const prov = providerToAction;
    const isActive = prov.es_activo !== false;
    const action = isActive ? "Desactivar" : "Reactivar";

    try {
      setActionLoading(true);
      let res;
      if (isActive) {
        // Desactivar (Soft Delete)
        res = await fetch(`${API_BASE}/proveedores/${prov.id}/`, { method: "DELETE" });
      } else {
        // Reactivar (Patch)
        res = await fetch(`${API_BASE}/proveedores/${prov.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ es_activo: true }),
        });
      }

      if (!res.ok && res.status !== 204) throw new Error(`No se pudo ${action.toLowerCase()} el proveedor.`);

      closeActionModal();
      await loadProveedores(page);
    } catch (err) {
      setActionError(err.message || `Error al ${action.toLowerCase()} proveedor.`);
    } finally {
      setActionLoading(false);
    }
  };

  async function goPrev() {
    if (!prevUrl || loading) return;
    setLoading(true);
    try {
      await loadProveedores(Math.max(1, page - 1));
    } catch (e) {
      setError(e.message || "Error al cambiar de página.");
    } finally {
      setLoading(false);
    }
  }

  async function goNext() {
    if (!nextUrl || loading) return;
    setLoading(true);
    try {
      await loadProveedores(page + 1);
    } catch (e) {
      setError(e.message || "Error al cambiar de página.");
    } finally {
      setLoading(false);
    }
  }

  const activeProviderToAction = providerToAction?.es_activo !== false;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-semibold text-slate-900 mb-6">Proveedores</h1>

      {/* Barra superior */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-2.5 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:max-w-xs rounded-md border border-slate-200 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nuevo proveedor
        </button>
      </div>

      {/* Barra paginación */}
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
            className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 text-xs disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          <button
            type="button"
            disabled={!nextUrl || loading}
            onClick={goNext}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 text-xs disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            Siguiente <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500">
                  Cargando proveedores...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400">
                  No hay proveedores registrados (en esta página).
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const isActive = p.es_activo !== false;
                return (
                  <tr key={p.id} className={`border-t border-slate-100 transition-colors ${!isActive ? "bg-slate-50/70" : "hover:bg-slate-50/60"}`}>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">{p.id}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${!isActive ? "text-slate-400 line-through decoration-slate-300" : "text-slate-700"}`}>
                      {p.nombre}
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
                    <td className="px-4 py-3 text-xs text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors bg-white"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openActionModal(p)}
                          className={`p-1.5 rounded-md border transition-colors bg-white ${isActive
                            ? "border-red-100 text-red-600 hover:bg-red-50"
                            : "border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                            }`}
                          title={isActive ? "Desactivar" : "Reactivar"}
                        >
                          {isActive ? <Trash2 size={14} /> : <RotateCcw size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Confirmación Acción Estilizado */}
      <ConfirmActionModal
        isOpen={actionModalOpen}
        onClose={closeActionModal}
        onConfirm={handleToggleActiveConfirm}
        loading={actionLoading}
        error={actionError}
        title={activeProviderToAction ? "Desactivar Proveedor" : "Reactivar Proveedor"}
        message={
          activeProviderToAction
            ? <span>¿Estás seguro de que deseas desactivar al proveedor <strong>{providerToAction?.nombre}</strong>?</span>
            : <span>¿Deseas reactivar al proveedor <strong>{providerToAction?.nombre}</strong>?</span>
        }
        description={
          activeProviderToAction
            ? "El proveedor dejará de aparecer en los listados de selección, pero su historial se mantendrá."
            : "El proveedor volverá a estar disponible para nuevos registros."
        }
        confirmText={activeProviderToAction ? "Desactivar" : "Reactivar"}
        isDestructive={activeProviderToAction}
      />

      {/* Modal crear/editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all scale-100">
            {/* Si mostrando confirmación */}
            {showConfirm ? (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Pencil size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">¿Confirmar cambios?</h3>
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Estás a punto de cambiar el nombre del proveedor. Verifica que sea correcto:
                </p>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3 mb-6">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium uppercase tracking-wider">Nombre Anterior</span>
                    <span className="text-slate-500 line-through">{initialName}</span>
                  </div>
                  <div className="h-px bg-slate-200 w-full"></div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-600 font-bold uppercase tracking-wider text-xs">Nuevo Nombre</span>
                    <span className="text-slate-900 font-bold">{pendingSave}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleCancelConfirm}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleConfirmSave}
                    className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95"
                  >
                    Confirmar Cambios
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      {editingId ? "Editar Proveedor" : "Nuevo Proveedor"}
                    </h2>
                    <p className="text-[10px] text-slate-500 mt-0.5">Define el nombre del proveedor para el sistema.</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                  {saveError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs flex items-start gap-2">
                      <span className="text-lg leading-none">⚠️</span>
                      <span className="mt-0.5">{saveError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nombre del Proveedor</label>
                    <input
                      type="text"
                      name="nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                      placeholder="Ej. Distribuidora S.A.S."
                      required
                      autoFocus
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-70 transition-all active:scale-95"
                    >
                      {saving ? "Guardando..." : "Guardar Proveedor"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
