import { useEffect, useMemo, useState } from "react";
import CreateRecipeModal from "../components/CreateRecipeModal";

const API_BASE = "http://127.0.0.1:8000/api";

export default function RecipesPage() {
  const [recetas, setRecetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Cargar recetas
  useEffect(() => {
    async function loadRecetas() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_BASE}/recetas/`);
        if (!res.ok) throw new Error("Error al obtener las recetas.");
        const data = await res.json();
        setRecetas(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error cargando recetas.");
      } finally {
        setLoading(false);
      }
    }

    loadRecetas();
  }, []);

  function openCreate() {
    setIsCreateOpen(true);
  }

  function closeCreate() {
    setIsCreateOpen(false);
  }

  function handleRecipeCreated(receta) {
    setRecetas((prev) => [receta, ...prev]);
  }

  const recetasFiltradas = useMemo(
    () =>
      recetas.filter((r) => {
        if (!search.trim()) return true;
        const term = search.trim().toLowerCase();
        return (
          r.nombre.toLowerCase().includes(term) ||
          (r.codigo && r.codigo.toLowerCase().includes(term))
        );
      }),
    [recetas, search]
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header sección */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Recetas (plantillas)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Define aquí las recetas base de materiales que luego usarás para
            crear productos.
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

          {/* Botón nueva receta */}
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700"
          >
            <span className="text-lg leading-none">＋</span>
            Nueva receta
          </button>
        </div>
      </div>

      {/* Tabla de recetas */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading && (
          <div className="p-6 text-sm text-slate-600">
            Cargando recetas...
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
                    # Insumos
                  </th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {recetasFiltradas.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-6 text-center text-sm text-slate-500"
                    >
                      No hay recetas que coincidan con el filtro.
                    </td>
                  </tr>
                )}

                {recetasFiltradas.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-slate-100 hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                      {r.codigo}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800">
                      {r.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {r.tela || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {r.color || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {r.talla || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {r.marca || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 text-center hidden md:table-cell">
                      {r.items?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {/* Aquí luego podemos poner 👁️ para ver la receta,
                          ✏️ para editar, etc. */}
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

      {/* Modal de nueva receta */}
      <CreateRecipeModal
        isOpen={isCreateOpen}
        onClose={closeCreate}
        onCreated={handleRecipeCreated}
      />
    </div>
  );
}
