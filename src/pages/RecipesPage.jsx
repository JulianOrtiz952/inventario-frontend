// src/pages/RecipesPage.jsx
import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";
import { asRows, fetchAllPages } from "../utils/api";
import { Plus, Save, Play, History, Calculator, Package, Database, Info } from "lucide-react";

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
        const [pData, iData, rData, hData, bData] = await Promise.all([
          fetchAllPages(`${API_BASE}/productos/?page_size=200`),
          fetchAllPages(`${API_BASE}/insumos/?page_size=200`),
          fetchAllPages(`${API_BASE}/recetas/?page_size=200`),
          fetchAllPages(`${API_BASE}/producciones/?page_size=200`),
          fetchAllPages(`${API_BASE}/bodegas/?page_size=200`),
        ]);

        setProductos(pData.filter((x) => x.es_activo !== false));
        setInsumos(iData.filter((x) => x.es_activo !== false));
        setRecetas(rData);
        setHistorial(hData);
        setBodegas(bData.filter((x) => x.es_activo !== false));
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

    if (receta.bodega?.id) {
      setSelectedBodegaId(String(receta.bodega.id));
    }

    if (receta.producto?.id) {
      setSelectedProductId(String(receta.producto.id));
    }

    setRecipeCode((prev) => prev || receta.codigo || "");

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

    for (const item of insumosValidos) {
      const insumo = insumos.find(i => i.id === Number(item.insumoId));
      if (insumo) {
        const unit = (insumo.unidad_medida || "").toUpperCase();
        if (["UN", "UND", "UNIDAD"].includes(unit)) {
          if (Number(item.cantidad) % 1 !== 0) {
            setError(`El insumo "${insumo.nombre}" está medido en unidades y no permite decimales.`);
            return;
          }
        }
      }
    }

    if (!produceQuantity || produceQuantity <= 0) {
      setError("La cantidad a producir debe ser mayor que 0.");
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
          let msg = "Hubo un error al pasar la receta seleccionada a producción.";
          try {
            const data = await resProd.json();
            if (typeof data === "string") msg = data;
            else if (data.detail) msg = data.detail;
            else if (data.error) msg = data.error;
          } catch (e) { }
          throw new Error(msg);
        }

        setSuccess(`Se utilizó la receta ${selectedRecipe.codigo} y se produjo correctamente.`);
        return;
      }

      setSaving(true);
      const userCode = (recipeCode || "").trim();
      let codigoReceta;

      if (selectedRecipe) {
        if (userCode && userCode !== selectedRecipe.codigo) {
          codigoReceta = userCode;
        } else {
          const baseCode = selectedRecipe.codigo || producto.codigo_interno || producto.codigo || `REC-${producto.id}`;
          const ts = Date.now();
          codigoReceta = `${baseCode}-R${ts}`;
        }
      } else {
        const baseCode = userCode || producto.codigo_interno || producto.codigo || `REC-${producto.id}`;
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
        bodega_id: Number(selectedBodegaId),
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Error al crear la receta.";
        try {
          const data = await res.json();
          if (data.detail) msg = data.detail;
          else if (data.codigo) msg = `codigo: ${data.codigo.join(" ")}`;
        } catch (_) { }
        throw new Error(msg);
      }

      const recetaCreada = await res.json();
      const recetaId = recetaCreada.id;

      setProducing(true);
      const resProd = await fetch(
        `${API_BASE}/recetas/${recetaId}/producir/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cantidad: Number(produceQuantity), bodega_id: Number(selectedBodegaId), }),
        }
      );

      if (!resProd.ok) {
        let msg = "La receta se creó, pero hubo un error al pasarla a producción.";
        try {
          const data = await resProd.json();
          if (typeof data === "string") msg = data;
          else if (data.detail) msg = data.detail;
        } catch (e) { }
        throw new Error(msg);
      }

      setSuccess(`Receta ${codigoReceta} creada y producto producido correctamente.`);
      setLineItems([{ id: Date.now(), insumoId: "", cantidad: 0 }]);
      setProduceQuantity(1);
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
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 italic tracking-tight">
            Gestión <span className="text-blue-600 dark:text-blue-400 not-italic">de Recetas y Producción</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Crea recetas maestras y ejecuta órdenes de producción instantáneas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cant. Producción</span>
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <input
                type="number"
                min={1}
                value={produceQuantity}
                disabled={disabledButtons}
                onChange={(e) => setProduceQuantity(e.target.value ? Number(e.target.value) : "")}
                className="w-16 bg-transparent outline-none text-sm font-bold text-slate-900 dark:text-slate-100 text-center"
              />
            </div>
          </div>
        </div>
      </div>

      {(error || success) && (
        <div className="mb-6 space-y-2">
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 px-5 py-4 text-sm text-red-700 dark:text-red-400 flex items-center gap-3">
              <span className="shrink-0">⚠️</span>
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900/50 px-5 py-4 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-3">
              <span className="shrink-0">✅</span>
              {success}
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Configuración de Receta */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
            <div className="px-6 py-5 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Package size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">Información de la Orden</h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Define el producto y la bodega de destino.</p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Producto Objetivo</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                  >
                    <option value="">Seleccionar producto…</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo_interno || p.codigo} — {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Bodega de Producción</label>
                  <select
                    value={selectedBodegaId}
                    onChange={(e) => setSelectedBodegaId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                  >
                    <option value="">Seleccionar bodega…</option>
                    {bodegas.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.codigo} — {b.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Receta Base (Opcional)</label>
                  <select
                    value={selectedRecipeId || ""}
                    onChange={(e) => setSelectedRecipeId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                  >
                    <option value="">Sin receta base…</option>
                    {recetas.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.codigo} — {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Código de Receta</label>
                  <input
                    type="text"
                    value={recipeCode}
                    disabled={disabledButtons}
                    onChange={(e) => setRecipeCode(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm uppercase font-mono"
                    placeholder="Auto-generado si queda vacío"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Listado de Insumos */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
            <div className="px-6 py-5 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Database size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">Insumos Requeridos</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Detalla los materiales necesarios para la producción.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all active:scale-95"
                disabled={disabledButtons}
              >
                <Plus size={14} />
                Añadir Material
              </button>
            </div>

            <div className="p-6">
              {!selectedBodegaId && (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <Info size={24} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px]">
                    Selecciona una <b className="text-slate-700 dark:text-slate-300">bodega</b> para visualizar los insumos disponibles.
                  </p>
                </div>
              )}

              {selectedBodegaId && (
                <div className="space-y-4">
                  <div className="grid grid-cols-[3fr,1.5fr,auto] gap-4 px-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Insumo / Material</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Cantidad</span>
                    <span className="w-8"></span>
                  </div>

                  {lineItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-[3fr,1.5fr,auto] gap-4 items-center group">
                      <select
                        value={item.insumoId}
                        disabled={disabledButtons}
                        onChange={(e) => handleLineItemChange(item.id, "insumoId", e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      >
                        <option value="">Selecciona un insumo...</option>
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
                        onChange={(e) => handleLineItemChange(item.id, "cantidad", e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white text-right outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                        disabled={disabledButtons}
                      />

                      {index > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(item.id)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100 dark:hover:bg-red-900/40"
                          disabled={disabledButtons}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <div className="w-10"></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          {/* Dashboard de Costos */}
          <section className="bg-slate-900 dark:bg-blue-600 rounded-3xl p-8 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Calculator size={120} />
            </div>

            <div className="relative z-10 space-y-8">
              <div>
                <h3 className="text-xs font-bold text-blue-300 dark:text-blue-100 uppercase tracking-widest mb-1">Resumen Financiero</h3>
                <h2 className="text-2xl font-bold italic tracking-tighter">Liquidación <span className="text-blue-200">Estimada</span></h2>
              </div>

              <div className="space-y-6">
                <div className="flex items-end justify-between border-b border-blue-800 dark:border-blue-400 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-blue-400 dark:text-blue-200 uppercase tracking-widest block mb-1">Costo Unitario</span>
                  </div>
                  <span className="text-xl font-bold font-mono">
                    $ {subtotalMateriales.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </div>

                <div className="flex items-end justify-between border-b border-blue-800 dark:border-blue-400 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-blue-400 dark:text-blue-200 uppercase tracking-widest block mb-1">Unidades</span>
                  </div>
                  <span className="text-xl font-bold font-mono">
                    {cantidadProd} u
                  </span>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] font-bold text-emerald-400 dark:text-emerald-300 uppercase tracking-widest block mb-1">Costo Total de Orden</span>
                  <div className="text-4xl font-bold font-mono tracking-tighter text-emerald-400">
                    $ {totalMateriales.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveRecipe}
                disabled={disabledButtons}
                className="w-full py-4 rounded-2xl bg-white text-blue-900 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving || producing ? (
                  <>Procesando...</>
                ) : (
                  <>
                    <Play size={18} fill="currentColor" />
                    Iniciar Producción
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Estadísticas Rápidas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Total Insumos</span>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{totalUnidadesInsumos}</div>
              <p className="text-[9px] text-slate-500 mt-1">Materiales proyectados</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tipos de Material</span>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{lineItems.filter((i) => i.insumoId).length}</div>
              <p className="text-[9px] text-slate-500 mt-1">En lista de receta</p>
            </div>
          </div>
        </div>
      </div>

      {/* Historial (Vista Simplificada estilo Operadores) */}
      <section className="mt-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 italic tracking-tight uppercase">Historial Reciente <span className="text-blue-600 not-italic">de Producción</span></h2>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {historial.length === 0 ? (
            <div className="px-8 py-10 text-center text-sm text-slate-500 italic">
              No hay registros de producción recientes.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-8 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Fecha y Hora</th>
                  <th className="px-8 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Bodega</th>
                  <th className="px-8 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Receta Utilizada</th>
                  <th className="px-8 py-4 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Cantidad Producida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {historial.slice(0, 10).map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-8 py-4 text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {new Date(h.creado_en).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-8 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wide">
                        {h.bodega_codigo || "BOD"}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {h.receta_nombre || "Receta Maestra"}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{h.receta_codigo}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{h.cantidad.toLocaleString()} u</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
