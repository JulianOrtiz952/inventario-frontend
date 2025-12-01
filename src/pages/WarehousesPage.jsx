// src/pages/WarehousesPage.jsx
import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

export default function WarehousesPage() {

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [selectedBodega, setSelectedBodega] = useState(null);
  const [details, setDetails] = useState({
    insumos: [],
    productos: [],
  });
  const [bodegas, setBodegas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    ubicacion: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Cargar bodegas
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/bodegas/`);
        if (!res.ok) throw new Error("No se pudieron cargar las bodegas.");
        const data = await res.json();
        setBodegas(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error al cargar bodegas.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const bodegasFiltradas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return bodegas;
    return bodegas.filter((b) => {
      const codigo = (b.codigo || "").toLowerCase();
      const nombre = (b.nombre || "").toLowerCase();
      const ubic = (b.ubicacion || "").toLowerCase();
      return (
        codigo.includes(term) ||
        nombre.includes(term) ||
        ubic.includes(term)
      );
    });
  }, [search, bodegas]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      codigo: "",
      nombre: "",
      descripcion: "",
      ubicacion: "",
    });
    setSaveError("");
    setIsModalOpen(true);
  };

  const openEdit = (b) => {
    setEditingId(b.id);
    setForm({
      codigo: b.codigo || "",
      nombre: b.nombre || "",
      descripcion: b.descripcion || "",
      ubicacion: b.ubicacion || "",
    });
    setSaveError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `${API_BASE}/bodegas/${editingId}/`
        : `${API_BASE}/bodegas/`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Error guardando bodega:", data || res.statusText);
        throw new Error("No se pudo guardar la bodega.");
      }

      const saved = await res.json();

      if (editingId) {
        setBodegas((prev) =>
          prev.map((b) => (b.id === saved.id ? saved : b))
        );
      } else {
        setBodegas((prev) => [saved, ...prev]);
      }

      setIsModalOpen(false);
    } catch (err) {
      setSaveError(err.message || "Error al guardar la bodega.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bodega) => {
    const ok = window.confirm(
      `¿Eliminar la bodega "${bodega.nombre}"? Esta acción no se puede deshacer.`
    );
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/bodegas/${bodega.id}/`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("No se pudo eliminar la bodega.");
      }
      setBodegas((prev) => prev.filter((b) => b.id !== bodega.id));
    } catch (err) {
      alert(err.message || "Error eliminando la bodega.");
    }
  };

  const openDetails = async (bodega) => {
  setSelectedBodega(bodega);
  setIsDetailsOpen(true);
  setDetailsLoading(true);
  setDetailsError("");
  setDetails({ insumos: [], productos: [] });

  try {
    const res = await fetch(`${API_BASE}/bodegas/${bodega.id}/contenido/`);
    if (!res.ok) {
      throw new Error("Error al cargar el contenido de la bodega.");
    }
    const data = await res.json();
    setDetails({
      insumos: data.insumos || [],
      productos: data.productos || [],
    });
  } catch (err) {
    console.error(err);
    setDetailsError(err.message || "Error al cargar el contenido.");
  } finally {
    setDetailsLoading(false);
  }
};

const closeDetails = () => {
  if (detailsLoading) return;
  setIsDetailsOpen(false);
  setSelectedBodega(null);
  setDetails({ insumos: [], productos: [] });
  setDetailsError("");
};

  return (
    <div className="flex-1 p-6 lg:p-8 bg-slate-50 overflow-auto">
      <section className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Bodegas</h1>
            <p className="text-xs text-slate-500 mt-1">
              Administra las bodegas donde se almacenan insumos y recetas.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
              <span className="text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, nombre o ubicación..."
                className="bg-transparent outline-none text-xs text-slate-700 placeholder:text-slate-400 w-56 md:w-72"
              />
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium shadow-sm hover:bg-indigo-700"
            >
              <span className="mr-1">＋</span>
              Agregar bodega
            </button>
          </div>
        </div>

        <section className="bg-white rounded-xl shadow-sm border border-slate-200">
          {loading && (
            <div className="p-6 text-sm text-slate-500">
              Cargando bodegas...
            </div>
          )}

          {error && !loading && (
            <div className="p-6 text-sm text-red-600">{error}</div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Código</th>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">
                      Ubicación
                    </th>
                    <th className="px-4 py-3 text-right">Insumos</th>
                    <th className="px-4 py-3 text-right">Recetas</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {bodegasFiltradas.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-6 text-center text-sm text-slate-500"
                      >
                        No se encontraron bodegas.
                      </td>
                    </tr>
                  )}

                  {bodegasFiltradas.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-slate-100 hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {b.codigo}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        {b.nombre}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">
                        {b.ubicacion || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">
                        {b.insumos_count ?? 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">
                        {b.recetas_count ?? 0}
                      </td>
                      <td className="px-4 py-3 text-xs text-center">
                        <div className="inline-flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => openDetails(b)}
                                className="px-2 py-1 rounded border border-slate-200 text-[11px] hover:bg-slate-50"
                            >
                                Ver contenido
                            </button>
                          <button
                            type="button"
                            onClick={() => openEdit(b)}
                            className="px-2 py-1 rounded border border-slate-200 text-[11px] hover:bg-slate-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(b)}
                            className="px-2 py-1 rounded border border-red-100 text-[11px] text-red-600 hover:bg-red-50"
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
          )}
        </section>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 mb-2">
                {editingId ? "Editar bodega" : "Nueva bodega"}
              </h2>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">
                  Código
                </label>
                <input
                  type="text"
                  name="codigo"
                  value={form.codigo}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">
                  Nombre
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">
                  Ubicación
                </label>
                <input
                  type="text"
                  name="ubicacion"
                  value={form.ubicacion}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                />
              </div>

              {saveError && (
                <p className="text-xs text-red-600">{saveError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isDetailsOpen && (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Contenido de bodega
          </h2>
          <p className="text-xs text-slate-500">
            {selectedBodega
              ? `${selectedBodega.codigo} — ${selectedBodega.nombre}`
              : ""}
          </p>
          {detailsError && (
            <p className="text-xs text-red-600 mt-1">{detailsError}</p>
          )}
        </div>
        <button
          type="button"
          onClick={closeDetails}
          className="text-slate-400 hover:text-slate-600 text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-auto">
        {/* Insumos */}
        <div className="flex flex-col">
          <div className="px-5 py-3 bg-white border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Insumos ({details.insumos.length})
            </h3>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {detailsLoading ? (
              <p className="text-xs text-slate-500">Cargando insumos...</p>
            ) : details.insumos.length === 0 ? (
              <p className="text-xs text-slate-400">
                No hay insumos registrados en esta bodega.
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-[10px] text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                    <th className="py-1 pr-2 text-left">Código</th>
                    <th className="py-1 pr-2 text-left">Nombre</th>
                    <th className="py-1 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {details.insumos.map((i) => (
                    <tr
                      key={i.id}
                      className="border-b border-slate-100 hover:bg-slate-50/60"
                    >
                      <td className="py-1 pr-2">{i.codigo}</td>
                      <td className="py-1 pr-2">{i.nombre}</td>
                      <td className="py-1 text-right">
                        {Number(i.stock_actual).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Productos */}
        <div className="flex flex-col">
          <div className="px-5 py-3 bg-white border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Productos ({details.productos.length})
            </h3>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {detailsLoading ? (
              <p className="text-xs text-slate-500">Cargando productos...</p>
            ) : details.productos.length === 0 ? (
              <p className="text-xs text-slate-400">
                No hay productos asociados a recetas en esta bodega.
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-[10px] text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                    <th className="py-1 pr-2 text-left">Código</th>
                    <th className="py-1 pr-2 text-left">Nombre</th>
                    <th className="py-1 text-right">Cantidad</th> {/* 👈 nuevo */}
                  </tr>
                </thead>
                <tbody>
                  {details.productos.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 hover:bg-slate-50/60"
                    >
                      <td className="py-1 pr-2">{p.codigo}</td>
                      <td className="py-1 pr-2">{p.nombre}</td>
                      <td className="py-1 text-right">{Number(p.total_producido || 0).toLocaleString()} u</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
)}

    </div>
    
  );
}
