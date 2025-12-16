// ProductsPage.jsx
import { useEffect, useMemo, useState } from "react";
import CreateProductModal from "../components/CreateProductModal";
import ProductDetailsModal from "../components/ProductDetailsModal";
import ActionIconButton from "../components/ActionIconButton";
import EditProductModal from "../components/EditProductModal";
import { API_BASE } from "../config/api";

const PAGE_SIZE = 30;

function asRows(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}

export default function ProductsPage() {
  const [productos, setProductos] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // VIEW
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");

  // EDIT
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSku, setEditSku] = useState(null);

  // DELETE
  const [deleteLoading, setDeleteLoading] = useState(false);

  // STOCK POR TALLAS
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [stockSku, setStockSku] = useState(null);
  const [stockHeader, setStockHeader] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState("");

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

  async function loadProductos(targetPage = 1) {
    const res = await fetch(`${API_BASE}/productos/?page=${targetPage}&page_size=${PAGE_SIZE}`);
    if (!res.ok) throw new Error("No se pudieron cargar los productos.");
    const data = await res.json();

    setProductos(asRows(data));
    setCount(Number(data?.count || 0));
    setNextUrl(data?.next || null);
    setPrevUrl(data?.previous || null);
    setPage(targetPage);
  }

  // Load list (paginado)
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        await loadProductos(1);
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

  const handleProductCreated = async () => {
    // ✅ En modo paginado, es mejor recargar la página actual
    await loadProductos(page);
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

      // ✅ si borraste el último de la página, intenta ir a la anterior
      const newCount = Math.max(0, count - 1);
      const maxPage = Math.max(1, Math.ceil(newCount / PAGE_SIZE));
      const target = Math.min(page, maxPage);

      if (viewProduct?.codigo_sku === sku) {
        setIsViewOpen(false);
        setViewProduct(null);
      }

      await loadProductos(target);
      setCount(newCount);
    } catch (e) {
      console.error(e);
      alert(e.message || "Error eliminando producto.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function openStockPorTallas(sku) {
    try {
      setIsStockOpen(true);
      setStockSku(sku);
      setStockHeader(null);
      setStockItems([]);
      setStockError("");
      setStockLoading(true);

      const res = await fetch(`${API_BASE}/productos/${encodeURIComponent(sku)}/stock-por-talla/`);
      if (!res.ok) throw new Error("No se pudo cargar el stock por tallas.");
      const data = await res.json();

      setStockHeader(data?.producto || { codigo: sku, nombre: "—" });
      setStockItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      setStockError(e.message || "Error cargando stock por tallas.");
    } finally {
      setStockLoading(false);
    }
  }

  function closeStockModal() {
    setIsStockOpen(false);
    setStockSku(null);
    setStockHeader(null);
    setStockItems([]);
    setStockError("");
    setStockLoading(false);
  }

  async function goPrev() {
    if (!prevUrl || loading) return;
    setLoading(true);
    try {
      await loadProductos(Math.max(1, page - 1));
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
      await loadProductos(page + 1);
    } catch (e) {
      setError(e.message || "Error al cambiar de página.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 p-6 lg:p-8 bg-slate-50 overflow-auto">
      <section className="max-w-7xl mx-auto space-y-4">
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
                placeholder="Buscar por SKU, nombre o código de barras (en esta página)..."
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

        {/* ✅ Barra de paginación */}
        <div className="flex items-center justify-between gap-3">
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
                        No se encontraron productos (en esta página).
                      </td>
                    </tr>
                  )}

                  {productosFiltrados.map((p) => {
                    const sku = p.codigo_sku;
                    const bd = p.price_breakdown || null;

                    const base = bd?.precio_base ?? null;
                    const desc = bd?.total_descuentos ?? null;
                    const sinIvaDesc =
                      bd?.precio_sin_iva_con_descuentos ?? bd?.valor_producto_sin_iva ?? null;
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
                          {p?.tercero?.nombre ? (
                            <span>
                              {p.tercero.nombre}
                              <span className="text-slate-400">
                                {p.tercero.codigo ? ` (${p.tercero.codigo})` : ""}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-xs text-slate-700 tabular-nums">
                          <div className="flex items-center gap-2">
                            <span>
                              {p?.datos_adicionales?.stock ?? <span className="text-slate-400">—</span>}
                            </span>

                            <button
                              type="button"
                              onClick={() => openStockPorTallas(sku)}
                              className="ml-auto inline-flex items-center justify-center w-7 h-7 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              title="Ver stock por tallas"
                            >
                              …
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-xs text-slate-600">{p.unidad_medida || "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{money(base)}</td>

                        <td className="px-4 py-3 text-right tabular-nums">
                          {toNumber(desc) ? (
                            <span className="text-orange-700">-{money(desc)}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
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

      {/* Ver */}
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
        onUpdated={async () => {
          // ✅ en modo paginado: recarga para no desordenar la página
          await loadProductos(page);
        }}
      />

      {/* MODAL: STOCK POR TALLAS */}
      {isStockOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Stock por tallas</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  SKU: <b>{stockHeader?.codigo || stockSku || "—"}</b> • {stockHeader?.nombre || "—"}
                </p>
              </div>
              <button className="text-slate-400 hover:text-slate-600" onClick={closeStockModal}>
                ✕
              </button>
            </div>

            <div className="px-6 py-4">
              {stockLoading && <div className="text-xs text-slate-500">Cargando...</div>}

              {stockError && !stockLoading && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                  {stockError}
                </div>
              )}

              {!stockLoading && !stockError && (
                <>
                  {stockItems.length === 0 ? (
                    <div className="text-xs text-slate-500">
                      No hay movimientos/ensambles con tallas para este producto.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 border border-slate-200">
                          <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <th className="px-3 py-2 text-left">Código</th>
                            <th className="px-3 py-2 text-left">Nombre</th>
                            <th className="px-3 py-2 text-left">Talla</th>
                            <th className="px-3 py-2 text-right">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockItems.map((it, idx) => (
                            <tr key={`${it.codigo}-${it.talla}-${idx}`} className="border-b border-slate-100">
                              <td className="px-3 py-2 text-slate-800">{it.codigo}</td>
                              <td className="px-3 py-2 text-slate-800">{it.nombre}</td>
                              <td className="px-3 py-2 text-slate-700">{it.talla}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-slate-900 font-medium">
                                {it.cantidad}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={closeStockModal}
                      className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
