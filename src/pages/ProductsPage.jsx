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

  const num = (v) => {
    const n = toNumber(v);
    if (n === null) return "—";
    return formatCurrency(n);
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
        const tDataRaw = await fetchAllPages(`${API_BASE}/terceros/`);
        // ✅ Filtrar terceros inactivos
        const tData = Array.isArray(tDataRaw) ? tDataRaw.filter(t => t.es_activo !== false) : [];
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
    <div className="flex-1 p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 italic tracking-tight">
              Productos <span className="text-blue-600 dark:text-blue-400 not-italic">y Precios</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Información detallada de precios, descuentos e impuestos.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 self-start md:self-center"
          >
            <Plus size={18} />
            Nuevo Producto
          </button>
        </div>

        {/* Search and Filters Bar */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative group">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <Search size={18} />
              </span>
              <input
                className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 pl-11 pr-4 py-3 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                placeholder="Buscar SKU, nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={terceroFiltro}
                onChange={(e) => setTerceroFiltro(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              >
                <option value="todos">Todos los terceros</option>
                {terceros.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 shadow-sm">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mr-1">$$</span>
                <CurrencyInput
                  placeholder="Min"
                  value={precioMin}
                  onChange={(e) => setPrecioMin(e.target.value)}
                  className="w-16 bg-transparent outline-none text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 text-right"
                />
                <span className="text-slate-300 mx-1">|</span>
                <CurrencyInput
                  placeholder="Max"
                  value={precioMax}
                  onChange={(e) => setPrecioMax(e.target.value)}
                  className="w-16 bg-transparent outline-none text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 text-right"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between gap-3 mb-4 px-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Total: <b className="text-slate-900 dark:text-slate-100">{count}</b>
            <span className="mx-1">•</span>
            Página <b className="text-slate-900 dark:text-slate-100">{page}</b>
            <span className="ml-2 text-[11px] text-slate-400 dark:text-slate-500">(mostrando {PAGE_SIZE} por página)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!prevUrl || loading}
              onClick={goPrev}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-white dark:hover:bg-slate-900 hover:border-blue-500 transition-all shadow-sm"
            >
              ←
            </button>
            <button
              type="button"
              disabled={!nextUrl || loading}
              onClick={goNext}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-white dark:hover:bg-slate-900 hover:border-blue-500 transition-all shadow-sm"
            >
              →
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">SKU</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Nombre</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tercero</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Stock</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">U.M.</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Base</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Desc.</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Sin IVA</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">IVA</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total</th>
                  <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {productos.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
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
                      className={`transition-colors ${!isActive ? "bg-slate-50/70 dark:bg-slate-800/20" : "hover:bg-slate-50/60 dark:hover:bg-slate-800/40"}`}
                    >
                      <td className={`px-4 py-3 text-sm font-medium ${!isActive ? "text-slate-400 dark:text-slate-600 line-through decoration-slate-300 dark:decoration-slate-700" : "text-slate-800 dark:text-slate-200"}`}>
                        {sku}
                      </td>
                      <td className={`px-4 py-3 text-sm ${!isActive ? "text-slate-400 dark:text-slate-600 line-through decoration-slate-300 dark:decoration-slate-700" : "text-slate-800 dark:text-slate-200"}`}>
                        {p.nombre}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                        {p?.tercero?.nombre ? (
                          <span className={!isActive ? "text-slate-400 dark:text-slate-600" : ""}>
                            {p.tercero.nombre}
                            <span className="text-slate-400 dark:text-slate-500">
                              {p.tercero.codigo ? ` (${p.tercero.codigo})` : ""}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1.5 font-medium ${!isActive ? "text-slate-400 dark:text-slate-600" : ""}`}>
                            {num(p?.datos_adicionales?.stock ?? 0)}
                            <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-500">
                              {p.unidad_medida || "u"}
                            </span>
                            {(() => {
                              const stock = Number(p?.datos_adicionales?.stock ?? 0);
                              const min = Number(p?.datos_adicionales?.stock_minimo ?? 0);
                              const isLow = isActive && min > 0 && stock < min;
                              return isLow && (
                                <AlertCircle size={14} className="text-red-500 dark:text-red-400" title={`Bajo mínimo (Min: ${min})`} />
                              );
                            })()}
                          </span>

                          <button
                            type="button"
                            onClick={() => openStockPorTallas(sku)}
                            className="ml-auto inline-flex items-center justify-center w-7 h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            title="Ver stock por tallas"
                          >
                            <Info size={14} />
                          </button>
                        </div>
                      </td>

                      <td className={`px-4 py-3 text-xs ${!isActive ? "text-slate-400 dark:text-slate-600" : "text-slate-600 dark:text-slate-400"}`}>
                        {p.unidad_medida || "—"}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums ${!isActive ? "text-slate-400 dark:text-slate-600" : "dark:text-slate-200"}`}>{money(base)}</td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        {toNumber(desc) ? (
                          <span className={`${!isActive ? "text-orange-300 dark:text-orange-900/40" : "text-orange-700 dark:text-orange-400"}`}>-{money(desc)}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      <td className={`px-4 py-3 text-right tabular-nums ${!isActive ? "text-slate-400 dark:text-slate-600" : "dark:text-slate-200"}`}>{money(sinIvaDesc)}</td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        {iva !== null ? (
                          <div className="flex flex-col items-end">
                            <span className={!isActive ? "text-slate-400 dark:text-slate-600" : "text-slate-800 dark:text-slate-200"}>{money(iva)}</span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">{pct(ivaPct)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${!isActive ? "text-slate-400 dark:text-slate-600" : "text-slate-900 dark:text-white"}`}>
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
                            className={`p-1.5 rounded-md border transition-colors bg-white dark:bg-slate-900 ${isActive
                              ? "border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                              : "border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
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
        </div>
      </div>

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
          <div className="pointer-events-auto bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs px-4 py-3 rounded-lg shadow">
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
            ? <span>¿Estás seguro de que deseas desactivar el producto <strong className="text-slate-900 dark:text-slate-100">{productToAction?.codigo_sku}</strong>?</span>
            : <span>¿Deseas reactivar el producto <strong className="text-slate-900 dark:text-slate-100">{productToAction?.codigo_sku}</strong>?</span>
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
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-3xl max-h-[85vh] overflow-y-auto border border-white/10 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Stock por tallas</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  SKU: <b className="dark:text-slate-300">{stockHeader?.codigo || stockSku || "—"}</b> • {stockHeader?.nombre || "—"}
                </p>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" onClick={closeStockModal}>
                ✕
              </button>
            </div>

            <div className="px-6 py-4">
              {stockLoading && <div className="text-xs text-slate-500 dark:text-slate-400">Cargando...</div>}

              {stockError && !stockLoading && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-xs text-red-700 dark:text-red-400">
                  {stockError}
                </div>
              )}

              {!stockLoading && !stockError && (
                <>
                  {stockItems.length === 0 ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      No hay movimientos/ensambles con tallas para este producto.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            <th className="px-3 py-2 text-left">Código</th>
                            <th className="px-3 py-2 text-left">Nombre</th>
                            <th className="px-3 py-2 text-left">Talla</th>
                            <th className="px-3 py-2 text-right">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {stockItems.map((it, idx) => (
                            <tr key={`${it.codigo}-${it.talla}-${idx}`} className="">
                              <td className="px-3 py-2 text-slate-800 dark:text-slate-300">{it.codigo}</td>
                              <td className="px-3 py-2 text-slate-800 dark:text-slate-300">{it.nombre}</td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-400">{it.talla}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-slate-900 dark:text-slate-100 font-medium">
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
                      className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 transition-colors"
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
