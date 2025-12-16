import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ nombre: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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

  // Cargar proveedores (paginado)
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

  // Abrir / cerrar modal
  const openCreate = () => {
    setEditingId(null);
    setForm({ nombre: "" });
    setSaveError("");
    setIsModalOpen(true);
  };

  const openEdit = (prov) => {
    setEditingId(prov.id);
    setForm({ nombre: prov.nombre || "" });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError("");

    if (!form.nombre.trim()) {
      setSaveError("El nombre es obligatorio.");
      return;
    }

    try {
      setSaving(true);

      const payload = { nombre: form.nombre.trim() };
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

      // ✅ recarga página actual (coherente con paginación)
      await loadProveedores(page);
    } catch (err) {
      console.error(err);
      setSaveError(err.message || "Error al guardar proveedor.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (prov) => {
    if (!window.confirm(`¿Eliminar proveedor "${prov.nombre}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/proveedores/${prov.id}/`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("No se pudo eliminar el proveedor.");

      // ✅ si borraste el último de la página, intenta ir a la anterior
      const newCount = Math.max(0, count - 1);
      const maxPage = Math.max(1, Math.ceil(newCount / PAGE_SIZE));
      const target = Math.min(page, maxPage);

      await loadProveedores(target);
      setCount(newCount);
    } catch (err) {
      alert(err.message || "Error al eliminar proveedor.");
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

  // Render
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-semibold text-slate-900 mb-6">Proveedores</h1>

      {/* Barra superior */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre (en esta página)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:max-w-xs rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700"
        >
          <span className="text-base leading-none">＋</span>
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

      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-center text-xs text-slate-500">
                  Cargando proveedores...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-center text-xs text-slate-400">
                  No hay proveedores registrados (en esta página).
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-4 py-2 text-xs text-slate-500">{p.id}</td>
                  <td className="px-4 py-2 text-sm text-slate-900">{p.nombre}</td>
                  <td className="px-4 py-2 text-xs text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="px-2 py-1 mr-1 rounded border border-slate-200 text-[11px] hover:bg-slate-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      className="px-2 py-1 rounded border border-red-100 text-[11px] text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {editingId ? "Editar proveedor" : "Nuevo proveedor"}
                </h2>
                <p className="text-[11px] text-slate-500">Define el nombre del proveedor.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              {saveError && (
                <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                  {saveError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-1 pb-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-3 py-2 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100"
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
    </div>
  );
}
