// ProductsPage.jsx
import { useEffect, useMemo, useState } from "react";
import CreateProductModal from "../components/CreateProductModal";
import ProductDetailsModal from "../components/ProductDetailsModal";
import ActionIconButton from "../components/ActionIconButton";
import EditProductModal from "../components/EditProductModal";
import CurrencyInput from "../components/CurrencyInput";
import { formatCurrency } from "../utils/format";
import { API_BASE } from "../config/api";
import {
  Search, Plus, ChevronLeft, ChevronRight,
  Pencil, Trash2, RotateCcw, Eye,
  Info, AlertCircle
} from "lucide-react";
import { asRows, fetchAllPages, buildQueryParams } from "../utils/api";
import ConfirmActionModal from "../components/ConfirmActionModal";

const PAGE_SIZE = 30;



export default function ProductsPage() {
  const [productos, setProductos] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [terceroFiltro, setTerceroFiltro] = useState("todos");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");

  const [terceros, setTerceros] = useState([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // VIEW
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");

  // EDIT
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSku, setEditSku] = useState(null);

  // DELETE / TOGGLE ACTIVE
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [productToAction, setProductToAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

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
    return `$${formatCurrency(n)}`;
  };

  const pct = (v) => {
    const n = toNumber(v);
    if (n === null) return "—";
    return `${formatCurrency(n)}%`;
  };

  async function loadProductos(targetPage = 1) {
    const filteredTercero = terceroFiltro !== "todos" ? terceroFiltro : undefined;
    const query = buildQueryParams({
      page: targetPage,
      page_size: PAGE_SIZE,
      search,
      tercero: filteredTercero,
      precio_min: precioMin,
      precio_max: precioMax,
    });

    const res = await fetch(`${API_BASE}/productos/${query}`);
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
        const tData = await fetchAllPages(`${API_BASE}/terceros/`);
        setTerceros(tData);

        await loadProductos(1);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error al cargar productos.");
      } finally {
        setLoading(false);
      }
    };

    // If search is empty, load immediately (initial load logic mostly)
    if (!search) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search + filters
  useEffect(() => {
    const timer = setTimeout(() => {
      // Trigger load with page 1
      loadProductos(1).catch((err) => console.error(err));
    }, 400);
    return () => clearTimeout(timer);
  }, [search, terceroFiltro, precioMin, precioMax]);

  // ELIMINADO client-side filtering
  // const productosFiltrados = ...

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

  const openActionModal = (prod) => {
    setProductToAction(prod);
    setActionError("");
    setActionModalOpen(true);
  };

  const closeActionModal = () => {
    if (actionLoading) return;
    setActionModalOpen(false);
    setProductToAction(null);
  };

  const handleToggleActiveConfirm = async () => {
    if (!productToAction) return;

    const sku = productToAction.codigo_sku;
    const isActive = productToAction.es_activo !== false;
    const actionName = isActive ? "Desactivar" : "Reactivar";

    try {
      setActionLoading(true);
      setActionError("");

      let res;
      if (isActive) {
        // Desactivar (Soft Delete)
        res = await fetch(`${API_BASE}/productos/${encodeURIComponent(sku)}/`, { method: "DELETE" });
      } else {
        // Reactivar (Patch)
        res = await fetch(`${API_BASE}/productos/${encodeURIComponent(sku)}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ es_activo: true }),
        });
      }

      if (!res.ok && res.status !== 204) {
        throw new Error(`No se pudo ${actionName.toLowerCase()} el producto.`);
      }

      closeActionModal();
      await loadProductos(page);
    } catch (e) {
      console.error(e);
      setActionError(e.message || `Error al ${actionName.toLowerCase()} producto.`);
    } finally {
      setActionLoading(false);
    }
  };

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
              Información detallada de precios, descuentos e impuestos.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            {/* Filtros extra */}
            <div className="flex items-center gap-2">
              <select
                value={terceroFiltro}
                onChange={(e) => setTerceroFiltro(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 max-w-[140px]"
              >
                <option value="todos">Todos los terceros</option>
                {terceros.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-0 bg-white border border-slate-200 rounded-lg px-2 py-1 h-[34px]">
                <span className="text-[10px] text-slate-500 uppercase font-semibold mr-1">$$</span>
                <CurrencyInput
                  placeholder="Min"
                  value={precioMin}
                  onChange={(e) => setPrecioMin(e.target.value)}
                  className="w-20 outline-none text-xs text-slate-700 placeholder:text-slate-400 border-r border-slate-100 pr-1 text-right"
                />
                <CurrencyInput
                  placeholder="Max"
                  value={precioMax}
                  onChange={(e) => setPrecioMax(e.target.value)}
                  className="w-20 outline-none text-xs text-slate-700 placeholder:text-slate-400 pl-1 text-right"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <span className="text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar SKU, nombre..."
                className="bg-transparent outline-none text-xs text-slate-700 placeholder:text-slate-400 w-32 md:w-48"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} className="mr-1.5" />
              Agregar
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
              className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 text-xs disabled:opacity-50 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <button
              type="button"
              disabled={!nextUrl || loading}
              onClick={goNext}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 text-xs disabled:opacity-50 hover:bg-slate-50 transition-colors"
            >
              Siguiente <ChevronRight size={14} />
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
                  {productos.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-6 py-6 text-center text-sm text-slate-500">
                        No se encontraron productos{search ? " que coincidan con la búsqueda" : ""}.
                      </td>
                    </tr>
                  )}

                  {productos.map((p) => {
                    const sku = p.codigo_sku;
                    const bd = p.price_breakdown || null;
                    const isActive = p.es_activo !== false;

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
                        className={`border-b border-slate-100 transition-colors ${!isActive ? "bg-slate-50/70" : "hover:bg-slate-50/70"}`}
                      >
                        <td className={`px-4 py-3 text-sm font-medium ${!isActive ? "text-slate-400 line-through decoration-slate-300" : "text-slate-800"}`}>
                          {sku}
                        </td>
                        <td className={`px-4 py-3 text-sm ${!isActive ? "text-slate-400 line-through decoration-slate-300" : "text-slate-800"}`}>
                          {p.nombre}
                        </td>

                        <td className="px-4 py-3 text-xs text-slate-700">
                          {p?.tercero?.nombre ? (
                            <span className={!isActive ? "text-slate-400" : ""}>
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
                            {(() => {
                              const stock = Number(p?.datos_adicionales?.stock ?? 0);
                              const min = Number(p?.datos_adicionales?.stock_minimo ?? 0);
                              const isLow = isActive && min > 0 && stock < min;

                              return (
                                <span className={`flex items-center gap-1.5 font-medium ${!isActive ? "text-slate-400" : isLow ? "text-red-600" : ""}`}>
                                  {p?.datos_adicionales?.stock ?? <span className="text-slate-400">—</span>}
                                  {isLow && (
                                    <AlertCircle size={14} className="text-red-500" title={`Bajo mínimo (Min: ${min})`} />
                                  )}
                                </span>
                              );
                            })()}

                            <button
                              type="button"
                              onClick={() => openStockPorTallas(sku)}
                              className="ml-auto inline-flex items-center justify-center w-7 h-7 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                              title="Ver stock por tallas"
                            >
                              <Info size={14} />
                            </button>
                          </div>
                        </td>

                        <td className={`px-4 py-3 text-xs ${!isActive ? "text-slate-400" : "text-slate-600"}`}>
                          {p.unidad_medida || "—"}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums ${!isActive ? "text-slate-400" : ""}`}>{money(base)}</td>

                        <td className="px-4 py-3 text-right tabular-nums">
                          {toNumber(desc) ? (
                            <span className={`${!isActive ? "text-orange-300" : "text-orange-700"}`}>-{money(desc)}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className={`px-4 py-3 text-right tabular-nums ${!isActive ? "text-slate-400" : ""}`}>{money(sinIvaDesc)}</td>

                        <td className="px-4 py-3 text-right tabular-nums">
                          {iva !== null ? (
                            <div className="flex flex-col items-end">
                              <span className={!isActive ? "text-slate-400" : "text-slate-800"}>{money(iva)}</span>
                              <span className="text-[11px] text-slate-400">{pct(ivaPct)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className={`px-4 py-3 text-right tabular-nums font-semibold ${!isActive ? "text-slate-400" : "text-slate-900"}`}>
                          {money(total)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <ActionIconButton label="Ver" onClick={() => handleView(sku)}>
                              <Eye size={14} />
                            </ActionIconButton>

                            <ActionIconButton
                              label="Editar"
                              onClick={() => {
                                setEditSku(sku);
                                setIsEditOpen(true);
                              }}
                            >
                              <Pencil size={14} />
                            </ActionIconButton>

                            <button
                              type="button"
                              onClick={() => openActionModal(p)}
                              className={`p-1.5 rounded-md border transition-colors bg-white ${isActive
                                ? "border-red-100 text-red-600 hover:bg-red-50"
                                : "border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                                }`}
                              title={isActive ? "Desactivar" : "Reactivar"}
                            >
                              {isActive ? <Trash2 size={14} /> : <RotateCcw size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>


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

      <ConfirmActionModal
        isOpen={actionModalOpen}
        onClose={closeActionModal}
        onConfirm={handleToggleActiveConfirm}
        loading={actionLoading}
        error={actionError}
        title={(productToAction?.es_activo !== false) ? "Desactivar Producto" : "Reactivar Producto"}
        message={
          (productToAction?.es_activo !== false)
            ? <span>¿Estás seguro de que deseas desactivar el producto <strong>{productToAction?.codigo_sku}</strong>?</span>
            : <span>¿Deseas reactivar el producto <strong>{productToAction?.codigo_sku}</strong>?</span>
        }
        description={
          (productToAction?.es_activo !== false)
            ? "El producto ya no aparecerá en ventas o procesos activos, pero su historial se mantendrá."
            : "El producto volverá a estar disponible para todos los procesos del sistema."
        }
        confirmText={(productToAction?.es_activo !== false) ? "Desactivar" : "Reactivar"}
        isDestructive={(productToAction?.es_activo !== false)}
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
