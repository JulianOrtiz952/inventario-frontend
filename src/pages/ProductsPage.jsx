import { useEffect, useMemo, useState } from "react";
import CreateProductModal from "../components/CreateProductModal";
import ProductDetailsModal from "../components/ProductDetailsModal";
import ActionIconButton from "../components/ActionIconButton";
import EditProductModal from "../components/EditProductModal";

const API_BASE = "http://127.0.0.1:8000/api";

export default function ProductsPage() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // VIEW
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSku, setEditSku] = useState(null);

  // DELETE
  const [deleteLoading, setDeleteLoading] = useState(false);

  const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const money = (v) => {
    const n = toNumber(v);
    if (n === null) return "—";
    return `$${n.toLocaleString("es-CO", { maximumFractionDigits: 2 })}`;
  };

  const pct = (v) => {
    const n = toNumber(v);
    if (n === null) return "—";
    return `${n.toLocaleString("es-CO", { maximumFractionDigits: 2 })}%`;
  };

  // Load list
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/productos/`);
        if (!res.ok) throw new Error("No se pudieron cargar los productos.");
        const data = await res.json();
        setProductos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error al cargar productos.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const productosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return productos;

    return productos.filter((p) => {
      const sku = String(p.codigo_sku || "").toLowerCase();
      const nombre = String(p.nombre || "").toLowerCase();
      const barras = String(p.codigo_barras || "").toLowerCase();
      return sku.includes(term) || nombre.includes(term) || barras.includes(term);
    });
  }, [search, productos]);

  const handleProductCreated = (nuevo) => {
    // Ya viene completo desde backend
    setProductos((prev) => [nuevo, ...prev]);
  };

  async function handleView(sku) {
    try {
      setIsViewOpen(true);
      setViewProduct(null);
      setViewError("");
      setViewLoading(true);

      const res = await fetch(`${API_BASE}/productos/${encodeURIComponent(sku)}/`);
      if (!res.ok) throw new Error("No se pudo cargar el detalle del producto.");
      const data = await res.json();

      setViewProduct(data);
    } catch (e) {
      console.error(e);
      setViewError(e.message || "Error cargando detalle.");
    } finally {
      setViewLoading(false);
    }
  }

  async function handleDelete(sku) {
    const ok = window.confirm(`¿Eliminar el producto ${sku}? Esta acción no se puede deshacer.`);
    if (!ok) return;

    try {
      setDeleteLoading(true);

      const res = await fetch(`${API_BASE}/productos/${encodeURIComponent(sku)}/`, {
        method: "DELETE",
      });

      if (!res.ok && res.status !== 204) {
        throw new Error("No se pudo eliminar el producto.");
      }

      setProductos((prev) => prev.filter((p) => p.codigo_sku !== sku));

      // Si estaba abierto el modal de ver ese mismo producto, lo cierro:
      if (viewProduct?.codigo_sku === sku) {
        setIsViewOpen(false);
        setViewProduct(null);
      }
    } catch (e) {
      console.error(e);
      alert(e.message || "Error eliminando producto.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex-1 p-6 lg:p-8 bg-slate-50 overflow-auto">
      <section className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Productos</h1>
            <p className="text-xs text-slate-500 mt-1">
              Incluye precios, descuentos e IVA (price_breakdown).
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
              <span className="text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por SKU, nombre o código de barras..."
                className="bg-transparent outline-none text-xs text-slate-700 placeholder:text-slate-400 w-56 md:w-80"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700"
            >
              <span className="mr-1">＋</span>
              Agregar producto
            </button>
          </div>
        </div>

        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading && <div className="p-6 text-sm text-slate-500">Cargando productos...</div>}
          {error && !loading && <div className="p-6 text-sm text-red-600">{error}</div>}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">SKU</th>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Tercero</th>
                    <th className="px-4 py-3 text-left">Stock</th>
                    <th className="px-4 py-3 text-left">U.M.</th>
                    <th className="px-4 py-3 text-right">Base</th>
                    <th className="px-4 py-3 text-right">Desc.</th>
                    <th className="px-4 py-3 text-right">Sin IVA (c/desc)</th>
                    <th className="px-4 py-3 text-right">IVA</th>
                    <th className="px-4 py-3 text-right">Total</th>

                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {productosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-6 py-6 text-center text-sm text-slate-500">
                        No se encontraron productos.
                      </td>
                    </tr>
                  )}

                  {productosFiltrados.map((p) => {
                    const sku = p.codigo_sku;
                    const bd = p.price_breakdown || null;

                    const base = bd?.precio_base ?? null;
                    const desc = bd?.total_descuentos ?? null;
                    const sinIvaDesc = bd?.precio_sin_iva_con_descuentos ?? bd?.valor_producto_sin_iva ?? null;
                    const iva = bd?.valor_iva ?? null;
                    const ivaPct = bd?.porcentaje_impuestos ?? null;
                    const total = bd?.total ?? bd?.precio_con_iva ?? null;

                    return (
                      <tr
                        key={sku}
                        className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{sku}</td>
                        <td className="px-4 py-3 text-sm text-slate-800">{p.nombre}</td>
                        <td className="px-4 py-3 text-xs text-slate-700">
  {p?.tercero?.nombre
    ? (
        <span>
          {p.tercero.nombre}
          <span className="text-slate-400">
            {p.tercero.codigo ? ` (${p.tercero.codigo})` : ""}
          </span>
        </span>
      )
    : <span className="text-slate-400">—</span>
  }
</td>
                        <td className="px-4 py-3 text-xs text-slate-700 tabular-nums">
  {p?.datos_adicionales?.stock ?? <span className="text-slate-400">—</span>}
</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{p.unidad_medida || "—"}</td>

                        <td className="px-4 py-3 text-right tabular-nums">{money(base)}</td>

                        <td className="px-4 py-3 text-right tabular-nums">
                          {toNumber(desc) ? <span className="text-orange-700">-{money(desc)}</span> : <span className="text-slate-400">—</span>}
                        </td>

                        <td className="px-4 py-3 text-right tabular-nums">{money(sinIvaDesc)}</td>

                        <td className="px-4 py-3 text-right tabular-nums">
                          {iva !== null ? (
                            <div className="flex flex-col items-end">
                              <span className="text-slate-800">{money(iva)}</span>
                              <span className="text-[11px] text-slate-400">{pct(ivaPct)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                          {money(total)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <ActionIconButton label="Ver" onClick={() => handleView(sku)}>
                              👁️
                            </ActionIconButton>

                            <ActionIconButton
                label="Editar"
  onClick={() => {
    setEditSku(sku);
    setIsEditOpen(true);
  }}
>
  ✏️
</ActionIconButton>

                            <ActionIconButton
                              label="Eliminar"
                              onClick={() => handleDelete(sku)}
                              disabled={deleteLoading}
                            >
                              🗑️
                            </ActionIconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="px-4 py-3 text-[11px] text-slate-400 border-t border-slate-100">
                Si algún producto no trae <b>price_breakdown</b> en el listado, se verá “—”.
              </div>
            </div>
          )}
        </section>
      </section>

      {/* Crear */}
      <CreateProductModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleProductCreated}
      />

      {/* Ver (mismo estilo cliente-friendly) */}
      <ProductDetailsModal
        isOpen={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setViewProduct(null);
          setViewError("");
        }}
        product={viewProduct}
        title={viewLoading ? "Cargando..." : "Detalle del producto"}
      />

      {/* Si quieres mostrar un error bonito dentro del modal */}
      {isViewOpen && viewError && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg shadow">
            {viewError}
          </div>
        </div>
      )}

      <EditProductModal
  isOpen={isEditOpen}
  sku={editSku}
  onClose={() => {
    setIsEditOpen(false);
    setEditSku(null);
  }}
  onUpdated={(p) => {
    setProductos((prev) =>
      prev.map((x) => (x.codigo_sku === p.codigo_sku ? p : x))
    );
  }}
/>
    </div>
  );
}
