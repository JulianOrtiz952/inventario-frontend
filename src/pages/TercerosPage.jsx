import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";
const PAGE_SIZE = 30;

function asRows(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}

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

  async function loadTerceros(targetPage = 1) {
    setError("");
    try {
      setLoading(true);

      const res = await fetch(
        `${API_BASE}/terceros/?page=${targetPage}&page_size=${PAGE_SIZE}`
      );
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
    loadTerceros(1);
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return terceros;
    return terceros.filter((t) => {
      const codigo = (t.codigo || "").toLowerCase();
      const nombre = (t.nombre || "").toLowerCase();
      return codigo.includes(term) || nombre.includes(term);
    });
  }, [terceros, search]);

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

  async function handleDelete(t) {
    const ok = confirm(`¿Eliminar el tercero "${t.nombre}"?`);
    if (!ok) return;

    setError("");
    try {
      const res = await fetch(`${API_BASE}/terceros/${t.id}/`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar el tercero.");

      // ✅ Ajuste de página si borraste el último de la página actual
      const newCount = Math.max(0, count - 1);
      const maxPage = Math.max(1, Math.ceil(newCount / PAGE_SIZE));
      const target = Math.min(page, maxPage);

      await loadTerceros(target);
      setCount(newCount);
    } catch (e) {
      console.error(e);
      setError(e.message || "Error eliminando tercero.");
    }
  }

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
          <h1 className="text-lg font-semibold text-slate-900">Terceros</h1>
          <p className="text-xs text-slate-500">
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
        <div className="flex-1 flex items-center bg-white rounded-md border border-slate-200 px-3 py-2 text-sm">
          <span className="mr-2 text-slate-400 text-sm">🔍</span>
          <input
            className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
            placeholder="Buscar por código o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={() => loadTerceros(page)}
          className="px-3 py-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
          disabled={loading}
        >
          {loading ? "..." : "Recargar"}
        </button>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          Total: <b>{count}</b> • Página <b>{page}</b>{" "}
          <span className="ml-2 text-[11px] text-slate-400">
            (mostrando {PAGE_SIZE} por página)
          </span>
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
          <h2 className="text-sm font-semibold text-slate-900">
            Listado ({filtered.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={4}>
                    Cargando...
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={4}>
                    No hay terceros en esta página.
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-100 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3 text-slate-700">{t.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {t.codigo}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{t.nombre}</td>
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
                {editing ? "Editar tercero" : "Nuevo tercero"}
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
                <label className="text-xs font-medium text-slate-700">Código</label>
                <input
                  type="text"
                  name="codigo"
                  value={form.codigo}
                  onChange={handleChange}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
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
