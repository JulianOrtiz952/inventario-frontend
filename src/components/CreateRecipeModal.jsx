import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

export default function CreateRecipeModal({ isOpen, onClose, onCreated }) {
  // Atributos de la receta (se pueden ajustar, pero se cargan desde el producto)
  const [form, setForm] = useState({
    tela: "",
    color: "",
    talla: "",
    marca: "",
  });

  // Productos disponibles
  const [productos, setProductos] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  // Insumos disponibles
  const [insumos, setInsumos] = useState([]);
  const [items, setItems] = useState([
    { insumo_id: "", cantidad: 0, unidad: "", costo_unitario: 0 },
  ]);

  const [loadingInsumos, setLoadingInsumos] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Cuando se abre el modal, reseteamos y cargamos data
  useEffect(() => {
    if (!isOpen) return;

    setForm({
      tela: "",
      color: "",
      talla: "",
      marca: "",
    });
    setItems([
      { insumo_id: "", cantidad: 0, unidad: "", costo_unitario: 0 },
    ]);
    setSelectedProductId("");
    setProductSearch("");
    setError("");
    setSuccess("");

    async function loadData() {
      try {
        setLoadingInsumos(true);
        setLoadingProductos(true);

        const [resInsumos, resProductos] = await Promise.all([
          fetch(`${API_BASE}/insumos/`),
          fetch(`${API_BASE}/productos/`),
        ]);

        if (!resInsumos.ok) throw new Error("Error al cargar insumos.");
        if (!resProductos.ok) throw new Error("Error al cargar productos.");

        const [dataInsumos, dataProductos] = await Promise.all([
          resInsumos.json(),
          resProductos.json(),
        ]);

        setInsumos(dataInsumos);
        setProductos(dataProductos);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error cargando datos.");
      } finally {
        setLoadingInsumos(false);
        setLoadingProductos(false);
      }
    }

    loadData();
  }, [isOpen]);

  // Helper para producto seleccionado
  const selectedProduct =
    productos.find((p) => String(p.id) === String(selectedProductId)) || null;

  // Autocompletar atributos desde el producto cuando se selecciona
  useEffect(() => {
  if (!selectedProduct) return;

  // Siempre que cambies de producto, se actualizan los atributos
  setForm({
    tela: selectedProduct.tela || "",
    color: selectedProduct.color || "",
    talla: selectedProduct.talla || "",
    marca: selectedProduct.marca || "",
  });
}, [selectedProduct]);

  // Filtro de productos por código / nombre
  const productosFiltrados = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter((p) => {
      const codigo = (p.codigo || "").toLowerCase();
      const nombre = (p.nombre || "").toLowerCase();
      return codigo.includes(term) || nombre.includes(term);
    });
  }, [productos, productSearch]);

  // Cambio de atributos
  function handleAttrChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Manejo de filas de insumos
  function handleItemChange(index, field, value) {
    setItems((prev) => {
      const cloned = [...prev];
      const row = { ...cloned[index] };

      if (field === "insumo_id") {
        row.insumo_id = value;
        const selected = insumos.find((i) => String(i.id) === String(value));
        if (selected) {
          row.unidad = selected.unidad || "";
          row.costo_unitario = Number(selected.costo_unitario || 0);
        } else {
          row.unidad = "";
          row.costo_unitario = 0;
        }
      } else if (field === "cantidad") {
        row.cantidad = Number(value || 0);
      } else if (field === "unidad") {
        row.unidad = value;
      } else if (field === "costo_unitario") {
        row.costo_unitario = Number(value || 0);
      }

      cloned[index] = row;
      return cloned;
    });
  }

  function addItemRow() {
    setItems((prev) => [
      ...prev,
      { insumo_id: "", cantidad: 0, unidad: "", costo_unitario: 0 },
    ]);
  }

  function removeItemRow(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  // Resumen de costos
  const resumen = useMemo(() => {
    let subtotal = 0;
    let count = 0;

    items.forEach((item) => {
      if (!item.insumo_id) return;
      count += 1;
      subtotal += Number(item.cantidad || 0) * Number(item.costo_unitario || 0);
    });

    return {
      subtotal,
      count,
      total: subtotal,
    };
  }, [items]);

  // Guardar receta
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedProduct) {
      setError("Debes seleccionar un producto para asociar la receta.");
      return;
    }

    const itemsValidos = items.filter((i) => i.insumo_id && i.cantidad > 0);
    if (itemsValidos.length === 0) {
      setError("Debes agregar al menos un insumo con cantidad mayor a 0.");
      return;
    }

    // Armamos payload usando la info del producto
    const payload = {
      // Campos de la receta que espera el backend
      codigo: selectedProduct.codigo, // puedes cambiarlo si tu modelo lo maneja distinto
      nombre: selectedProduct.nombre,
      descripcion: selectedProduct.descripcion || "",
      // Atributos (se pueden haber ajustado en el formulario)
      tela: form.tela || selectedProduct.tela || "",
      color: form.color || selectedProduct.color || "",
      talla: form.talla || selectedProduct.talla || "",
      marca: form.marca || selectedProduct.marca || "",
      // Si en el backend ya agregaste producto_id en RecetaSerializer:
      // producto_id: selectedProduct.id,
      items: itemsValidos.map((i) => ({
        insumo_id: i.insumo_id,
        cantidad: i.cantidad,
        unidad: i.unidad,
        costo_unitario: i.costo_unitario,
      })),
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/recetas/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Error creando receta:", data);
        throw new Error("No se pudo guardar la receta.");
      }

      const created = await res.json();
      if (onCreated) onCreated(created);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar la receta.");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        {/* Header modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-slate-900">
            Nueva Receta para producto
          </h1>
          <div className="flex gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="recipe-modal-form"
              disabled={saving}
              className="px-5 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 disabled:opacity-70"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>

        <form
          id="recipe-modal-form"
          onSubmit={handleSubmit}
          className="px-6 py-4 space-y-6"
        >
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* INFORMACIÓN BÁSICA: ahora solo selección de producto + código */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="text-blue-500 text-lg">ℹ</span>
              <h2 className="text-sm font-semibold text-slate-900">
                Información Básica
              </h2>
            </div>

            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Selector de producto */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-700">
                  Producto (buscar por código o nombre)
                </label>

                <div className="flex items-center bg-white rounded-md border border-slate-200 px-3 py-2 text-sm mb-2">
                  <span className="mr-2 text-slate-400 text-sm">🔍</span>
                  <input
                    type="text"
                    className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                    placeholder="Ej: PROD-001 o Camisa básica"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>

                <div className="border border-slate-200 rounded-md bg-slate-50 max-h-40 overflow-y-auto">
                  {loadingProductos && (
                    <div className="px-3 py-2 text-xs text-slate-500">
                      Cargando productos...
                    </div>
                  )}

                  {!loadingProductos && productosFiltrados.length === 0 && (
                    <div className="px-3 py-2 text-xs text-slate-500">
                      No se encontraron productos con ese filtro.
                    </div>
                  )}

                  {!loadingProductos &&
                    productosFiltrados.map((p) => {
                      const selected =
                        String(p.id) === String(selectedProductId);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedProductId(p.id)}
                          className={`w-full text-left px-3 py-2 text-xs border-b border-slate-100 last:border-b-0 transition-colors ${
                            selected
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="flex justify-between gap-2">
                            <span className="truncate">
                              {p.codigo} — {p.nombre}
                            </span>
                            {selected && <span>✓</span>}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {p.descripcion || "Sin descripción"}
                          </p>
                        </button>
                      );
                    })}
                </div>

                {selectedProduct && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Producto seleccionado:{" "}
                    <span className="font-semibold">
                      {selectedProduct.codigo} — {selectedProduct.nombre}
                    </span>
                  </p>
                )}
              </div>

              {/* Código interno (solo lectura) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Código interno
                </label>
                <input
                  type="text"
                  value={selectedProduct ? selectedProduct.codigo : ""}
                  readOnly
                  placeholder="Selecciona un producto"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-700"
                />
              </div>
            </div>
          </section>

          {/* ATRIBUTOS ASOCIADOS (pueden venir del producto pero son editables) */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="text-indigo-500 text-lg">◇</span>
              <h2 className="text-sm font-semibold text-slate-900">
                Atributos Asociados
              </h2>
            </div>

            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Tela
                </label>
                <input
                  type="text"
                  name="tela"
                  value={form.tela}
                  onChange={handleAttrChange}
                  placeholder="Seleccionar tela"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Color
                </label>
                <input
                  type="text"
                  name="color"
                  value={form.color}
                  onChange={handleAttrChange}
                  placeholder="Seleccionar color"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Talla
                </label>
                <input
                  type="text"
                  name="talla"
                  value={form.talla}
                  onChange={handleAttrChange}
                  placeholder="Seleccionar talla"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Marca
                </label>
                <input
                  type="text"
                  name="marca"
                  value={form.marca}
                  onChange={handleAttrChange}
                  placeholder="Seleccionar marca"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </section>

          {/* INSUMOS REQUERIDOS + RESUMEN (igual que antes) */}
          <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Tabla insumos */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 lg:col-span-3">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-lg">≡</span>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Insumos Requeridos
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                >
                  <span className="text-sm leading-none">＋</span>
                  Agregar Insumo
                </button>
              </div>

              <div className="px-4 py-4 overflow-x-auto">
                {loadingInsumos && (
                  <p className="text-xs text-slate-500 mb-2">
                    Cargando insumos...
                  </p>
                )}
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 border border-slate-100">
                    <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="px-3 py-2 text-left">Insumo</th>
                      <th className="px-3 py-2 text-center">Cantidad</th>
                      <th className="px-3 py-2 text-left">Unidad</th>
                      <th className="px-3 py-2 text-center">
                        Costo Unitario
                      </th>
                      <th className="px-3 py-2 text-center">Costo Total</th>
                      <th className="px-3 py-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const selected = insumos.find(
                        (i) => String(i.id) === String(item.insumo_id)
                      );
                      const costoTotal =
                        Number(item.cantidad || 0) *
                        Number(item.costo_unitario || 0);

                      return (
                        <tr
                          key={index}
                          className="border-b border-slate-100 hover:bg-slate-50/80"
                        >
                          {/* Insumo */}
                          <td className="px-3 py-2">
                            <select
                              className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={item.insumo_id}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "insumo_id",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">Seleccionar insumo</option>
                              {insumos.map((i) => (
                                <option key={i.id} value={i.id}>
                                  {i.nombre}
                                </option>
                              ))}
                            </select>
                            {selected && (
                              <p className="mt-1 text-[10px] text-slate-400">
                                Stock: {selected.stock_actual}{" "}
                                {selected.unidad} · Costo ref: $
                                {selected.costo_unitario}
                              </p>
                            )}
                          </td>

                          {/* Cantidad */}
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              step="0.001"
                              className="w-24 mx-auto rounded-md border border-slate-200 px-2 py-1 text-xs text-center outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={item.cantidad}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "cantidad",
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          {/* Unidad */}
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              className="w-20 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={item.unidad}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "unidad",
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          {/* Costo unitario */}
                          <td className="px-3 py-2 text-center">
  <input
    type="number"
    step="0.01"
    className="w-24 mx-auto rounded-md border border-slate-200 px-2 py-1 text-xs text-center bg-slate-50 text-slate-700"
    value={item.costo_unitario}
    readOnly
  />
</td>

                          {/* Costo total */}
                          <td className="px-3 py-2 text-center text-xs text-slate-700">
                            ${costoTotal.toFixed(2)}
                          </td>

                          {/* Acciones */}
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItemRow(index)}
                              className="text-xs text-red-500 hover:text-red-600"
                              disabled={items.length === 1}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-3 lg:col-span-1">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span className="text-indigo-500 text-lg">🧾</span>
                Resumen de Costos
              </h3>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal materiales:</span>
                  <span className="font-medium">
                    ${resumen.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Número de insumos:</span>
                  <span className="font-medium">{resumen.count}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 mt-2">
                <div className="flex justify-between text-sm font-semibold text-slate-900">
                  <span>Costo Total de Materiales:</span>
                  <span className="text-blue-600">
                    ${resumen.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
