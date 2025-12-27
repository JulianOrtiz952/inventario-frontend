import { useEffect, useMemo, useState } from "react";
import ActionIconButton from "../components/ActionIconButton";
import CreateInsumoModal from "../components/CreateInsumoModal";
import EditInsumoModal from "../components/EditInsumoModal";
import ViewInsumoModal from "../components/ViewInsumoModal";
import DeleteInsumoModal from "../components/DeleteInsumoModal";
import { API_BASE } from "../config/api";

const PAGE_SIZE = 30;

function asRows(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}

async function safeJson(res) {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

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
  insumos,
  selected,
  onSelect,
  form,
  onFormChange,
  tercerosOptions,
  bodegasOptions,
  onSubmit,
}) {
  if (!isOpen) return null;

  const isEntrada = type === "entrada";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {isEntrada ? "Registrar entrada" : "Registrar salida"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Selecciona el insumo y registra el movimiento con el tercero responsable.
            </p>
          </div>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose} disabled={loading}>
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Buscar + seleccionar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-semibold text-slate-700">Buscar insumo</p>
                <div className="mt-2 flex items-center gap-2 rounded-md bg-white border border-slate-200 px-3 py-2 text-sm">
                  <span className="text-slate-400">🔍</span>
                  <input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                    placeholder="Nombre o código..."
                  />
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {insumos.length === 0 ? (
                  <div className="px-4 py-6 text-xs text-slate-500">No hay insumos para mostrar.</div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {insumos.map((i) => {
                      const pk = i?.codigo;
                      const active = selected?.codigo === pk;
                      return (
                        <li key={String(pk)}>
                          <button
                            type="button"
                            onClick={() => onSelect(i)}
                            className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${
                              active ? "bg-blue-50" : "bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-slate-900">{i.nombre}</p>
                                <p className="text-[11px] text-slate-500">{i.codigo}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-500">Stock</p>
                                <p className="text-sm font-semibold text-slate-800 tabular-nums">
                                  {Number(i?.cantidad ?? i?.stock_actual ?? 0).toLocaleString("es-CO", {
                                    maximumFractionDigits: 3,
                                  })}
                                </p>
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Form */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-semibold text-slate-700">Detalle del movimiento</p>
              </div>

              <div className="p-4 space-y-3">
                {!selected ? (
                  <div className="text-xs text-slate-500">Selecciona un insumo para continuar.</div>
                ) : (
                  <>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] text-slate-500">Insumo</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {selected.nombre} <span className="text-slate-400 font-normal">({selected.codigo})</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Stock actual:{" "}
                        <b>
                          {Number(selected?.cantidad ?? selected?.stock_actual ?? 0).toLocaleString("es-CO", {
                            maximumFractionDigits: 3,
                          })}
                        </b>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Tercero</label>
                        <select
                          name="tercero_id"
                          value={form.tercero_id}
                          onChange={onFormChange}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Selecciona...</option>
                          {tercerosOptions.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Bodega</label>
                        <select
                          name="bodega_id"
                          value={form.bodega_id}
                          onChange={onFormChange}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Selecciona...</option>
                          {bodegasOptions.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Cantidad</label>
                        <input
                          type="number"
                          step="0.001"
                          name="cantidad"
                          value={form.cantidad}
                          onChange={onFormChange}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ej: 5.000"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Costo unitario</label>
                        <input
                          type="number"
                          step="0.01"
                          name="costo_unitario"
                          value={form.costo_unitario}
                          onChange={onFormChange}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ej: 2600.00"
                          required
                        />
                      </div>
                    </div>

                    {isEntrada && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Factura (opcional)</label>
                        <input
                          name="factura"
                          value={form.factura}
                          onChange={onFormChange}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ej: FAC-999"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700">Observación (opcional)</label>
                      <input
                        name="observacion"
                        value={form.observacion}
                        onChange={onFormChange}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={isEntrada ? "Ej: Compra adicional" : "Ej: Uso manual"}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-2 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !selected}
              className={`px-4 py-2 rounded-md text-white text-xs font-medium shadow-sm disabled:opacity-70 ${
                isEntrada ? "bg-emerald-600 hover:bg-emerald-700" : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {loading ? "Guardando..." : isEntrada ? "Registrar entrada" : "Registrar salida"}
            </button>
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

async function fetchAllPages(url, { maxPages = 20 } = {}) {
  const all = [];
  let next = url;
  let pages = 0;

  while (next && pages < maxPages) {
    // eslint-disable-next-line no-await-in-loop
    const res = await fetch(next);
    if (!res.ok) break;

    // eslint-disable-next-line no-await-in-loop
    const data = await res.json();
    const rows = asRows(data);
    all.push(...rows);

    next = data?.next || null;
    pages += 1;

    if (Array.isArray(data)) break;
  }

  return all;
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

  async function loadInsumos(page = 1) {
    const res = await fetch(`${API_BASE}/insumos/?page=${page}&page_size=${PAGE_SIZE}`);
    if (!res.ok) throw new Error("No se pudieron cargar los insumos.");

    const data = await res.json();

    setInsumos(asRows(data));
    setInsumosCount(Number(data?.count || 0));
    setInsumosNext(data?.next || null);
    setInsumosPrev(data?.previous || null);
    setInsumosPage(page);
  }

  async function loadCatalogs() {
    const [provAll, bodAll, terAll] = await Promise.all([
      fetchAllPages(`${API_BASE}/proveedores/?page_size=200`),
      fetchAllPages(`${API_BASE}/bodegas/?page_size=200`),
      fetchAllPages(`${API_BASE}/terceros/?page_size=200`),
    ]);

    setProveedores(provAll);
    setBodegas(bodAll);
    setTerceros(terAll);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        await Promise.all([loadCatalogs(), loadInsumos(1)]);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error cargando inventario.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insumosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase();

    return insumos.filter((i) => {
      const coincideBusqueda =
        !term || (i.nombre || "").toLowerCase().includes(term) || (i.codigo || "").toLowerCase().includes(term);

      const coincideProveedor =
        proveedorFiltro === "todos" || String(i.proveedor?.id ?? i.proveedor_id ?? "") === String(proveedorFiltro);

      const coincideTercero =
        terceroFiltro === "todos" || String(i.tercero?.id ?? i.tercero_id ?? "") === String(terceroFiltro);

      return coincideBusqueda && coincideProveedor && coincideTercero;
    });
  }, [insumos, search, proveedorFiltro, terceroFiltro]);

  const insumosFiltradosMovimiento = useMemo(() => {
    const term = movementSearch.trim().toLowerCase();
    if (!term) return insumos;

    return insumos.filter((i) => {
      const matchesName = (i.nombre || "").toLowerCase().includes(term);
      const matchesCodigo = String(i.codigo || "").toLowerCase().includes(term);
      return matchesName || matchesCodigo;
    });
  }, [insumos, movementSearch]);

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
        throw new Error(data?.detail || "No se pudo crear el insumo.");
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

  // ---------- Eliminar ----------
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

  async function handleDeleteConfirm() {
    if (!insumoToDelete) return;

    const pk = getInsumoPk(insumoToDelete);
    if (!pk) return setDeleteError("No se encontró el código del insumo.");

    try {
      setDeleteLoading(true);
      setDeleteError("");

      const res = await fetch(`${API_BASE}/insumos/${pk}/`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("No se pudo eliminar el insumo.");

      closeDeleteModal();

      const maybeNewCount = Math.max(0, insumosCount - 1);
      const maxPage = Math.max(1, Math.ceil(maybeNewCount / PAGE_SIZE));
      const target = Math.min(insumosPage, maxPage);
      await loadInsumos(target);
      setInsumosCount(maybeNewCount);
    } catch (err) {
      console.error(err);
      setDeleteError(err.message || "Error al eliminar el insumo.");
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
      costo_unitario: String(insumo?.costo_unitario ?? prev.costo_unitario ?? ""),
    }));
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

    const costo = parseFloat(String(movementForm.costo_unitario).replace(",", "."));
    if (Number.isNaN(costo) || costo <= 0) return setMovementError("Ingresa un costo unitario válido mayor a 0.");

    // validación local (UX) para evitar negativos
    if (movementType === "salida") {
      const stockActual = getStockActual(movementSelected);
      const nuevoStock = Number((stockActual - qty).toFixed(3));
      if (nuevoStock < 0) return setMovementError("La salida no puede dejar el stock en negativo.");
    }

    try {
      setMovementLoading(true);

      // ✅ Contrato: POST /insumos/{codigo}/movimiento/
      const payload = {
        tipo: movementType === "entrada" ? "ENTRADA" : "SALIDA",
        tercero_id: Number(movementForm.tercero_id),
        cantidad: String(qty.toFixed(3)),
        costo_unitario: moneyStr(movementForm.costo_unitario),
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
        throw new Error(data?.detail || "No se pudo registrar el movimiento.");
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
      <h1 className="text-3xl font-semibold text-slate-900 mb-6">Inventario de Insumos</h1>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex gap-3">
          <button
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium shadow-sm hover:bg-emerald-700"
            onClick={() => openMovementModal("entrada")}
          >
            <span className="text-lg leading-none">⬇</span>
            Registrar Entrada
          </button>
          <button
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-orange-500 text-white text-sm font-medium shadow-sm hover:bg-orange-600"
            onClick={() => openMovementModal("salida")}
          >
            <span className="text-lg leading-none">⬆</span>
            Registrar Salida
          </button>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex items-center w-full md:w-72 bg-white rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm">
            <span className="mr-2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
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

      <div className="flex flex-col gap-3 md:flex-row md:justify-end mb-3">
        <select
          className="px-3 py-2 rounded-md bg-white border border-slate-200 text-xs text-slate-700 shadow-sm w-full md:w-44"
          value={proveedorFiltro}
          onChange={(e) => setProveedorFiltro(e.target.value)}
        >
          <option value="todos">Todos los proveedores</option>
          {proveedoresOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        <select
          className="px-3 py-2 rounded-md bg-white border border-slate-200 text-xs text-slate-700 shadow-sm w-full md:w-44"
          value={terceroFiltro}
          onChange={(e) => setTerceroFiltro(e.target.value)}
        >
          <option value="todos">Todos los terceros</option>
          {tercerosOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
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
            className="px-3 py-1.5 rounded-md border border-slate-200 text-xs disabled:opacity-50 hover:bg-slate-50"
          >
            ← Anterior
          </button>
          <button
            type="button"
            disabled={!insumosNext || loading}
            onClick={goNextPage}
            className="px-3 py-1.5 rounded-md border border-slate-200 text-xs disabled:opacity-50 hover:bg-slate-50"
          >
            Siguiente →
          </button>
        </div>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading && <div className="p-6 text-sm text-slate-600">Cargando datos...</div>}
        {error && !loading && <div className="p-6 text-sm text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-6 py-3 text-left">Nombre</th>
                  <th className="px-6 py-3 text-left">Referencia</th>
                  <th className="px-6 py-3 text-left">Factura</th>
                  <th className="px-4 py-3 text-left">Bodega</th>
                  <th className="px-4 py-3 text-left">Tercero</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                  <th className="px-4 py-3 text-right">Stock mínimo</th>
                  <th className="px-4 py-3 text-right">Costo unitario</th>
                  <th className="px-4 py-3 text-left">Proveedor</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {insumosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-6 py-6 text-center text-sm text-slate-500">
                      No hay insumos que coincidan con el filtro (en esta página).
                    </td>
                  </tr>
                )}

                {insumosFiltrados.map((i) => {
                  const pk = getInsumoPk(i);
                  const actual = getStockActual(i);
                  const minimo = getStockMinimo(i);
                  const estado = getEstadoInfo(i);

                  return (
                    <tr key={String(pk)} className="border-t border-slate-100 hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-sm text-slate-600">{i.codigo}</td>
                      <td className="px-6 py-3 text-sm text-slate-800">{i.nombre}</td>
                      <td className="px-6 py-3 text-sm text-slate-800">{i.referencia ?? "—"}</td>
                      <td className="px-6 py-3 text-sm text-slate-800">{i.factura ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{i.bodega?.nombre || "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{i.tercero?.nombre || "—"}</td>

                      <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-700">{actual}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-700">{minimo || "—"}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-700">${i.costo_unitario}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{i.proveedor?.nombre ?? "—"}</td>

                      <td className="px-4 py-3 text-xs">
                        <span className={`inline-flex items-center gap-1 ${estado.colorClass}`}>
                          <span className={`w-2 h-2 rounded-full ${estado.dotClass}`} />
                          {estado.label}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <ActionIconButton label="Ver" onClick={() => handleView(i)}>
                            👁️
                          </ActionIconButton>
                          <ActionIconButton label="Editar" onClick={() => handleEdit(i)}>
                            ✏️
                          </ActionIconButton>
                          <ActionIconButton label="Eliminar" onClick={() => openDeleteModal(i)}>
                            🗑️
                          </ActionIconButton>
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
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
        error={deleteError}
      />

      <MovementModal
        isOpen={isMovementOpen}
        type={movementType}
        onClose={closeMovementModal}
        loading={movementLoading}
        error={movementError}
        search={movementSearch}
        onSearchChange={setMovementSearch}
        insumos={insumosFiltradosMovimiento}
        selected={movementSelected}
        onSelect={handleSelectInsumoForMovement}
        form={movementForm}
        onFormChange={handleMovementFormChange}
        tercerosOptions={tercerosOptions}
        bodegasOptions={bodegasOptions}
        onSubmit={handleMovementSubmit}
      />
    </div>
  );
}
