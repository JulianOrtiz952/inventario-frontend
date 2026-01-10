// src/pages/NewRecipePage.jsx
import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";


export default function NewRecipePage() {
  const [productos, setProductos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [selectedBodegaId, setSelectedBodegaId] = useState("");
  const insumosDeBodega = useMemo(() => {
    const bId = Number(selectedBodegaId);
    if (!bId) return [];
    return insumos.filter(
      (ins) => (ins.bodega?.id === bId || ins.bodega === bId)
    );
  }, [insumos, selectedBodegaId]);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Receta base seleccionada
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);

  // Código interno de la receta (editable)
  const [recipeCode, setRecipeCode] = useState("");

  const [lineItems, setLineItems] = useState([
    { id: Date.now(), insumoId: "", cantidad: 0 },
  ]);

  const [produceQuantity, setProduceQuantity] = useState(1);

  const [saving, setSaving] = useState(false);
  const [producing, setProducing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ---------------- CARGA DE DATOS ----------------
  useEffect(() => {
    const loadData = async () => {
      try {
        setError("");
        const [prodRes, insRes, recRes, histRes, bodRes] = await Promise.all([
          fetch(`${API_BASE}/productos/?page_size=1000`),
          fetch(`${API_BASE}/insumos/?page_size=1000`),
          fetch(`${API_BASE}/recetas/?page_size=1000`),
          fetch(`${API_BASE}/producciones/?page_size=1000`),
          fetch(`${API_BASE}/bodegas/?page_size=1000`),
        ]);

        const pData = await prodRes.json();
        const iData = await insRes.json();
        const rData = await recRes.json();
        const hData = await histRes.json();
        const bData = await bodRes.json();

        setProductos(Array.isArray(pData) ? pData : pData.results || []);
        setInsumos(Array.isArray(iData) ? iData : iData.results || []);
        setRecetas(Array.isArray(rData) ? rData : rData.results || []);
        setHistorial(Array.isArray(hData) ? hData : hData.results || []);
        setBodegas(Array.isArray(bData) ? bData : bData.results || []);
      } catch (err) {
        console.error(err);
        setError("Error cargando información inicial.");
      }
    };

    loadData();
  }, []);

  // Cuando cambia el producto seleccionado
  useEffect(() => {
    if (!selectedProductId) {
      setSelectedProduct(null);
      setRecipeCode("");
      return;
    }

    const prod = productos.find((p) => p.id === Number(selectedProductId));
    setSelectedProduct(prod || null);

    if (prod) {
      // Solo sugerimos código de receta cuando aún está vacío
      setRecipeCode((prev) => prev || prod.codigo_interno || prod.codigo || "");
    }
  }, [selectedProductId, productos]);

  // Cuando seleccionas una receta base, traemos lo que ya existe
  useEffect(() => {
    if (!selectedRecipeId) return;

    const receta = recetas.find(
      (r) => r.id === Number(selectedRecipeId)
    );
    if (!receta) return;

    // Si la receta base tiene bodega, la fijamos
    if (receta.bodega?.id) {
      setSelectedBodegaId(String(receta.bodega.id));
    }

    // 1. Producto asociado directo desde la receta
    if (receta.producto?.id) {
      setSelectedProductId(String(receta.producto.id));
    }

    // 2. Código de receta
    setRecipeCode((prev) => prev || receta.codigo || "");

    // 3. Insumos
    const nuevosItems =
      (receta.items || []).map((it) => ({
        id: Date.now() + Math.random(),
        insumoId: it.insumo?.id ?? "",
        cantidad: it.cantidad ?? 0,
      })) || [];

    setLineItems(nuevosItems);
  }, [selectedRecipeId, recetas]);

  // ---------- Helpers para comparar items ----------
  function areItemsEqual(receta, insumosValidos) {
    if (!receta || !receta.items) return false;

    const baseItems = receta.items
      .map((it) => ({
        insumoId: it.insumo?.id ?? null,
        cantidad: Number(it.cantidad) || 0,
      }))
      .filter((it) => it.insumoId !== null);

    const currentItems = insumosValidos.map((iv) => ({
      insumoId: Number(iv.insumoId),
      cantidad: Number(iv.cantidad) || 0,
    }));

    if (baseItems.length !== currentItems.length) return false;

    const sortByInsumo = (arr) =>
      [...arr].sort((a, b) => a.insumoId - b.insumoId);

    const a = sortByInsumo(baseItems);
    const b = sortByInsumo(currentItems);

    for (let i = 0; i < a.length; i++) {
      if (
        a[i].insumoId !== b[i].insumoId ||
        a[i].cantidad !== b[i].cantidad
      ) {
        return false;
      }
    }
    return true;
  }

  // ---------- Cálculo de costos ----------
  const subtotalMateriales = useMemo(() => {
    return lineItems.reduce((acc, item) => {
      const insumo = insumos.find((i) => i.id === Number(item.insumoId));
      if (!insumo) return acc;

      const cantidad = Number(item.cantidad) || 0;
      const costoUnitario = Number(insumo.costo_unitario) || 0;

      return acc + cantidad * costoUnitario;
    }, 0);
  }, [lineItems, insumos]);

  const totalMateriales = useMemo(() => {
    const q = Number(produceQuantity) || 0;
    return subtotalMateriales * q;
  }, [subtotalMateriales, produceQuantity]);

  const totalUnidadesInsumos = useMemo(() => {
    const base = lineItems.reduce(
      (acc, item) => acc + (Number(item.cantidad) || 0),
      0
    );
    const q = Number(produceQuantity) || 0;
    return base * q;
  }, [lineItems, produceQuantity]);

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), insumoId: "", cantidad: 0 },
    ]);
  };

  const handleRemoveLineItem = (id) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleLineItemChange = (id, field, value) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // --------------- GUARDAR RECETA + PRODUCIR ---------------
  const handleSaveRecipe = async () => {
    setError("");
    setSuccess("");

    if (!selectedProductId) {
      setError("Debes seleccionar un producto.");
      return;
    }

    const producto = productos.find(
      (p) => p.id === Number(selectedProductId)
    );

    if (!producto) {
      setError("El producto seleccionado no es válido.");
      return;
    }

    const insumosValidos = lineItems.filter(
      (item) => item.insumoId && Number(item.cantidad) > 0
    );
    if (insumosValidos.length === 0) {
      setError("Agrega al menos un insumo con cantidad mayor a 0.");
      return;
    }

    if (!produceQuantity || produceQuantity <= 0) {
      setError("La cantidad a producir debe ser mayor que 0.");
      return;
    }

    if (!selectedProductId) {
      setError("Debes seleccionar un producto.");
      return;
    }

    if (!selectedBodegaId) {
      setError("Debes seleccionar una bodega.");
      return;
    }

    const selectedRecipe = selectedRecipeId
      ? recetas.find((r) => r.id === Number(selectedRecipeId))
      : null;

    const itemsIguales = selectedRecipe
      ? areItemsEqual(selectedRecipe, insumosValidos)
      : false;

    try {
      // ---------- CASO 1: usar receta existente sin modificar ----------
      if (selectedRecipe && itemsIguales) {
        setProducing(true);

        const resProd = await fetch(
          `${API_BASE}/recetas/${selectedRecipe.id}/producir/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ cantidad: Number(produceQuantity), bodega_id: Number(selectedBodegaId), }),
          }
        );

        if (!resProd.ok) {
          let msg =
            "Hubo un error al pasar la receta seleccionada a producción.";
          try {
            const data = await resProd.json();
            console.error("Error al producir:", data);
            if (typeof data === "string") msg = data;
            else if (data.detail) msg = data.detail;
            else if (data.error) msg = data.error;
          } catch (e) {
            console.error("No se pudo parsear el error de producción:", e);
          }
          throw new Error(msg);
        }

        setSuccess(
          `Se utilizó la receta ${selectedRecipe.codigo} y se produjo correctamente.`
        );
        return;
      }

      // ---------- CASO 2: crear NUEVA receta (porque no hay base o se modificó) ----------
      setSaving(true);

      const userCode = (recipeCode || "").trim();

      let codigoReceta;

      if (selectedRecipe) {
        // Venimos de una receta base, pero con cambios en insumos:
        // - Si el usuario escribió un código diferente al original → se respeta.
        // - Si dejó el mismo código o vacío → generamos uno nuevo automáticamente.
        if (userCode && userCode !== selectedRecipe.codigo) {
          codigoReceta = userCode;
        } else {
          const baseCode =
            selectedRecipe.codigo ||
            producto.codigo_interno ||
            producto.codigo ||
            `REC-${producto.id}`;
          const ts = Date.now();
          codigoReceta = `${baseCode}-R${ts}`;
        }
      } else {
        // No hay receta base, es una receta nueva desde cero
        const baseCode =
          userCode ||
          producto.codigo_interno ||
          producto.codigo ||
          `REC-${producto.id}`;
        if (userCode) {
          codigoReceta = baseCode;
        } else {
          const ts = Date.now();
          codigoReceta = `${baseCode}-R${ts}`;
        }
      }

      const nombreReceta = producto.nombre || "Receta sin nombre";

      const payload = {
        codigo: codigoReceta,
        nombre: nombreReceta,
        producto_id: Number(selectedProductId),
        bodega_id: Number(selectedBodegaId),   // 👈 AQUÍ ESTABA FALTANDO
        // Atributos asociados no se envían: ya están en producto
        items: insumosValidos.map((item) => {
          const insumoData = insumos.find(
            (i) => i.id === Number(item.insumoId)
          );
          return {
            insumo_id: Number(item.insumoId),
            cantidad: Number(item.cantidad),
            unidad: insumoData?.unidad || "UND",
          };
        }),
      };

      const res = await fetch(`${API_BASE}/recetas/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Error al crear la receta.";
        try {
          const data = await res.json();
          console.error("Error creando receta:", data);
          if (data.detail) msg = data.detail;
          else if (data.codigo) msg = `codigo: ${data.codigo.join(" ")}`;
          else if (data.nombre) msg = `nombre: ${data.nombre.join(" ")}`;
          else if (data.items) msg = `items: ${data.items.join(" ")}`;
        } catch (_) { }
        throw new Error(msg);
      }

      const recetaCreada = await res.json();
      const recetaId = recetaCreada.id;

      // Producir con la receta recién creada
      setProducing(true);

      const resProd = await fetch(
        `${API_BASE}/recetas/${recetaId}/producir/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cantidad: Number(produceQuantity), bodega_id: Number(selectedBodegaId), }),
        }
      );

      if (!resProd.ok) {
        let msg =
          "La receta se creó, pero hubo un error al pasarla a producción.";
        try {
          const data = await resProd.json();
          console.error("Error al producir:", data);
          if (typeof data === "string") msg = data;
          else if (data.detail) msg = data.detail;
          else if (data.error) msg = data.error;
        } catch (e) {
          console.error("No se pudo parsear el error de producción:", e);
        }
        throw new Error(msg);
      }

      setSuccess(
        `Receta ${codigoReceta} creada y producto producido correctamente.`
      );

      // Reset suave de insumos y cantidad
      setLineItems([{ id: Date.now(), insumoId: "", cantidad: 0 }]);
      setProduceQuantity(1);
      // Dejamos recipeCode (por si quiere seguir usando ese patrón)
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar la receta.");
    } finally {
      setSaving(false);
      setProducing(false);
    }
  };

  const disabledButtons = saving || producing;
  const cantidadProd = Number(produceQuantity) || 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 lg:p-8 bg-slate-50 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Nueva Receta / Producción
            </h1>
            <p className="text-sm text-slate-500">
              Crea o reutiliza recetas para tus productos. Si usas una receta
              existente sin modificar insumos, se producirá con el mismo
              código. Si cambias insumos, se generará una nueva receta.
            </p>
          </div>

          {(error || success) && (
            <div className="space-y-2">
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">
                  {success}
                </div>
              )}
            </div>
          )}

          {/* Información básica */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-slate-900">
                  Información Básica
                </h2>
                <p className="text-xs text-slate-500">
                  Selecciona el producto, una receta base (opcional) y la
                  cantidad a producir.
                </p>
              </div>

              {/* Cantidad a producir alineada a la derecha */}
              <div className="flex flex-col items-end gap-1">
                <span className="text-[11px] font-medium text-slate-600">
                  Cantidad a producir
                </span>
                <input
                  type="number"
                  min={1}
                  value={produceQuantity}
                  disabled={disabledButtons}
                  onChange={(e) =>
                    setProduceQuantity(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className="w-24 px-3 py-1.5 text-xs border rounded-md border-slate-300 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 text-right"
                />
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="grid md:grid-cols-[2fr,1fr] gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-700 mb-1">
                    Producto (buscar por código o nombre)
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar producto…</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo_interno} — {p.nombre}
                      </option>
                    ))}
                  </select>
                  {selectedProduct && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Producto seleccionado:{" "}
                      <span className="font-medium">
                        {selectedProduct.codigo_interno} —{" "}
                        {selectedProduct.nombre}
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-700 mb-1">
                    Código interno de la receta
                  </label>
                  <input
                    type="text"
                    value={recipeCode}
                    disabled={disabledButtons}
                    onChange={(e) => setRecipeCode(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                    placeholder="Si lo dejas vacío, se genera automáticamente"
                  />
                </div>
              </div>

              {/* Selector de receta base */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-700 mb-1">
                    Usar receta base (opcional)
                  </label>
                  <select
                    value={selectedRecipeId || ""}
                    onChange={(e) =>
                      setSelectedRecipeId(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sin receta base…</option>
                    {recetas.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.codigo} — {r.nombre}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Al seleccionar una receta, se traen sus insumos. Si no los
                    modificas, se producirá con el mismo código.
                  </p>
                </div>
                {/* 👇 NUEVO BLOQUE: BODEGA */}
                <div className="grid md:grid-cols-2 gap-4 mt-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700 mb-1">
                      Bodega
                    </label>
                    <select
                      value={selectedBodegaId}
                      onChange={(e) => setSelectedBodegaId(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar bodega…</option>
                      {bodegas.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.codigo} — {b.nombre}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500">
                      La receta y la producción quedarán asociadas a esta bodega.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Insumos requeridos + resumen */}
          <section className="grid lg:grid-cols-[3fr,1.2fr] gap-4 items-start">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Insumos Requeridos
                </h2>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={disabledButtons}
                >
                  <span>＋</span>
                  Agregar Insumo
                </button>
              </div>

              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-[2fr,1fr,auto] gap-3 text-[11px] font-semibold text-slate-500 pb-1 border-b border-slate-100">
                  <span>Insumo</span>
                  <span>Cantidad</span>
                </div>

                {lineItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[2fr,1fr,auto] gap-3 items-center"
                  >
                    <select
                      value={item.insumoId}
                      disabled={!selectedBodegaId || disabledButtons}
                      onChange={(e) =>
                        handleLineItemChange(item.id, "insumoId", e.target.value)
                      }
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                    >
                      <option value="">
                        {selectedBodegaId
                          ? "Selecciona un insumo..."
                          : "Selecciona primero una bodega"}
                      </option>
                      {insumosDeBodega.map((ins) => (
                        <option key={ins.id} value={ins.id}>
                          {ins.nombre} ({ins.codigo})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.cantidad}
                      onChange={(e) =>
                        handleLineItemChange(
                          item.id,
                          "cantidad",
                          e.target.value
                        )
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-xs text-right focus:ring-blue-500 focus:border-blue-500"
                      disabled={disabledButtons}
                    />

                    <div className="flex justify-center">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(item.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                          disabled={disabledButtons}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">
                  Resumen de Costos
                </h2>
              </div>
              <div className="px-5 py-4 space-y-3 text-sm">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal materiales (por 1 unidad):</span>
                  <span>
                    $
                    {subtotalMateriales.toLocaleString("es-CO", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-slate-600">
                  <span>Cantidad a producir:</span>
                  <span>{cantidadProd}</span>
                </div>

                <div className="flex justify-between text-xs text-slate-700 font-semibold border-t border-slate-100 pt-2">
                  <span>Costo total materiales (x cantidad):</span>
                  <span>
                    $
                    {totalMateriales.toLocaleString("es-CO", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-slate-600">
                  <span>Unidades totales de insumos:</span>
                  <span>{totalUnidadesInsumos}</span>
                </div>

                <div className="flex justify-between text-xs text-slate-600">
                  <span>Número de tipos de insumos:</span>
                  <span>{lineItems.filter((i) => i.insumoId).length}</span>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveRecipe}
                    disabled={disabledButtons}
                    className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving || producing
                      ? "Guardando / produciendo…"
                      : "Guardar / producir"}
                  </button>
                </div>
              </div>
            </div>
          </section>
          {/* Historial de productos creados */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 mb-10">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-indigo-500 text-lg">🕒</span>
                <h2 className="text-sm font-semibold text-slate-900">
                  Historial de productos creados
                </h2>
              </div>
            </div>

            {historial.length === 0 ? (
              <div className="px-6 py-6 text-xs text-slate-500">
                Aún no se han registrado producciones.
              </div>
            ) : (
              <div className="px-4 py-4 overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 border border-slate-100">
                    <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Bodega</th>  {/* 👈 nuevo */}
                      <th className="px-3 py-2 text-left">Receta</th>
                      <th className="px-3 py-2 text-right">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h) => (
                      <tr
                        key={h.id}
                        className="border-b border-slate-100 hover:bg-slate-50/80"
                      >
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {new Date(h.creado_en).toLocaleString()}
                        </td>
                        {/* 👇 NUEVO: Bodega */}
                        <td className="px-3 py-2 text-xs text-slate-700">
                          {h.bodega_codigo
                            ? `${h.bodega_codigo} — ${h.bodega_nombre}`
                            : h.bodega_nombre || "Sin bodega"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-800">
                              {h.receta_codigo
                                ? `${h.receta_codigo} — ${h.receta_nombre}`
                                : h.receta_nombre}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-slate-700">
                          {h.cantidad.toLocaleString()} u
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
