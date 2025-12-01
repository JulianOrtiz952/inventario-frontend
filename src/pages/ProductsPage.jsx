// src/pages/ProductsPage.jsx
import { useEffect, useMemo, useState } from "react";
import CreateProductModal from "../components/CreateProductModal";

const API_BASE = "http://127.0.0.1:8000/api";

export default function ProductsPage() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Cargar productos
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/productos/`);
        if (!res.ok) {
          throw new Error("No se pudieron cargar los productos.");
        }
        const data = await res.json();
        setProductos(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error al cargar productos.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Filtrado por búsqueda
  const productosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter((p) => {
      const codigo = (p.codigo || "").toLowerCase();
      const nombre = (p.nombre || "").toLowerCase();
      return codigo.includes(term) || nombre.includes(term);
    });
  }, [search, productos]);

  const openCreateModal = () => setIsCreateOpen(true);
  const closeCreateModal = () => setIsCreateOpen(false);

  // Cuando se crea un producto desde el modal
  const handleProductCreated = (nuevo) => {
    setProductos((prev) => [nuevo, ...prev]);
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-slate-50 overflow-auto">
      <section className="max-w-6xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Productos
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Crea productos basados en recetas predefinidas de materiales.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            {/* Buscador */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
              <span className="text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="bg-transparent outline-none text-xs text-slate-700 placeholder:text-slate-400 w-48 md:w-64"
              />
            </div>

            {/* Botón agregar */}
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700"
            >
              <span className="mr-1">＋</span>
              Agregar producto
            </button>
          </div>
        </div>

        {/* Contenido */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200">
          {loading && (
            <div className="p-6 text-sm text-slate-500">
              Cargando productos...
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
                    <th className="px-4 py-3 text-left">Tela</th>
                    <th className="px-4 py-3 text-left">Color</th>
                    <th className="px-4 py-3 text-left">Talla</th>
                    <th className="px-4 py-3 text-left">Marca</th>
                    <th className="px-4 py-3 text-center hidden md:table-cell">
                      Creado
                    </th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-6 text-center text-sm text-slate-500"
                      >
                        No se encontraron productos.
                      </td>
                    </tr>
                  )}

                  {productosFiltrados.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {p.codigo}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        {p.nombre}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {p.tela || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {p.color || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {p.talla || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {p.marca || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 text-center hidden md:table-cell">
                        {p.creado_en
                          ? new Date(p.creado_en).toLocaleDateString("es-CO")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-center text-slate-400">
                        Próximamente
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      {/* Modal crear producto */}
      <CreateProductModal
        isOpen={isCreateOpen}
        onClose={closeCreateModal}
        onCreated={handleProductCreated}
      />
    </div>
  );
}
