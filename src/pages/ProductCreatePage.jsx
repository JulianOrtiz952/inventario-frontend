// src/pages/ProductsPage.jsx
import { useEffect, useMemo, useState } from "react";
import CreateProductModal from "../components/CreateProductModal";

const API_BASE = "http://127.0.0.1:8000/api";

export default function ProductsPage() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  // Modal crear
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    tela: "",
    color: "",
    talla: "",
    marca: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Cargar productos
  useEffect(() => {
    async function loadProductos() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/productos/`);
        if (!res.ok) {
          throw new Error("Error al obtener los productos.");
        }

        const data = await res.json();
        setProductos(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error cargando productos.");
      } finally {
        setLoading(false);
      }
    }

    loadProductos();
  }, []);

  const productosFiltrados = useMemo(
    () =>
      productos.filter((p) => {
        if (!search.trim()) return true;
        const term = search.trim().toLowerCase();
        return (
          p.nombre.toLowerCase().includes(term) ||
          (p.codigo && p.codigo.toLowerCase().includes(term))
        );
      }),
    [productos, search]
  );

  // Crear producto
  function openCreateModal() {
    setCreateForm({
      codigo: "",
      nombre: "",
      descripcion: "",
      tela: "",
      color: "",
      talla: "",
      marca: "",
    });
    setCreateError("");
    setIsCreateOpen(true);
  }

  function closeCreateModal() {
    if (createLoading) return;
    setIsCreateOpen(false);
  }

  function handleCreateChange(e) {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    setCreateError("");

    if (!createForm.codigo || !createForm.nombre) {
      setCreateError("El código y el nombre son obligatorios.");
      return;
    }

    try {
      setCreateLoading(true);
      const res = await fetch(`${API_BASE}/productos/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Error creando producto:", data);
        throw new Error("No se pudo crear el producto.");
      }

      const created = await res.json();
      setProductos((prev) => [created, ...prev]);
      setIsCreateOpen(false);
    } catch (err) {
      console.error(err);
      setCreateError(err.message || "Error al crear el producto.");
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header sección */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Productos / Recetas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Aquí puedes gestionar tus productos y sus recetas de insumos.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          {/* Buscador */}
          <div className="flex items-center w-full md:w-64 bg-white rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm">
            <span className="mr-2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Botón agregar */}
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700"
          >
            <span className="text-lg leading-none">＋</span>
            Agregar producto
          </button>
        </div>
      </div>

      {/* Tabla */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading && (
          <div className="p-6 text-sm text-slate-600">
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
                  <th className="px-4 py-3 text-left hidden md:table-cell">
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
                      No hay productos que coincidan con el filtro.
                    </td>
                  </tr>
                )}

                {productosFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-slate-100 hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium">
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
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                      {p.creado_en
                        ? new Date(p.creado_en).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {/* Aquí luego podemos poner 👁️ ✏️ etc. */}
                      <span className="text-xs text-slate-400">
                        Próximamente
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal crear producto */}
      <CreateProductModal
        isOpen={isCreateOpen}
        onClose={closeCreateModal}
        onSubmit={handleCreateSubmit}
        loading={createLoading}
        error={createError}
        form={createForm}
        onChange={handleCreateChange}
      />
    </div>
  );
}
