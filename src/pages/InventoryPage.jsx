import { useEffect, useMemo, useState } from "react";
import EstadoBadge from "../components/EstadoBadge";
import ActionIconButton from "../components/ActionIconButton";
import CreateInsumoModal from "../components/CreateInsumoModal";
import EditInsumoModal from "../components/EditInsumoModal";
import ViewInsumoModal from "../components/ViewInsumoModal";
import DeleteInsumoModal from "../components/DeleteInsumoModal";
import MovementModal from "../components/MovementModal";

const API_BASE = "http://127.0.0.1:8000/api";

export default function InventoryPage() {
  const [insumos, setInsumos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bodegas, setBodegas] = useState([]);   // 👈 NUEVO
  

  const [search, setSearch] = useState("");
  const [proveedorFiltro, setProveedorFiltro] = useState("todos");

  // Modal crear
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    codigo: "",
    nombre: "",
    unidad: "",
    color: "", 
    stock_actual: "",
    stock_minimo: "",
    costo_unitario: "",
    proveedor_id: "",
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
    unidad: "",
    color: "",
    stock_actual: "",
    stock_minimo: "",
    costo_unitario: "",
    proveedor_id: "",
    bodega_id: "",
  });
  const [editInsumoId, setEditInsumoId] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Modal movimiento (entrada/salida)
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState("entrada");
  const [movementSearch, setMovementSearch] = useState("");
  const [movementSelected, setMovementSelected] = useState(null);
  const [movementQty, setMovementQty] = useState("");
  const [movementError, setMovementError] = useState("");
  const [movementLoading, setMovementLoading] = useState(false);

  // Cargar datos
  useEffect(() => {
  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [insumosRes, proveedoresRes, bodegasRes] = await Promise.all([
        fetch(`${API_BASE}/insumos/`),
        fetch(`${API_BASE}/proveedores/`),
        fetch(`${API_BASE}/bodegas/`),
      ]);

      if (!insumosRes.ok || !proveedoresRes.ok || !bodegasRes.ok) {
        throw new Error("Error al obtener datos del servidor");
      }

      const insumosData = await insumosRes.json();
      const proveedoresData = await proveedoresRes.json();
      const bodegasData = await bodegasRes.json();

      setInsumos(insumosData);
      setProveedores(proveedoresData);
      setBodegas(bodegasData);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error cargando inventario.");
    } finally {
      setLoading(false);
    }
  }

  loadData();
}, []);

  // Calcula el estado a partir del stock actual y mínimo
function getEstadoInfo(insumo) {
  const actual = Number(insumo.stock_actual);
  const minimo = Number(insumo.stock_minimo);

  if (Number.isNaN(actual) || Number.isNaN(minimo)) {
    return {
      label: "—",
      colorClass: "text-slate-500",
      dotClass: "bg-slate-300",
    };
  }

  if (actual < minimo) {
    return {
      label: "Bajo mínimo",
      colorClass: "text-red-600",
      dotClass: "bg-red-500",
    };
  }

  return {
    label: "OK",
    colorClass: "text-emerald-600",
    dotClass: "bg-emerald-500",
  };
}


  const proveedoresOptions = useMemo(
    () => proveedores.map((p) => ({ id: p.id, nombre: p.nombre })),
    [proveedores]
  );

  const bodegasOptions = useMemo(
  () => bodegas.map((b) => ({
    id: b.id,
    nombre: `${b.codigo} - ${b.nombre}`,
  })),
  [bodegas]
  );

  // Filtrado tabla principal
  const insumosFiltrados = useMemo(
    () =>
      insumos.filter((i) => {
        const coincideBusqueda =
          !search ||
          i.nombre.toLowerCase().includes(search.trim().toLowerCase());

        const coincideProveedor =
          proveedorFiltro === "todos" ||
          (i.proveedor && String(i.proveedor.id) === String(proveedorFiltro));

        return coincideBusqueda && coincideProveedor;
      }),
    [insumos, search, proveedorFiltro]
  );

  // Filtrado para el modal de movimiento
  const insumosFiltradosMovimiento = useMemo(
    () =>
      insumos.filter((i) => {
        if (!movementSearch.trim()) return true;
        const term = movementSearch.trim().toLowerCase();
        const matchesName = i.nombre.toLowerCase().includes(term);
        const matchesId = String(i.id).includes(term);
        return matchesName || matchesId;
      }),
    [insumos, movementSearch]
  );

  // ---------- Crear ----------
  function openCreateModal() {
    setCreateForm({
      codigo: "",   
      nombre: "",
      unidad: "Kg",
      color: "",
      stock_actual: "",
      stock_minimo: "",
      costo_unitario: "",
      proveedor_id: proveedores[0]?.id ?? "",
      bodega_id: bodegas[0]?.id ?? "",
    });
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

    if (!createForm.nombre || !createForm.unidad) {
      setCreateError("Nombre y unidad son obligatorios.");
      return;
    }
    if (!createForm.proveedor_id) {
      setCreateError("Selecciona un proveedor.");
      return;
    }

    if (!createForm.bodega_id) {
      setCreateError("Selecciona una bodega.");
      return;
    }

    try {
      setCreateLoading(true);

      const payload = {
        ...createForm,
        proveedor_id: Number(createForm.proveedor_id),
        bodega_id: Number(createForm.bodega_id),
      };

      const res = await fetch(`${API_BASE}/insumos/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Error POST insumo:", data);
        throw new Error("No se pudo crear el insumo.");
      }

      const newInsumo = await res.json();
      setInsumos((prev) => [...prev, newInsumo]);
      setIsCreateOpen(false);
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

    try {
      setDeleteLoading(true);
      setDeleteError("");

      const res = await fetch(`${API_BASE}/insumos/${insumoToDelete.id}/`, {
        method: "DELETE",
      });

      if (!res.ok && res.status !== 204) {
        throw new Error("No se pudo eliminar el insumo.");
      }

      setInsumos((prev) => prev.filter((i) => i.id !== insumoToDelete.id));
      closeDeleteModal();
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
    setEditInsumoId(insumo.id);
    setEditForm({
      codigo: insumo.codigo ?? "",
      nombre: insumo.nombre ?? "",
      unidad: insumo.unidad ?? "Kg",
      color: insumo.color ?? "",    
      stock_actual: insumo.stock_actual ?? "",
      stock_minimo: insumo.stock_minimo ?? "",
      costo_unitario: insumo.costo_unitario ?? "",
      proveedor_id: insumo.proveedor?.id ?? "",
      bodega_id: insumo.bodega?.id ?? "",
    });
    setEditError("");
    setIsEditOpen(true);
  }

  function closeEditModal() {
    if (editLoading) return;
    setIsEditOpen(false);
    setEditInsumoId(null);
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editInsumoId) return;

    setEditError("");

    if (!editForm.nombre || !editForm.unidad) {
      setEditError("Nombre y unidad son obligatorios.");
      return;
    }
    if (!editForm.proveedor_id) {
      setEditError("Selecciona un proveedor.");
      return;
    }
    if (!editForm.bodega_id) {
      setEditError("Selecciona una bodega.");
      return;
    }

    try {
      setEditLoading(true);

      const payload = {
        ...editForm,
        proveedor_id: Number(editForm.proveedor_id),
        bodega_id: Number(editForm.bodega_id),  
      };

      const res = await fetch(`${API_BASE}/insumos/${editInsumoId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Error PATCH insumo:", data);
        throw new Error("No se pudo actualizar el insumo.");
      }

      const updated = await res.json();

      setInsumos((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );
      setIsEditOpen(false);
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
    setMovementQty("");
    setMovementError("");
    setIsMovementOpen(true);
  }

  function closeMovementModal() {
    if (movementLoading) return;
    setIsMovementOpen(false);
    setMovementSelected(null);
  }

  async function handleMovementSubmit(e) {
    e.preventDefault();
    setMovementError("");

    if (!movementSelected) {
      setMovementError("Selecciona un insumo.");
      return;
    }
    const qty = parseFloat(movementQty);
    if (isNaN(qty) || qty <= 0) {
      setMovementError("Ingresa una cantidad válida mayor a 0.");
      return;
    }

    const stockActual = parseFloat(movementSelected.stock_actual);
    let nuevoStock =
      movementType === "entrada" ? stockActual + qty : stockActual - qty;

    if (movementType === "salida" && nuevoStock < 0) {
      setMovementError("La salida no puede dejar el stock en negativo.");
      return;
    }

    nuevoStock = Number(nuevoStock.toFixed(2));

    try {
      setMovementLoading(true);

      const res = await fetch(
        `${API_BASE}/insumos/${movementSelected.id}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stock_actual: nuevoStock }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Error PATCH movimiento:", data);
        throw new Error("No se pudo registrar el movimiento.");
      }

      const updated = await res.json();

      setInsumos((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );

      setIsMovementOpen(false);
    } catch (err) {
      console.error(err);
      setMovementError(err.message || "Error al registrar el movimiento.");
    } finally {
      setMovementLoading(false);
    }
  }

  // ---------- Render ----------
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="">
        {/* Título */}
        <h1 className="text-3xl font-semibold text-slate-900 mb-6">
          Inventario de Insumos
        </h1>

        {/* Barra superior */}
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
            {/* Buscador */}
            <div className="flex items-center w-full md:w-72 bg-white rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm">
              <span className="mr-2 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                placeholder="Buscar insumos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Botón nuevo insumo */}
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
        <div className="flex flex-col gap-3 md:flex-row md:justify-end mb-4">
          <button className="inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-white border border-slate-200 text-xs text-slate-700 shadow-sm w-full md:w-44">
            <span>Todas las categorías</span>
            <span>▾</span>
          </button>

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
        </div>

        {/* Tabla */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading && (
            <div className="p-6 text-sm text-slate-600">
              Cargando datos...
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
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-6 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Unidad</th>
                    <th className="px-4 py-3 text-left">Color</th>
                    <th className="px-4 py-3 text-left">Bodega</th>
                    <th className="px-4 py-3 text-right">Stock actual</th>
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
                      <td
                        colSpan={8}
                        className="px-6 py-6 text-center text-sm text-slate-500"
                      >
                        No hay insumos que coincidan con el filtro.
                      </td>
                    </tr>
                  )}

                  {insumosFiltrados.map((i) => (
                    <tr
                      key={i.id}
                      className="border-t border-slate-100 hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 text-sm text-slate-600">#{i.codigo}</td>
                      <td className="px-6 py-3 text-sm text-slate-800">
                        {i.nombre}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {i.unidad}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{i.color || "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                       {i.bodega?.nombre || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-700">
                        {i.stock_actual}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-700">
                        {i.stock_minimo}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-700">
                        ${i.costo_unitario}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {i.proveedor?.nombre ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {(() => {
                          const estado = getEstadoInfo(i);
                          return (
                            <span
                             className={`inline-flex items-center gap-1 ${estado.colorClass}`}
                            >
                            <span className={`w-2 h-2 rounded-full ${estado.dotClass}`} />
                              {estado.label}
                            </span>
                          );
                        })()}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <ActionIconButton
                            label="Ver"
                            onClick={() => handleView(i)}
                          >
                            👁️
                          </ActionIconButton>
                          <ActionIconButton
                            label="Editar"
                            onClick={() => handleEdit(i)}
                          >
                            ✏️
                          </ActionIconButton>
                          <ActionIconButton
                            label="Eliminar"
                            onClick={() => openDeleteModal(i)}
                          >
                            🗑️
                          </ActionIconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

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
        bodegasOptions={bodegasOptions} 
      />

      <ViewInsumoModal
        isOpen={isViewOpen}
        insumo={viewInsumo}
        onClose={closeViewModal}
      />

      <EditInsumoModal
        isOpen={isEditOpen}
        onClose={closeEditModal}
        onSubmit={handleEditSubmit}
        loading={editLoading}
        error={editError}
        form={editForm}
        onChange={handleEditChange}
        proveedoresOptions={proveedoresOptions}
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
        onSelect={setMovementSelected}
        qty={movementQty}
        onQtyChange={setMovementQty}
        onSubmit={handleMovementSubmit}
      />
    </div>
  );
}
