import { useEffect, useMemo, useState, useCallback } from "react";
import ActionIconButton from "../components/ActionIconButton";
import CurrencyInput from "../components/CurrencyInput";
import { formatCurrency, parseCurrency } from "../utils/format";
import CreateInsumoModal from "../components/CreateInsumoModal";
import EditInsumoModal from "../components/EditInsumoModal";
import ViewInsumoModal from "../components/ViewInsumoModal";
import DeleteInsumoModal from "../components/DeleteInsumoModal";
import { API_BASE } from "../config/api";
import {
  Search, Plus, ChevronLeft, ChevronRight,
  Pencil, Trash2, RotateCcw, X, Eye,
  ArrowDownCircle, ArrowUpCircle, AlertCircle, CheckCircle, Package
} from "lucide-react";
import { asRows, safeJson, fetchAllPages, buildQueryParams } from "../utils/api";

const PAGE_SIZE = 30;



function moneyStr(v) {
  // normaliza decimales: "2,5" => "2.5"
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  if (!s) return "";
  return s.replace(",", ".");
}



function MovementModal({
  isOpen,
  type, // "entrada" | "salida"
  onClose,
  loading,
  error,
  search,
  onSearchChange,
  // insumos, // YA NO USAMOS LA LISTA DEL PADRE DIRECTAMENTE
  results,   // USAMOS LOS RESULTADOS DE BÚSQUEDA ASÍNCRONA
  searching, // estado de carga de la búsqueda
  selected,
  onSelect,
  form,
  onFormChange,
  tercerosOptions,
  bodegasOptions,
  stockData, // { bodega_id: stock } object passed from parent
  onSubmit,
}) {
  if (!isOpen) return null;

  const isEntrada = type === "entrada";
  const stockInSelectedBodega = (!isEntrada && form.bodega_id && stockData)
    ? (stockData[String(form.bodega_id)] ?? 0)
    : null;
  // Colores más acordes: Entrada (Blue/Indigo), Salida (Rose/Red) o similar al resto.
  // Usaremos Slate-900 para títulos y botones más sutiles o brand colors.
  // El usuario pidió "colores más acordes".
  // Entrada: bg-blue-600 (como crear). Salida: bg-rose-600 (advertencia suave).

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-all">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto border border-slate-100 dark:border-slate-800 scale-100 opacity-100 transition-all">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isEntrada ? "bg-blue-600" : "bg-rose-500"}`}></span>
              {isEntrada ? "Registrar Entrada de Insumo" : "Registrar Salida de Insumo"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Busca y selecciona el insumo para registrar el movimiento.
            </p>
          </div>
          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" onClick={onClose} disabled={loading}>
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Layout: Izq Buscador, Der Formulario */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Panel Izquierdo: Buscador */}
            <div className="flex flex-col gap-3 h-[420px]">
              <div className="relative group">
                <span className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">🔍</span>
                <input
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-500 transition-all placeholder:text-slate-400"
                  placeholder="Buscar por nombre o código..."
                  autoFocus
                />
              </div>

              <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50/30 dark:bg-slate-950/30 flex flex-col">
                {/* Header de lista */}
                <div className="px-4 py-2 bg-slate-100/50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase flex justify-between">
                  <span>Insumo</span>
                  <span>Stock Global</span>
                </div>

                <div className="overflow-y-auto flex-1 p-1 space-y-0.5 custom-scrollbar">
                  {searching ? (
                    <div className="p-4 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      Buscando...
                    </div>
                  ) : results.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No se encontraron insumos.
                    </div>
                  ) : (
                    results.map((i) => {
                      const active = selected?.codigo === i.codigo;
                      const isInactive = i.es_activo === false;
                      return (
                        <button
                          key={i.codigo}
                          type="button"
                          onClick={() => onSelect(i)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-200 group
                                   ${active
                              ? "bg-white dark:bg-slate-800 border-blue-500 shadow-md ring-1 ring-blue-500/20 z-10"
                              : "bg-transparent border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm"
                            }
                                   ${isInactive ? "opacity-60 bg-slate-50 dark:bg-slate-900" : ""}
                                 `}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`text-sm font-medium ${active ? "text-blue-700 dark:text-blue-400" : isInactive ? "text-slate-500 line-through" : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100"}`}>
                                {i.nombre}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono">
                                  {i.codigo}
                                </span>
                                {isInactive && <span className="text-[9px] text-slate-400">(Inactivo)</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-sm font-semibold tabular-nums ${active ? "text-blue-700" : "text-slate-600"}`}>
                                {formatCurrency(i.cantidad ?? 0)}
                              </span>
                              <p className="text-[10px] text-slate-400 font-normal">{i.unidad_medida}</p>
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Panel Derecho: Formulario */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 p-5 flex flex-col justify-between h-[420px]">
              <div>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                  Detalle del Movimiento
                </h3>

                {!selected ? (
                  <div className="py-10 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
                    <span className="text-3xl opacity-20">👈</span>
                    Selecciona un insumo de la lista para continuar.
                  </div>
                ) : (
                  <div className="space-y-4 animate-fadeIn">
                    {/* Insumo seleccionado preview */}
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${isEntrada ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"}`}>
                        {isEntrada ? "⬇" : "⬆"}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Insumo seleccionado</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{selected.nombre}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase">Tercero</label>
                        <select
                          name="tercero_id"
                          value={form.tercero_id}
                          onChange={onFormChange}
                          className="w-full bg-white dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow shadow-sm dark:text-slate-200"
                          required
                        >
                          <option value="">Selecciona...</option>
                          {tercerosOptions.map((t) => (
                            <option key={t.id} value={t.id}>{t.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase">Bodega</label>
                        <select
                          name="bodega_id"
                          value={form.bodega_id}
                          onChange={onFormChange}
                          className="w-full bg-white dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow shadow-sm dark:text-slate-200"
                          required
                        >
                          <option value="">Selecciona...</option>
                          {bodegasOptions.map((b) => (
                            <option key={b.id} value={b.id}>{b.nombre}</option>
                          ))}
                        </select>
                        {/* Dynamic Stock Display for Salida */}
                        {!isEntrada && stockInSelectedBodega !== null && (
                          <div className="absolute right-0 top-0 -mt-5 bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded border border-blue-100 font-semibold shadow-sm">
                            Stock: {formatCurrency(stockInSelectedBodega)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase">Cantidad</label>
                        <CurrencyInput
                          name="cantidad"
                          value={form.cantidad}
                          onChange={onFormChange}
                          className="w-full bg-white rounded-md border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                          placeholder="0.000"
                        />
                      </div>
                    </div>

                    {/* Campos opcionales */}
                    <div className="grid grid-cols-1 gap-3">
                      {isEntrada && (
                        <input
                          name="factura"
                          value={form.factura}
                          onChange={onFormChange}
                          className="w-full bg-white rounded-md border border-slate-300 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                          placeholder="Factura (Opcional)"
                        />
                      )}
                      <input
                        name="observacion"
                        value={form.observacion}
                        onChange={onFormChange}
                        className="w-full bg-white rounded-md border border-slate-300 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                        placeholder="Observación (Opcional)"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer botones formulario */}
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !selected}
                  className={`px-6 py-2 rounded-lg text-white text-xs font-bold shadow-lg shadow-blue-900/10 transform active:scale-95 transition-all
                          ${loading || !selected
                      ? "bg-slate-300 cursor-not-allowed shadow-none"
                      : isEntrada
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                        : "bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500"
                    }
                      `}
                >
                  {loading ? "Guardando..." : isEntrada ? "Registrar Entrada" : "Registrar Salida"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function getStockActual(insumo) {
  const v = insumo?.cantidad ?? insumo?.stock_actual;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getStockMinimo(insumo) {
  const n = Number(insumo?.stock_minimo);
  return Number.isFinite(n) ? n : 0;
}

function getInsumoPk(insumo) {
  // ✅ PK = codigo (contrato)
  return insumo?.codigo ?? null;
}



export default function InventoryPage() {
  // INSUMOS PAGINADOS
  const [insumos, setInsumos] = useState([]);
  const [insumosCount, setInsumosCount] = useState(0);
  const [insumosPage, setInsumosPage] = useState(1);
  const [insumosNext, setInsumosNext] = useState(null);
  const [insumosPrev, setInsumosPrev] = useState(null);

  // Catálogos
  const [proveedores, setProveedores] = useState([]);
  const [terceros, setTerceros] = useState([]);
  const [bodegas, setBodegas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [proveedorFiltro, setProveedorFiltro] = useState("todos");
  const [terceroFiltro, setTerceroFiltro] = useState("todos");
  const [bodegaFiltro, setBodegaFiltro] = useState("todos");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");

  // Modal crear
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    codigo: "",
    nombre: "",
    observacion: "",
    factura: "",
    referencia: "",
    unidad_medida: "",
    color: "",
    stock_actual: "",
    stock_minimo: "",
    costo_unitario: "",
    proveedor_id: "",
    tercero_id: "",
    bodega_id: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Modal eliminar
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [insumoToDelete, setInsumoToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Modal ver
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewInsumo, setViewInsumo] = useState(null);

  // Modal editar
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    codigo: "",
    nombre: "",
    observacion: "",
    factura: "",
    referencia: "",
    unidad_medida: "",
    color: "",
    stock_actual: "",
    stock_minimo: "",
    costo_unitario: "",
    proveedor_id: "",
    tercero_id: "",
    bodega_id: "",
  });
  const [editInsumoPk, setEditInsumoPk] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Modal movimiento
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState("entrada");
  const [movementSearch, setMovementSearch] = useState("");
  const [movementSelected, setMovementSelected] = useState(null);
  const [movementForm, setMovementForm] = useState({
    tercero_id: "",
    bodega_id: "",
    cantidad: "",
    costo_unitario: "",
    factura: "",
    observacion: "",
  });
  const [movementError, setMovementError] = useState("");
  const [movementLoading, setMovementLoading] = useState(false);

  /* State para búsqueda asíncrona en el modal de movimientos */
  const [movementSearchResults, setMovementSearchResults] = useState([]);
  const [isMovementSearching, setIsMovementSearching] = useState(false);
  const [movementStockData, setMovementStockData] = useState({}); // { bodega_id: quantity }


  // Efecto para buscar insumos cuando cambia el término de búsqueda en el modal
  useEffect(() => {
    if (!isMovementOpen) {
      setMovementSearchResults([]);
      return;
    }

    const term = movementSearch.trim();
    if (!term) {
      return;
    }

    const timer = setTimeout(() => {
      setIsMovementSearching(true);
      fetch(`${API_BASE}/insumos/?search=${encodeURIComponent(term)}&page_size=50`)
        .then((res) => res.json())
        .then((data) => {
          setMovementSearchResults(asRows(data));
        })
        .catch((err) => console.error("Error search modal:", err))
        .finally(() => setIsMovementSearching(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [movementSearch, isMovementOpen]);

  // Cargar lista inicial al abrir el modal
  useEffect(() => {
    if (isMovementOpen && !movementSearch) {
      setIsMovementSearching(true);
      fetch(`${API_BASE}/insumos/?page_size=50`)
        .then((res) => res.json())
        .then((data) => {
          setMovementSearchResults(asRows(data));
        })
        .finally(() => setIsMovementSearching(false));
    }
  }, [isMovementOpen, movementSearch]);

  function getEstadoInfo(insumo) {
    const actual = getStockActual(insumo);
    const minimo = getStockMinimo(insumo);

    if (!Number.isFinite(actual) || !Number.isFinite(minimo)) {
      return { label: "—", colorClass: "text-slate-500", dotClass: "bg-slate-300" };
    }
    if (minimo > 0 && actual < minimo) {
      return { label: "Bajo mínimo", colorClass: "text-red-600", dotClass: "bg-red-500" };
    }
    return { label: "OK", colorClass: "text-emerald-600", dotClass: "bg-emerald-500" };
  }

  const proveedoresOptions = useMemo(
    () => proveedores.map((p) => ({ id: p.id, nombre: p.nombre })),
    [proveedores]
  );

  const tercerosOptions = useMemo(
    () => terceros.map((t) => ({ id: t.id, nombre: `${t.codigo} - ${t.nombre}` })),
    [terceros]
  );

  const bodegasOptions = useMemo(
    () => bodegas.map((b) => ({ id: b.id, nombre: `${b.codigo} - ${b.nombre}` })),
    [bodegas]
  );

  const loadInsumos = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const query = buildQueryParams({
          page,
          page_size: PAGE_SIZE,
          search,
          proveedor: proveedorFiltro,
          tercero: terceroFiltro,
          bodega: bodegaFiltro,
          costo_unitario_min: precioMin,
          costo_unitario_max: precioMax,
        });

        const res = await fetch(`${API_BASE}/insumos/${query}`);
        if (!res.ok) throw new Error("No se pudieron cargar los insumos.");

        const data = await res.json();

        setInsumos(asRows(data));
        setInsumosCount(Number(data?.count || 0));
        setInsumosNext(data?.next || null);
        setInsumosPrev(data?.previous || null);
        setInsumosPage(page);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error cargando inventario.");
        setInsumos([]);
        setInsumosCount(0);
      } finally {
        setLoading(false);
      }
    },
    [search, proveedorFiltro, terceroFiltro, bodegaFiltro, precioMin, precioMax]
  );

  async function loadCatalogs() {
    const [provAll, bodAll, terAll] = await Promise.all([
      fetchAllPages(`${API_BASE}/proveedores/?page_size=200`),
      fetchAllPages(`${API_BASE}/bodegas/?page_size=200`),
      fetchAllPages(`${API_BASE}/terceros/?page_size=200`),
    ]);

    setProveedores(provAll.filter((x) => x.es_activo !== false));
    setBodegas(bodAll.filter((x) => x.es_activo !== false));
    setTerceros(terAll.filter((x) => x.es_activo !== false));
  }

  // Carga inicial de catálogos
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        await loadCatalogs();
      } catch (err) {
        console.error(err);
        setError(err.message || "Error cargando catálogos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Recarga insumos cuando cambian filtros (con debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadInsumos(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [loadInsumos]);

  // ELIMINADO: const insumosFiltrados = useMemo(...)




  // ---------- Crear ----------
  function openCreateModal() {
    setCreateForm({
      codigo: "",
      nombre: "",
      observacion: "",
      factura: "",
      referencia: "",
      unidad_medida: "",
      color: "",
      stock_actual: "",
      stock_minimo: "",
      costo_unitario: "",
      proveedor_id: "",
      tercero_id: "",
      bodega_id: "",
    });

    setCreateForm((prev) => ({
      ...prev,
      proveedor_id: proveedores[0]?.id ?? "",
      tercero_id: terceros[0]?.id ?? "",
      bodega_id: bodegas[0]?.id ?? "",
    }));

    setCreateError("");
    setIsCreateOpen(true);
  }

  function closeCreateModal() {
    setIsCreateOpen(false);
  }

  function handleCreateChange(e) {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    setCreateError("");

    if (!createForm.codigo || !createForm.nombre) return setCreateError("Código y nombre son obligatorios.");
    if (!createForm.bodega_id) return setCreateError("Selecciona una bodega.");
    if (!createForm.tercero_id) return setCreateError("Selecciona un tercero.");
    if (!createForm.costo_unitario) return setCreateError("El costo unitario es obligatorio.");
    if (createForm.stock_actual === "" || createForm.stock_actual === null) {
      return setCreateError("La cantidad (stock actual) es obligatoria.");
    }

    const qty = parseFloat(String(createForm.stock_actual).replace(",", "."));
    const min = parseFloat(String(createForm.stock_minimo || 0).replace(",", "."));

    if (qty < 0) return setCreateError("La cantidad no puede ser negativa.");
    if (min < 0) return setCreateError("El stock mínimo no puede ser negativo.");

    const unit = (createForm.unidad_medida || "").toUpperCase();
    if (["UN", "UND", "UNIDAD"].includes(unit)) {
      if (qty % 1 !== 0) return setCreateError("Los insumos medidos en unidades no pueden tener decimales.");
      if (min % 1 !== 0) return setCreateError("El stock mínimo para unidades debe ser un número entero.");
    }

    try {
      setCreateLoading(true);

      const payload = {
        codigo: createForm.codigo,
        nombre: createForm.nombre,
        observacion: createForm.observacion || "",
        factura: createForm.factura || "",
        referencia: createForm.referencia?.trim() || createForm.codigo,
        bodega_id: Number(createForm.bodega_id),
        unidad_medida: createForm.unidad_medida || "",
        color: createForm.color || "",
        tercero_id: Number(createForm.tercero_id),
        cantidad: String(createForm.stock_actual),
        stock_minimo: createForm.stock_minimo === "" ? "0.000" : String(createForm.stock_minimo),
        costo_unitario: String(createForm.costo_unitario),
        proveedor_id: createForm.proveedor_id ? Number(createForm.proveedor_id) : null,
      };

      const res = await fetch(`${API_BASE}/insumos/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await safeJson(res);
        console.error("Error POST insumo:", data);

        let msg = "No se pudo crear el insumo.";
        if (data?.detail) {
          msg = data.detail;
        } else if (data && typeof data === 'object') {
          // Si el backend devuelve {"codigo": ["..."], "nombre": ["..."]}
          const parts = [];
          for (const key in data) {
            const val = data[key];
            if (Array.isArray(val)) {
              parts.push(`${val.join(" ")}`);
            } else if (typeof val === 'string') {
              parts.push(val);
            }
          }
          if (parts.length > 0) msg = parts.join(" ");
        }

        throw new Error(msg);
      }

      setIsCreateOpen(false);
      await loadInsumos(insumosPage);
    } catch (err) {
      console.error(err);
      setCreateError(err.message || "Error al crear el insumo.");
    } finally {
      setCreateLoading(false);
    }
  }

  // ---------- Eliminar / Reactivar ----------
  function openDeleteModal(insumo) {
    setInsumoToDelete(insumo);
    setDeleteError("");
    setIsDeleteOpen(true);
  }

  function closeDeleteModal() {
    if (deleteLoading) return;
    setIsDeleteOpen(false);
    setInsumoToDelete(null);
  }

  async function handleToggleActiveConfirm() {
    if (!insumoToDelete) return;

    const pk = getInsumoPk(insumoToDelete);
    if (!pk) return setDeleteError("No se encontró el código del insumo.");

    const isActive = insumoToDelete.es_activo !== false;

    try {
      setDeleteLoading(true);
      setDeleteError("");

      let res;
      if (isActive) {
        // Desactivar (DELETE)
        res = await fetch(`${API_BASE}/insumos/${pk}/`, { method: "DELETE" });
      } else {
        // Reactivar (PATCH)
        res = await fetch(`${API_BASE}/insumos/${pk}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ es_activo: true }),
        });
      }

      if (!res.ok && res.status !== 204) throw new Error(`No se pudo ${isActive ? "eliminar" : "reactivar"} el insumo.`);

      closeDeleteModal();

      // Recarga inteligente
      await loadInsumos(insumosPage);

      // Ajuste de conteo algo naive pero funcional
      // Si reactivamos, el conteo sube si mostramos activos? 
      // Si mostramos todo, no cambia. Si ocultamos inactivos, cambia.
      // Por simplicidad recargamos y ya.
    } catch (err) {
      console.error(err);
      setDeleteError(err.message || `Error al ${isActive ? "eliminar" : "reactivar"} el insumo.`);
    } finally {
      setDeleteLoading(false);
    }
  }

  // ---------- Ver ----------
  function handleView(insumo) {
    setViewInsumo(insumo);
    setIsViewOpen(true);
  }

  function closeViewModal() {
    setIsViewOpen(false);
    setViewInsumo(null);
  }

  // ---------- Editar ----------
  function handleEdit(insumo) {
    const pk = getInsumoPk(insumo);
    setEditInsumoPk(pk);

    setEditForm({
      codigo: insumo.codigo ?? "",
      nombre: insumo.nombre ?? "",
      observacion: insumo.observacion ?? "",
      factura: insumo.factura ?? "",
      referencia: insumo.referencia ?? insumo.codigo ?? "",
      unidad_medida: insumo.unidad_medida ?? "",
      color: insumo.color ?? "",
      stock_actual: String(getStockActual(insumo)),
      stock_minimo: insumo.stock_minimo ?? "",
      costo_unitario: insumo.costo_unitario ?? "",
      proveedor_id: insumo.proveedor?.id ?? insumo.proveedor_id ?? "",
      tercero_id: insumo.tercero?.id ?? insumo.tercero_id ?? "",
      bodega_id: insumo.bodega?.id ?? insumo.bodega_id ?? "",
    });

    setEditError("");
    setIsEditOpen(true);
  }

  function closeEditModal() {
    if (editLoading) return;
    setIsEditOpen(false);
    setEditInsumoPk(null);
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleEditSubmit(e) {
    e.preventDefault();

    if (!editInsumoPk) return setEditError("No se encontró el código del insumo.");
    setEditError("");

    if (!editForm.codigo || !editForm.nombre) return setEditError("Código y nombre son obligatorios.");
    if (!editForm.bodega_id) return setEditError("Selecciona una bodega.");
    if (!editForm.tercero_id) return setEditError("Selecciona un tercero.");
    if (!editForm.costo_unitario) return setEditError("El costo unitario es obligatorio.");
    if (editForm.stock_actual === "" || editForm.stock_actual === null) return setEditError("La cantidad es obligatoria.");

    const qty = parseFloat(String(editForm.stock_actual).replace(",", "."));
    const min = parseFloat(String(editForm.stock_minimo || 0).replace(",", "."));

    if (qty < 0) return setEditError("La cantidad no puede ser negativa.");
    if (min < 0) return setEditError("El stock mínimo no puede ser negativo.");

    const unit = (editForm.unidad_medida || "").toUpperCase();
    if (["UN", "UND", "UNIDAD"].includes(unit)) {
      if (qty % 1 !== 0) return setEditError("Los insumos medidos en unidades no pueden tener decimales.");
      if (min % 1 !== 0) return setEditError("El stock mínimo para unidades debe ser un número entero.");
    }

    try {
      setEditLoading(true);

      // ✅ PATCH (parcial) según tu contrato
      const payload = {
        codigo: String(editForm.codigo).trim(),
        nombre: String(editForm.nombre).trim(),
        observacion: editForm.observacion ? String(editForm.observacion).trim() : "",
        factura: editForm.factura ? String(editForm.factura).trim() : "",
        referencia: editForm.referencia?.trim() || editForm.codigo,
        bodega_id: Number(editForm.bodega_id),
        unidad_medida: editForm.unidad_medida || "",
        color: editForm.color || "",
        tercero_id: Number(editForm.tercero_id),
        cantidad: String(editForm.stock_actual),
        stock_minimo: editForm.stock_minimo === "" ? "0.000" : String(editForm.stock_minimo),
        costo_unitario: String(editForm.costo_unitario),
        proveedor_id: editForm.proveedor_id ? Number(editForm.proveedor_id) : null,
      };

      const res = await fetch(`${API_BASE}/insumos/${editInsumoPk}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await safeJson(res);
        throw new Error((data && (data.detail || JSON.stringify(data))) || "No se pudo actualizar el insumo.");
      }

      setIsEditOpen(false);
      setEditInsumoPk(null);
      await loadInsumos(insumosPage);
    } catch (err) {
      console.error(err);
      setEditError(err.message || "Error al actualizar el insumo.");
    } finally {
      setEditLoading(false);
    }
  }

  // ---------- Movimiento ----------
  function openMovementModal(type) {
    setMovementType(type);
    setMovementSearch("");
    setMovementSelected(null);
    setMovementStockData({});
    setMovementForm({
      tercero_id: terceros[0]?.id ?? "",
      bodega_id: bodegas[0]?.id ?? "",
      cantidad: "",
      costo_unitario: "",
      factura: "",
      observacion: "",
    });
    setMovementError("");
    setIsMovementOpen(true);
  }

  function closeMovementModal() {
    if (movementLoading) return;
    setIsMovementOpen(false);
    setMovementSelected(null);
  }

  function handleMovementFormChange(e) {
    const { name, value } = e.target;
    setMovementForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSelectInsumoForMovement(insumo) {
    setMovementSelected(insumo);
    setMovementForm((prev) => ({
      ...prev,
      bodega_id: String(insumo?.bodega?.id ?? insumo?.bodega_id ?? prev.bodega_id ?? ""),
      costo_unitario: "", // Always clear cost, we don't need it for salida either now
    }));

    // Fetch dynamic stock for this insumo
    if (insumo?.codigo) {
      fetch(`${API_BASE}/insumos/${encodeURIComponent(insumo.codigo)}/stock_por_bodega/`, {
        headers: { "Content-Type": "application/json" }
      })
        .then((res) => {
          if (!res.ok) throw new Error("Error fetching stock");
          return res.json();
        })
        .then((data) => {
          // data is [{ bodega_id, bodega_nombre, stock }]
          const map = {};
          if (Array.isArray(data)) {
            data.forEach((item) => {
              // Ensure key is string to match form.bodega_id
              if (item.bodega_id) {
                map[String(item.bodega_id)] = Number(item.stock);
              }
            });
          }
          setMovementStockData(map);
        })
        .catch((err) => console.error("Error fetching stock:", err));
    }
  }

  async function handleMovementSubmit(e) {
    e.preventDefault();
    setMovementError("");

    if (!movementSelected) return setMovementError("Selecciona un insumo.");

    const pk = getInsumoPk(movementSelected);
    if (!pk) return setMovementError("No se encontró el código del insumo.");

    if (!movementForm.tercero_id) return setMovementError("Selecciona el tercero que realiza el movimiento.");
    if (!movementForm.bodega_id) return setMovementError("Selecciona la bodega del movimiento.");

    const qty = parseFloat(String(movementForm.cantidad).replace(",", "."));
    if (Number.isNaN(qty) || qty <= 0) return setMovementError("Ingresa una cantidad válida mayor a 0.");

    const unit = (movementSelected.unidad_medida || "").toUpperCase();
    if (["UN", "UND", "UNIDAD"].includes(unit)) {
      if (qty % 1 !== 0) return setMovementError("Los insumos medidos en unidades no pueden tener decimales.");
    }

    // Validar costo solo si NO es entrada (en entrada está oculto y se usa el del insumo)
    // UPDATE: User asked to remove cost for salida too. So we skip validation for both.
    /*
    if (movementType !== "entrada") {
      const costo = parseFloat(String(movementForm.costo_unitario).replace(",", "."));
      if (Number.isNaN(costo) || costo <= 0) return setMovementError("Ingresa un costo unitario válido mayor a 0.");
    }
    */

    // validación local (UX) para evitar negativos
    if (movementType === "salida") {
      // Check against global stock handled by getStockActual, but user wants dynamic per-bodega check?
      // Let's use the dynamic stock if available for the selected bodega
      let available = getStockActual(movementSelected);

      if (movementStockData && movementForm.bodega_id) {
        const localStock = movementStockData[String(movementForm.bodega_id)];
        if (localStock !== undefined) {
          available = localStock;
        }
      }

      // const nuevoStock = Number((stockActual - qty).toFixed(3));
      if (qty > available) return setMovementError(`La salida excede el stock disponible en esta bodega (${available}).`);
    }

    try {
      setMovementLoading(true);

      // ✅ Contrato: POST /insumos/{codigo}/movimiento/
      const payload = {
        tipo: movementType === "entrada" ? "ENTRADA" : "SALIDA",
        tercero_id: Number(movementForm.tercero_id),
        cantidad: String(qty.toFixed(3)),
        costo_unitario: undefined, // Always undefined now as per request
        bodega_id: Number(movementForm.bodega_id),
        factura: movementType === "entrada" ? (movementForm.factura || "") : undefined,
        observacion: movementForm.observacion || "",
      };

      // limpia undefined para no romper validaciones del backend
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      const res = await fetch(`${API_BASE}/insumos/${encodeURIComponent(pk)}/movimiento/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await safeJson(res);
        console.error("Error POST movimiento:", data);
        // Extract specific validation error
        let errorMsg = data?.detail || "No se pudo registrar el movimiento.";
        if (data?.cantidad) { errorMsg = Array.isArray(data.cantidad) ? data.cantidad[0] : data.cantidad; }
        if (typeof data === 'string') errorMsg = data;

        throw new Error(errorMsg);
      }

      setIsMovementOpen(false);
      await loadInsumos(insumosPage);
    } catch (err) {
      console.error(err);
      setMovementError(err.message || "Error al registrar el movimiento.");
    } finally {
      setMovementLoading(false);
    }
  }

  async function goPrevPage() {
    if (!insumosPrev || loading) return;
    await loadInsumos(Math.max(1, insumosPage - 1));
  }

  async function goNextPage() {
    if (!insumosNext || loading) return;
    await loadInsumos(insumosPage + 1);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100 mb-6">Inventario de Insumos</h1>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex gap-3">
          <button
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 text-sm font-semibold shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all font-sans"
            onClick={() => openMovementModal("entrada")}
          >
            <span className="text-lg leading-none">⬇</span>
            Registrar Entrada
          </button>
          <button
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 text-sm font-semibold shadow-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-300 dark:hover:border-rose-700 transition-all"
            onClick={() => openMovementModal("salida")}
          >
            <span className="text-lg leading-none">⬆</span>
            Registrar Salida
          </button>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex items-center w-full md:w-72 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm shadow-sm">
            <span className="mr-2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              className="w-full bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
              placeholder="Buscar insumos (en esta página)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700"
            onClick={openCreateModal}
          >
            <span className="text-lg leading-none">＋</span>
            Nuevo Insumo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={bodegaFiltro}
          onChange={(e) => setBodegaFiltro(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="todos">Todas las bodegas</option>
          {bodegasOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre}
            </option>
          ))}
        </select>

        <select
          value={proveedorFiltro}
          onChange={(e) => setProveedorFiltro(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="todos">Todos los proveedores</option>
          {proveedoresOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        <select
          value={terceroFiltro}
          onChange={(e) => setTerceroFiltro(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="todos">Todos los terceros</option>
          {tercerosOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Precio</span>
          <CurrencyInput
            placeholder="Min"
            value={precioMin}
            onChange={(e) => setPrecioMin(e.target.value)}
            className="w-20 bg-transparent outline-none text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 border-r border-slate-100 dark:border-slate-800 pr-1 text-right"
          />
          <CurrencyInput
            placeholder="Max"
            value={precioMax}
            onChange={(e) => setPrecioMax(e.target.value)}
            className="w-20 bg-transparent outline-none text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 pl-1 text-right"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center ml-auto">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm">
            <span className="text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar insumo..."
              className="bg-transparent outline-none text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 w-44 lg:w-60"
            />
          </div>


        </div>
      </div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-xs text-slate-500">
          Total: <b>{insumosCount}</b> • Página <b>{insumosPage}</b>
          <span className="ml-2 text-[11px] text-slate-400">(mostrando {PAGE_SIZE} por página)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!insumosPrev || loading}
            onClick={goPrevPage}
            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-xs disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300 font-medium transition-colors"
          >
            ← Anterior
          </button>
          <button
            type="button"
            disabled={!insumosNext || loading}
            onClick={goNextPage}
            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-xs disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300 font-medium transition-colors"
          >
            Siguiente →
          </button>
        </div>
      </div>

      <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading && <div className="p-6 text-sm text-slate-600">Cargando datos...</div>}
        {error && !loading && <div className="p-6 text-sm text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Proveedor</th>
                  <th className="px-4 py-3 text-left">Bodega / Tercero</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-right">Costo U.</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {insumos.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-6 text-center text-sm text-slate-500">
                      No se encontraron insumos.
                    </td>
                  </tr>
                )}

                {insumos.map((i) => {
                  const pk = getInsumoPk(i);
                  const estado = getEstadoInfo(i);
                  const stock = getStockActual(i);
                  const isInactive = i.es_activo === false; // Handle explicitly if existing

                  return (
                    <tr
                      key={pk}
                      className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${isInactive
                        ? "bg-slate-100/60 dark:bg-slate-800/60 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        : "hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                        }`}
                    >
                      <td className="px-4 py-3 font-medium text-xs">
                        <span className={isInactive ? "text-slate-500 line-through decoration-slate-300 dark:decoration-slate-700" : "text-slate-800 dark:text-slate-200"}>
                          {pk}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className={`font-medium ${isInactive ? "text-slate-600 dark:text-slate-400" : "text-slate-800 dark:text-slate-200"}`}>{i.nombre}</p>
                        {i.referencia && i.referencia !== pk && (
                          <p className="text-[10px] text-slate-400">Ref: {i.referencia}</p>
                        )}
                        {isInactive && <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium">Inactivo</span>}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {i.proveedor?.nombre || <span className="text-slate-300 dark:text-slate-700">—</span>}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex flex-col">
                          <span>{i.bodega?.nombre || <span className="text-slate-300 dark:text-slate-700">—</span>}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {i.tercero?.nombre || <span className="text-slate-300 dark:text-slate-700">—</span>}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {isInactive ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inactivo
                          </div>
                        ) : (
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border ${estado.colorClass} border-transparent bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${estado.dotClass}`} />
                            {estado.label}
                          </div>
                        )}
                      </td>

                      <td className={`px-4 py-3 text-right font-medium tabular-nums ${isInactive ? "text-slate-500 dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}>
                        {formatCurrency(stock)}
                        <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          {i.unidad_medida || "u"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 text-xs tabular-nums">
                        {i.costo_unitario
                          ? `$${formatCurrency(i.costo_unitario)}`
                          : "—"}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleView(i)}
                            className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            title="Ver detalle"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(i)}
                            className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(i)}
                            className={`p-1.5 rounded transition-colors ${isInactive
                              ? "text-emerald-500 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                              : "text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                              }`}
                            title={isInactive ? "Reactivar" : "Desactivar"}
                          >
                            {isInactive ? <RotateCcw size={16} /> : <Trash2 size={16} />}
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

      {/* MODALES */}
      <CreateInsumoModal
        isOpen={isCreateOpen}
        onClose={closeCreateModal}
        onSubmit={handleCreateSubmit}
        loading={createLoading}
        error={createError}
        form={createForm}
        onChange={handleCreateChange}
        proveedoresOptions={proveedoresOptions}
        tercerosOptions={tercerosOptions}
        bodegasOptions={bodegasOptions}
      />

      <ViewInsumoModal isOpen={isViewOpen} insumo={viewInsumo} onClose={closeViewModal} />

      <EditInsumoModal
        isOpen={isEditOpen}
        onClose={closeEditModal}
        onSubmit={handleEditSubmit}
        loading={editLoading}
        error={editError}
        form={editForm}
        onChange={handleEditChange}
        proveedoresOptions={proveedoresOptions}
        tercerosOptions={tercerosOptions}
        bodegasOptions={bodegasOptions}
      />

      <DeleteInsumoModal
        isOpen={isDeleteOpen}
        insumo={insumoToDelete}
        onClose={closeDeleteModal}
        onConfirm={handleToggleActiveConfirm}
        loading={deleteLoading}
        error={deleteError}
      />

      <MovementModal
        isOpen={isMovementOpen}
        type={movementType}
        onClose={() => setIsMovementOpen(false)}
        loading={movementLoading}
        error={movementError}
        search={movementSearch}
        onSearchChange={setMovementSearch}
        results={movementSearchResults}
        searching={isMovementSearching}
        selected={movementSelected}
        onSelect={setMovementSelected}
        form={movementForm}
        onFormChange={handleMovementFormChange}
        tercerosOptions={tercerosOptions}
        bodegasOptions={bodegasOptions}

        stockData={movementStockData}
        onSubmit={handleMovementSubmit}
      />
    </div>
  );
}
