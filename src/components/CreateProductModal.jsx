import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";
import CurrencyInput from "./CurrencyInput";
import { formatCurrency, parseCurrency } from "../utils/format";

/* ===================== CONFIG ===================== */


const DIAN_UOM = [
  { code: "UN", name: "Unidad" },
  { code: "H87", name: "Pieza" },
  { code: "KGM", name: "Kilogramo" },
  { code: "GRM", name: "Gramo" },
  { code: "MTR", name: "Metro" },
  { code: "CMT", name: "Centímetro" },
  { code: "MMT", name: "Milímetro" },
  { code: "MTK", name: "Metro cuadrado" },
  { code: "MTQ", name: "Metro cúbico" },
  { code: "LTR", name: "Litro" },
  { code: "MLT", name: "Mililitro" },
  { code: "BX", name: "Caja" },
  { code: "PK", name: "Paquete" },
  { code: "ROL", name: "Rollo" },
];

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

// normaliza a string decimal (para DRF DecimalField)
function moneyStr(v) {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  if (!s) return "";
  if (!s) return "";
  return parseCurrency(s); // Usamos parseCurrency para limpiar formato visual
}

async function postDA({ sku, payload }) {
  return fetch(`${API_BASE}/producto-datos-adicionales/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, producto: sku }),
  });
}

async function postDAWithProductoId({ sku, payload }) {
  return fetch(`${API_BASE}/producto-datos-adicionales/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, producto_id: sku }),
  });
}

/**
 * Fallback automático:
 * 1) intenta {producto: sku}
 * 2) si falla 400, intenta {producto_id: sku}
 */
async function postDatosAdicionalesWithFallback({ sku, payload }) {
  const r1 = await postDA({ sku, payload });
  if (r1.ok) return r1;

  const d1 = await safeJson(r1);

  // si NO es 400, no reintentes
  if (r1.status !== 400) {
    const msg = d1?.detail || JSON.stringify(d1) || "Error creando datos adicionales.";
    throw new Error(msg);
  }

  // reintenta con producto_id
  const r2 = await postDAWithProductoId({ sku, payload });
  if (r2.ok) return r2;

  const d2 = await safeJson(r2);
  const msg2 = d2?.detail || JSON.stringify(d2) || "Error creando datos adicionales.";
  throw new Error(msg2);
}

/* ===================== UI HELPERS ===================== */
function Card({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}

/* ===================== MAIN MODAL ===================== */
export default function CreateProductModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({
    codigo_sku: "",
    nombre: "",
    codigo_barras: "",
    unidad_medida: "UN",
    tercero_id: "",
    impuesto_ids: [],
    precios: [{ nombre: "Precio base", valor: "", es_descuento: false }],
    datos_adicionales: {
      referencia: "",
      unidad: "UN",
      stock: "0",
      stock_minimo: "0",
      descripcion: "",
      marca: "",
      modelo: "",
      codigo_arancelario: "",
    },
  });

  const [terceros, setTerceros] = useState([]);
  const [impuestos, setImpuestos] = useState([]);

  const [loadingDeps, setLoadingDeps] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState("");

  // modal crear/editar impuesto
  const [isImpuestoModalOpen, setIsImpuestoModalOpen] = useState(false);
  const [editingImpuesto, setEditingImpuesto] = useState(null);
  const [showInactiveTaxes, setShowInactiveTaxes] = useState(false);

  // modal guardado
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [savedProduct, setSavedProduct] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setForm({
      codigo_sku: "",
      nombre: "",
      codigo_barras: "",
      unidad_medida: "UN",
      tercero_id: "",
      impuesto_ids: [],
      precios: [{ nombre: "Precio base", valor: "", es_descuento: false }],
      datos_adicionales: {
        referencia: "",
        unidad: "UN",
        stock: "0",
        stock_minimo: "0",
        descripcion: "",
        marca: "",
        modelo: "",
        codigo_arancelario: "",
      },
    });

    setError("");
    setSavedProduct(null);
    setIsSavedOpen(false);

    const loadDeps = async () => {
      try {
        setLoadingDeps(true);

        // ✅ pedir grande (porque ahora tienes paginación)
        const qs = `?page_size=1000`;

        const [terRes, impRes] = await Promise.all([
          fetch(`${API_BASE}/terceros/${qs}`),
          fetch(`${API_BASE}/impuestos/${qs}`),
        ]);

        if (!terRes.ok) throw new Error("No se pudieron cargar terceros.");
        if (!impRes.ok) throw new Error("No se pudieron cargar impuestos.");

        const terData = await terRes.json();
        const impData = await impRes.json();

        // ✅ soporta lista o paginado
        setTerceros(asRows(terData));
        setImpuestos(asRows(impData));
      } catch (e) {
        console.error(e);
        setError(e.message || "Error cargando datos para crear producto.");
      } finally {
        setLoadingDeps(false);
      }
    };

    loadDeps();
  }, [isOpen]);

  const tercerosOptions = useMemo(
    () =>
      (terceros || []).map((t) => ({
        id: t.id,
        label: `${t.codigo ? `${t.codigo} - ` : ""}${t.nombre}`,
      })),
    [terceros]
  );

  const impuestosOptions = useMemo(
    () =>
      (impuestos || [])
        .filter((i) => showInactiveTaxes || i.es_activo !== false)
        .map((i) => ({
          id: i.id,
          label: `${i.nombre} (${formatCurrency(i.valor)}%)`,
          es_activo: i.es_activo !== false,
          original: i,
        })),
    [impuestos, showInactiveTaxes]
  );

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleImpuesto(id) {
    setForm((prev) => {
      const exists = prev.impuesto_ids.includes(id);
      return {
        ...prev,
        impuesto_ids: exists ? prev.impuesto_ids.filter((x) => x !== id) : [...prev.impuesto_ids, id],
      };
    });
  }

  function updatePrecio(idx, patch) {
    setForm((prev) => {
      const precios = prev.precios.map((p, i) => (i === idx ? { ...p, ...patch } : p));
      return { ...prev, precios };
    });
  }

  function addPrecio() {
    setForm((prev) => ({
      ...prev,
      precios: [...prev.precios, { nombre: "", valor: "", es_descuento: false }],
    }));
  }

  function removePrecio(idx) {
    setForm((prev) => ({
      ...prev,
      precios: prev.precios.filter((_, i) => i !== idx),
    }));
  }

  function updateDatos(patch) {
    setForm((prev) => ({
      ...prev,
      datos_adicionales: { ...prev.datos_adicionales, ...patch },
    }));
  }

  async function refreshImpuestos(selectId = null) {
    const impRes = await fetch(`${API_BASE}/impuestos/?page_size=1000`);
    if (!impRes.ok) return;
    const impData = await impRes.json();

    setImpuestos(asRows(impData));

    if (selectId) {
      setForm((prev) => ({
        ...prev,
        impuesto_ids: prev.impuesto_ids.includes(selectId) ? prev.impuesto_ids : [...prev.impuesto_ids, selectId],
      }));
    }
  }

  async function handleToggleImpuestoActive(imp) {
    try {
      const res = await fetch(`${API_BASE}/impuestos/${imp.id}/`, {
        method: imp.es_activo ? "DELETE" : "PATCH",
        headers: imp.es_activo ? {} : { "Content-Type": "application/json" },
        body: imp.es_activo ? null : JSON.stringify({ es_activo: true }),
      });
      if (!res.ok && res.status !== 204) throw new Error("No se pudo cambiar el estado del impuesto.");
      await refreshImpuestos();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cambiar estado del impuesto.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.codigo_sku.trim() || !form.nombre.trim()) {
      setError("El Código SKU y el Nombre son obligatorios.");
      return;
    }
    if (!form.unidad_medida) {
      setError("Selecciona una unidad de medida.");
      return;
    }

    if (!form.precios?.length) {
      setError("Debes agregar al menos un precio.");
      return;
    }

    const preciosValidos = form.precios
      .map((p) => ({
        nombre: (p.nombre || "").trim(),
        valor: moneyStr(p.valor),
        es_descuento: !!p.es_descuento,
      }))
      .filter((p) => p.nombre && p.valor !== "");

    if (preciosValidos.length === 0) {
      setError("Agrega al menos un precio con nombre y valor.");
      return;
    }

    try {
      setSavingAll(true);

      // 1) Crear producto
      const productoPayload = {
        codigo_sku: form.codigo_sku.trim(),
        nombre: form.nombre.trim(),
        unidad_medida: form.unidad_medida,
        codigo_barras: form.codigo_barras?.trim() ? form.codigo_barras.trim() : null,
        tercero_id: form.tercero_id ? Number(form.tercero_id) : null,
        impuesto_ids: Array.isArray(form.impuesto_ids) ? form.impuesto_ids : [],
      };

      const resProd = await fetch(`${API_BASE}/productos/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productoPayload),
      });

      if (!resProd.ok) {
        const data = await safeJson(resProd);
        throw new Error(data?.detail || JSON.stringify(data) || "No se pudo crear el producto.");
      }

      const createdProduct = await resProd.json();
      const sku = createdProduct?.codigo_sku || productoPayload.codigo_sku;

      // 2) Crear precios
      for (const pr of preciosValidos) {
        const resPrecio = await fetch(`${API_BASE}/producto-precios/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            producto: sku,
            nombre: pr.nombre,
            valor: pr.valor,
            es_descuento: pr.es_descuento,
          }),
        });

        if (!resPrecio.ok) {
          const data = await safeJson(resPrecio);
          throw new Error(data?.detail || JSON.stringify(data) || "Producto creado, pero falló la creación de precios.");
        }
      }

      // 3) Crear datos adicionales (si aplica)
      const da = form.datos_adicionales || {};

      const hayDatos =
        (da.referencia || "").trim() ||
        (da.descripcion || "").trim() ||
        (da.marca || "").trim() ||
        (da.modelo || "").trim() ||
        (da.codigo_arancelario || "").trim() ||
        String(da.stock ?? "").trim() !== "" ||
        String(da.stock_minimo ?? "").trim() !== "";

      if (hayDatos) {
        const payload = {
          referencia: (da.referencia || "").trim() || null,
          unidad: da.unidad || form.unidad_medida || "UN",
          stock: da.stock === "" ? "0" : String(da.stock ?? "0"),
          stock_minimo: da.stock_minimo === "" ? "0" : String(da.stock_minimo ?? "0"),
          descripcion: (da.descripcion || "").trim() || null,
          marca: (da.marca || "").trim() || null,
          modelo: (da.modelo || "").trim() || null,
          codigo_arancelario: (da.codigo_arancelario || "").trim() || null,
        };

        await postDatosAdicionalesWithFallback({ sku, payload });
      }

      // 4) traer producto completo
      const resFull = await fetch(`${API_BASE}/productos/${encodeURIComponent(sku)}/`);
      if (!resFull.ok) {
        setSavedProduct(createdProduct);
        setIsSavedOpen(true);
        onCreated?.(createdProduct);
        return;
      }

      const full = await resFull.json();
      setSavedProduct(full);
      setIsSavedOpen(true);
      onCreated?.(full);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error guardando producto.");
    } finally {
      setSavingAll(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-5xl max-h-[95vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h1 className="text-sm font-semibold text-slate-900">Nuevo producto</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingresa la información básica, precios y datos adicionales del nuevo producto.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={onClose}
                disabled={savingAll}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="product-modal-form"
                disabled={savingAll || loadingDeps}
                className="px-5 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 disabled:opacity-70"
              >
                {savingAll ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>

          <form id="product-modal-form" onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                {error}
              </div>
            )}
            {loadingDeps && <div className="text-xs text-slate-500">Cargando terceros e impuestos…</div>}

            <Card title="Básico">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Código SKU</label>
                  <input
                    value={form.codigo_sku}
                    onChange={(e) => setField("codigo_sku", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="SKU-0001"
                    required
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-slate-700">Nombre</label>
                  <input
                    value={form.nombre}
                    onChange={(e) => setField("nombre", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Camisa blanca"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Unidad de medida</label>
                  <select
                    value={form.unidad_medida}
                    onChange={(e) => setField("unidad_medida", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {DIAN_UOM.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.code} - {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-slate-700">Código de barras (opcional)</label>
                  <input
                    value={form.codigo_barras}
                    onChange={(e) => setField("codigo_barras", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="7709998887776"
                  />
                </div>

                <div className="space-y-1 md:col-span-3">
                  <label className="text-xs font-medium text-slate-700">Tercero (opcional)</label>
                  <select
                    value={form.tercero_id}
                    onChange={(e) => setField("tercero_id", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">—</option>
                    {tercerosOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            <section className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-500 text-lg">%</span>
                  <h2 className="text-sm font-semibold text-slate-900">Impuestos</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInactiveTaxes(!showInactiveTaxes)}
                    className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors ${showInactiveTaxes ? "bg-slate-100 border-slate-300 text-slate-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                  >
                    {showInactiveTaxes ? "Ocultar inactivos" : "Mostrar inactivos"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingImpuesto(null);
                      setIsImpuestoModalOpen(true);
                    }}
                    className="px-3 py-2 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
                  >
                    + Crear impuesto
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                {impuestosOptions.length === 0 ? (
                  <div className="text-xs text-slate-500">
                    {showInactiveTaxes ? "No hay impuestos registrados." : "No hay impuestos activos."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {impuestosOptions.map((imp) => {
                      const checked = form.impuesto_ids.includes(imp.id);
                      return (
                        <div
                          key={imp.id}
                          className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${!imp.es_activo ? "bg-slate-50 border-slate-100 text-slate-400" : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"}`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer flex-1 py-1">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleImpuesto(imp.id)}
                              disabled={!imp.es_activo}
                            />
                            <span className={!imp.es_activo ? "line-through opacity-70" : ""}>{imp.label}</span>
                          </label>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingImpuesto(imp.original);
                                setIsImpuestoModalOpen(true);
                              }}
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleImpuestoActive(imp)}
                              className={`p-1.5 rounded-md transition-colors ${imp.es_activo ? "text-red-400 hover:bg-red-50" : "text-emerald-500 hover:bg-emerald-50"}`}
                              title={imp.es_activo ? "Desactivar" : "Reactivar"}
                            >
                              {imp.es_activo ? "🗑️" : "🔄"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="mt-3 text-[11px] text-slate-400">
                  Puedes dejarlo vacío si el producto no aplica impuestos.
                </p>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 text-lg">$</span>
                  <h2 className="text-sm font-semibold text-slate-900">Precios</h2>
                </div>
                <button
                  type="button"
                  onClick={addPrecio}
                  className="px-3 py-2 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                >
                  + Agregar
                </button>
              </div>

              <div className="px-6 py-4 space-y-3">
                {form.precios.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                    <div className="md:col-span-5 space-y-1">
                      <label className="text-[11px] text-slate-500">Nombre</label>
                      <input
                        value={p.nombre}
                        onChange={(e) => updatePrecio(idx, { nombre: e.target.value })}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ej: Precio base"
                      />
                    </div>

                    <div className="md:col-span-4 space-y-1">
                      <label className="text-[11px] text-slate-500">Valor</label>
                      <CurrencyInput
                        value={p.valor}
                        onChange={(e) => updatePrecio(idx, { valor: e.target.value })}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="60.000"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={!!p.es_descuento}
                          onChange={(e) => updatePrecio(idx, { es_descuento: e.target.checked })}
                        />
                        Es descuento
                      </label>
                    </div>

                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removePrecio(idx)}
                        className="px-3 py-2 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        disabled={form.precios.length === 1}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}

                <p className="text-[11px] text-slate-400">
                  Define los diferentes niveles de precio o descuentos aplicables.
                </p>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <span className="text-slate-700 text-lg">🧾</span>
                <h2 className="text-sm font-semibold text-slate-900">Datos adicionales (opcional)</h2>
              </div>

              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Referencia</label>
                  <input
                    type="text"
                    value={form.datos_adicionales.referencia}
                    onChange={(e) => updateDatos({ referencia: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: CAM-BLA-ML"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Unidad</label>
                  <select
                    value={form.datos_adicionales.unidad}
                    onChange={(e) => updateDatos({ unidad: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {DIAN_UOM.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.code} - {u.name}
                      </option>
                    ))}
                  </select>
                </div>



                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Stock mínimo</label>
                  <CurrencyInput
                    value={form.datos_adicionales.stock_minimo}
                    onChange={(e) => updateDatos({ stock_minimo: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1 md:col-span-3">
                  <label className="text-xs font-medium text-slate-700">Descripción</label>
                  <input
                    type="text"
                    value={form.datos_adicionales.descripcion}
                    onChange={(e) => updateDatos({ descripcion: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Camisa blanca formal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Marca</label>
                  <input
                    type="text"
                    value={form.datos_adicionales.marca}
                    onChange={(e) => updateDatos({ marca: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Marca X"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Modelo</label>
                  <input
                    type="text"
                    value={form.datos_adicionales.modelo}
                    onChange={(e) => updateDatos({ modelo: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ML-2025"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Código arancelario</label>
                  <input
                    type="text"
                    value={form.datos_adicionales.codigo_arancelario}
                    onChange={(e) => updateDatos({ codigo_arancelario: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="6105.10.00"
                  />
                </div>

                <p className="text-[11px] text-slate-400 md:col-span-3">
                  Información complementaria para la gestión de inventario y aduanas.
                </p>
              </div>
            </section>
          </form>
        </div>
      </div>

      <ImpuestoModal
        isOpen={isImpuestoModalOpen}
        onClose={() => {
          setIsImpuestoModalOpen(false);
          setEditingImpuesto(null);
        }}
        impuesto={editingImpuesto}
        onCreated={(imp) => refreshImpuestos(imp?.id)}
      />

      <ProductSavedModal
        isOpen={isSavedOpen}
        product={savedProduct}
        onClose={() => setIsSavedOpen(false)}
        onCloseAll={onClose}
      />
    </>
  );
}

/* ===================== MODAL: CREAR/EDITAR IMPUESTO ===================== */
function ImpuestoModal({ isOpen, onClose, onCreated, impuesto = null }) {
  const [form, setForm] = useState({ nombre: "", valor: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!impuesto;

  useEffect(() => {
    if (!isOpen) return;
    if (impuesto) {
      setForm({
        nombre: impuesto.nombre || "",
        valor: formatCurrency(impuesto.valor) || "",
      });
    } else {
      setForm({ nombre: "", valor: "" });
    }
    setError("");
  }, [isOpen, impuesto]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.nombre.trim() || form.valor === "") {
      setError("Nombre y valor son obligatorios.");
      return;
    }

    try {
      setSaving(true);
      const url = isEdit ? `${API_BASE}/impuestos/${impuesto.id}/` : `${API_BASE}/impuestos/`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          valor: moneyStr(form.valor),
        }),
      });

      if (!res.ok) {
        const data = await safeJson(res);
        throw new Error(data?.detail || JSON.stringify(data) || `No se pudo ${isEdit ? "actualizar" : "crear"} el impuesto.`);
      }

      const saved = await res.json();
      onCreated?.(saved);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || `Error ${isEdit ? "actualizando" : "creando"} impuesto.`);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">{isEdit ? "Editar impuesto" : "Crear impuesto"}</h2>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose} disabled={saving}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Nombre</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: IVA 19%"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Valor (%)</label>
            <CurrencyInput
              value={form.valor}
              onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: 19.00"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3 py-2 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-70"
            >
              {saving ? "Creando..." : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===================== MODAL: PRODUCTO GUARDADO ===================== */
function Field({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900 break-words">{value}</p>
    </div>
  );
}

function ProductSavedModal({ isOpen, product, onClose, onCloseAll }) {
  if (!isOpen) return null;

  const da = product?.datos_adicionales || null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Producto creado ✅</h2>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <Card title="Resumen">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="SKU" value={product?.codigo_sku || "—"} />
              <Field label="Nombre" value={product?.nombre || "—"} />
              <Field label="Unidad" value={product?.unidad_medida || "—"} />
            </div>
          </Card>

          <Card title="Datos adicionales">
            {!da ? (
              <div className="text-xs text-slate-500">No se registraron datos adicionales.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Referencia" value={da.referencia || "—"} />
                <Field label="Unidad" value={da.unidad || "—"} />
                <Field label="Stock" value={da.stock ?? "—"} />
                <Field label="Stock mínimo" value={da.stock_minimo ?? "—"} />
                <Field label="Marca" value={da.marca || "—"} />
                <Field label="Modelo" value={da.modelo || "—"} />
                <Field label="Código arancelario" value={da.codigo_arancelario || "—"} />
                <div className="md:col-span-3">
                  <Field label="Descripción" value={da.descripcion || "—"} />
                </div>
              </div>
            )}
          </Card>

          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => {
                onClose();
                onCloseAll?.();
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
