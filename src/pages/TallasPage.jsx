import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

export default function TallasPage() {
  const [tallas, setTallas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({ nombre: "" });

  async function loadTallas() {
    setError("");
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/tallas/`);
      if (!res.ok) throw new Error("Error cargando tallas.");
      const data = await res.json();
      setTallas(data);
    } catch (e) {
      setError(e.message || "Error cargando tallas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTallas();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tallas;
    return tallas.filter((t) => (t.nombre || "").toLowerCase().includes(term));
  }, [tallas, search]);

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
      const url = isEdit
        ? `${API_BASE}/tallas/${editing.id}/`
        : `${API_BASE}/tallas/`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: form.nombre.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Error guardando talla:", data);
        throw new Error("No se pudo guardar la talla.");
      }

      await loadTallas();
      closeModal();
    } catch (e2) {
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
      const res = await fetch(`${API_BASE}/tallas/${t.id}/`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("No se pudo eliminar la talla.");
      await loadTallas();
    } catch (e) {
      setError(e.message || "Error eliminando talla.");
    }
  }

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

      {/* Search + error */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center bg-white rounded-md border border-slate-200 px-3 py-2 text-sm">
          <span className="mr-2 text-slate-400 text-sm">🔍</span>
          <input
            className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
            placeholder="Buscar talla..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={loadTallas}
          className="px-3 py-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Recargar
        </button>
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

              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={3}>
                    No hay tallas.
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
                      {t.nombre}
                    </td>
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
                <label className="text-xs font-medium text-slate-700">
                  Nombre
                </label>
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
