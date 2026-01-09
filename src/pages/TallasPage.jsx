import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";

const PAGE_SIZE = 30;

function asRows(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}

export default function TallasPage() {
  const [tallas, setTallas] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({ nombre: "" });

  async function loadTallas(targetPage = 1) {
    setError("");
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", targetPage);
      params.append("page_size", PAGE_SIZE);
      if (search) params.append("search", search);

      const res = await fetch(`${API_BASE}/tallas/?${params.toString()}`);
      if (!res.ok) throw new Error("Error cargando tallas.");

      const data = await res.json();

      setTallas(asRows(data));
      setCount(Number(data?.count || 0));
      setNextUrl(data?.next || null);
      setPrevUrl(data?.previous || null);
      setPage(targetPage);
    } catch (e) {
      console.error(e);
      setError(e.message || "Error cargando tallas.");
      setTallas([]);
      setCount(0);
      setNextUrl(null);
      setPrevUrl(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!search) loadTallas(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => {
      loadTallas(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // ELIMINADO filtered usage
  // const filtered = ...

  function openCreate() {
    setEditing(null);
    setForm({ nombre: "" });
    setError("");
    setIsModalOpen(true);
  }

  function openEdit(t) {
    setEditing(t);
    setForm({ nombre: t.nombre || "" });
    setError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
    setEditing(null);
  }

  function handleChange(e) {
    setForm({ nombre: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.nombre?.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    try {
      setSaving(true);

      const isEdit = !!editing?.id;
      const url = isEdit ? `${API_BASE}/tallas/${editing.id}/` : `${API_BASE}/tallas/`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: form.nombre.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Error guardando talla:", data);
        throw new Error(data?.detail || "No se pudo guardar la talla.");
      }

      // ✅ para ver el cambio seguro, recargamos (página 1)
      await loadTallas(1);
      closeModal();
    } catch (e2) {
      console.error(e2);
      setError(e2.message || "Error guardando talla.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t) {
    const ok = confirm(`¿Eliminar la talla "${t.nombre}"?`);
    if (!ok) return;

    setError("");
    try {
      const res = await fetch(`${API_BASE}/tallas/${t.id}/`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("No se pudo eliminar la talla.");

      // ✅ si borraste el último de la página, intenta ir a la anterior
      const newCount = Math.max(0, count - 1);
      const maxPage = Math.max(1, Math.ceil(newCount / PAGE_SIZE));
      const target = Math.min(page, maxPage);

      await loadTallas(target);
      setCount(newCount);
    } catch (e) {
      console.error(e);
      setError(e.message || "Error eliminando talla.");
    }
  }

  const goPrev = async () => {
    if (!prevUrl || loading) return;
    await loadTallas(Math.max(1, page - 1));
  };

  const goNext = async () => {
    if (!nextUrl || loading) return;
    await loadTallas(page + 1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Tallas</h1>
          <p className="text-xs text-slate-500">Catálogo de tallas.</p>
        </div>

        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
        >
          + Nueva talla
        </button>
      </div>

      {/* Search + recargar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center bg-white rounded-md border border-slate-200 px-3 py-2 text-sm">
          <span className="mr-2 text-slate-400 text-sm">🔍</span>
          <input
            className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
            placeholder="Buscar talla (en esta página)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={() => loadTallas(page)}
          className="px-3 py-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
          disabled={loading}
        >
          {loading ? "..." : "Recargar"}
        </button>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          Total: <b>{count}</b> • Página <b>{page}</b>
          <span className="ml-2 text-[11px] text-slate-400">(mostrando {PAGE_SIZE} por página)</span>
          <span className="ml-2 text-[11px] text-slate-400">
            *La búsqueda filtra solo la página actual.
          </span>
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
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Listado</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={3}>
                    Cargando...
                  </td>
                </tr>
              )}

              {!loading && tallas.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={3}>
                    No hay tallas{search ? " que coincidan" : ""}.
                  </td>
                </tr>
              )}

              {!loading &&
                tallas.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-100 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3 text-slate-700">{t.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{t.nombre}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => openEdit(t)}
                          className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                {editing ? "Editar talla" : "Nueva talla"}
              </h2>
              <button
                className="text-slate-400 hover:text-slate-600"
                onClick={closeModal}
                disabled={saving}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
              {error && <div className="text-xs text-red-600">{error}</div>}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Ej: S, M, L, XL"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
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
