import { useEffect, useMemo, useState } from "react";
import ProductDetailsModal from "./ProductDetailsModal";
import { API_BASE } from "../config/api";
import CurrencyInput from "./CurrencyInput";
import { formatCurrency, parseCurrency } from "../utils/format";
import { asRows, safeJson, fetchAllPages } from "../utils/api";


const DIAN_UOM = [
  "UN", "H87", "KGM", "GRM", "MTR", "CMT", "MMT", "MTK", "MTQ", "LTR", "MLT", "BX", "PK", "ROL",
];


function fmtMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  if (!Number.isFinite(n)) return "—";
  return `$${formatCurrency(n)}`;
}
function fmtPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${formatCurrency(n)}%`;
}

function moneyStr(v) {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  if (!s) return "";
  if (!s) return "";
  return parseCurrency(s); // Limpia formato visual
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-md border border-white/10 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{isEdit ? "Editar impuesto" : "Crear impuesto"}</h2>
          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" onClick={onClose} disabled={saving}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Nombre</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="Ej: IVA 19%"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Valor (%)</label>
            <CurrencyInput
              value={form.valor}
              onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="Ej: 19.00"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3 py-2 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-70 transition-all active:scale-95"
            >
              {saving ? (isEdit ? "Guardando..." : "Guardando...") : (isEdit ? "Guardar" : "Guardar")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===============================
// Datos adicionales UPSERT (FIX)
// ===============================
async function getDAIdBySku(sku) {
  const res = await fetch(`${API_BASE}/producto-datos-adicionales/`);
  if (!res.ok) return null;

  const data = await res.json();
  const rows = asRows(data); // ✅ soporta {results: []} o []

  const found = rows.find((x) => x?.producto === sku || x?.producto_id === sku);
  return found?.id ?? null;
}

async function upsertDatosAdicionales({ sku, payload, existingId }) {
  // 1) Si ya tengo id => PATCH
  if (existingId) {
    const r = await fetch(`${API_BASE}/producto-datos-adicionales/${existingId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const d = await safeJson(r);
      throw new Error(d?.detail || JSON.stringify(d) || "No se pudieron actualizar datos adicionales.");
    }
    return;
  }

  // 2) Intento POST (serializer exige "producto")
  const r1 = await fetch(`${API_BASE}/producto-datos-adicionales/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, producto: sku }),
  });

  if (r1.ok) return;

  const d1 = await safeJson(r1);
  const raw = JSON.stringify(d1 || {}).toLowerCase();
  const alreadyExists = raw.includes("already exists");

  // 3) Si ya existe, busco el id real y PATCH
  if (r1.status === 400 && alreadyExists) {
    const realId = await getDAIdBySku(sku);
    if (!realId) {
      throw new Error("Los datos adicionales ya existen, pero no pude obtener su id para actualizar.");
    }

    const r2 = await fetch(`${API_BASE}/producto-datos-adicionales/${realId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r2.ok) {
      const d2 = await safeJson(r2);
      throw new Error(d2?.detail || JSON.stringify(d2) || "No se pudieron actualizar datos adicionales.");
    }
    return;
  }

  throw new Error(d1?.detail || JSON.stringify(d1) || "No se pudieron guardar datos adicionales.");
}

// ===============================
// EditProductModal (COMPLETO)
// ===============================
export default function EditProductModal({ isOpen, onClose, sku, onUpdated }) {
  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showResult, setShowResult] = useState(false);
  const [resultProduct, setResultProduct] = useState(null);

  const [tercerosOptions, setTercerosOptions] = useState([]);
  const [impuestos, setImpuestos] = useState([]);
  const [isImpuestoModalOpen, setIsImpuestoModalOpen] = useState(false);
  const [editingImpuesto, setEditingImpuesto] = useState(null);
  const [showInactiveTaxes, setShowInactiveTaxes] = useState(false);

  useEffect(() => {
    if (!isOpen || !sku) return;

    async function load() {
      try {
        setLoading(true);
        setError("");
        setForm(null);
        setOriginal(null);
        setShowResult(false);
        setResultProduct(null);

        const [prodFull, terAll, impAll] = await Promise.all([
          fetch(`${API_BASE}/productos/${encodeURIComponent(sku)}/`),
          fetchAllPages(`${API_BASE}/terceros/?page_size=200`),
          fetchAllPages(`${API_BASE}/impuestos/?page_size=200`),
        ]);

        if (!prodFull.ok) throw new Error("No se pudo cargar el producto.");
        const pData = await prodFull.json();

        setOriginal(pData);
        setTercerosOptions(terAll);
        setImpuestos(asRows(impAll));

        setForm({
          codigo_sku: pData.codigo_sku,
          nombre: pData.nombre || "",
          codigo_barras: pData.codigo_barras || "",
          unidad_medida: pData.unidad_medida || "",
          tercero_id: pData.tercero?.id || "",
          impuesto_ids: (pData.impuestos || []).map((i) => i.id),
          precios: (pData.precios || []).length
            ? pData.precios.map((p) => ({
              id: p.id,
              nombre: p.nombre,
              valor: formatCurrency(p.valor),
              es_descuento: p.es_descuento,
            }))
            : [{ nombre: "", valor: "", es_descuento: false }],
          datos_adicionales: pData.datos_adicionales || {
            referencia: "",
            unidad: "",
            stock: "0",
            stock_minimo: "0",
            descripcion: "",
            marca: "",
            modelo: "",
            codigo_arancelario: "",
          },
        });
      } catch (err) {
        console.error(err);
        setError(err.message || "Error cargando producto.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, sku]);

  const canRenderForm = !!form && !!original;

  const impuestosResumen = useMemo(() => {
    if (!original?.impuestos?.length) return "—";
    return original.impuestos.map((i) => `${i.nombre} (${i.valor}%)`).join(", ");
  }, [original]);

  const bd = useMemo(() => original?.price_breakdown || null, [original]);

  // ===== Impuestos =====
  const impuestosOptions = useMemo(() => {
    return (impuestos || [])
      .filter((i) => showInactiveTaxes || i.es_activo !== false)
      .map((i) => ({
        id: i.id,
        label: `${i.nombre} (${formatCurrency(i.valor)}%)`,
        es_activo: i.es_activo !== false,
        original: i,
      }));
  }, [impuestos, showInactiveTaxes]);

  const toggleImpuesto = (id) => {
    setForm((prev) => {
      const exists = prev.impuesto_ids.includes(id);
      return {
        ...prev,
        impuesto_ids: exists ? prev.impuesto_ids.filter((x) => x !== id) : [...prev.impuesto_ids, id],
      };
    });
  };

  const refreshImpuestos = async (selectId = null) => {
    try {
      const impData = await fetchAllPages(`${API_BASE}/impuestos/?page_size=200`);
      setImpuestos(asRows(impData));

      if (selectId) {
        setForm((prev) => ({
          ...prev,
          impuesto_ids: prev.impuesto_ids.includes(selectId)
            ? prev.impuesto_ids
            : [...prev.impuesto_ids, selectId],
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  // ===== Precios =====
  const updatePrecio = (idx, patch) => {
    setForm((prev) => {
      const precios = prev.precios.map((p, i) => (i === idx ? { ...p, ...patch } : p));
      return { ...prev, precios };
    });
  };
  const addPrecio = () => {
    setForm((prev) => ({
      ...prev,
      precios: [...prev.precios, { nombre: "", valor: "", es_descuento: false }],
    }));
  };
  const removePrecio = (idx) => {
    setForm((prev) => ({
      ...prev,
      precios: prev.precios.filter((_, i) => i !== idx),
    }));
  };

  // ===== Datos adicionales =====
  const ensureDA = () => {
    setForm((prev) => ({
      ...prev,
      datos_adicionales: prev.datos_adicionales || {
        referencia: "",
        unidad: prev.unidad_medida || "UN",
        stock: "0",
        stock_minimo: "0",
        descripcion: "",
        marca: "",
        modelo: "",
        codigo_arancelario: "",
      },
    }));
  };

  const removeDA = () => {
    setForm((prev) => ({ ...prev, datos_adicionales: null }));
  };

  const updateDA = (patch) => {
    setForm((prev) => ({
      ...prev,
      datos_adicionales: { ...(prev.datos_adicionales || {}), ...patch },
    }));
  };

  const hasDAContent = (da) => {
    if (!da) return false;
    return (
      (da.referencia || "").trim() ||
      (da.descripcion || "").trim() ||
      (da.marca || "").trim() ||
      (da.modelo || "").trim() ||
      (da.codigo_arancelario || "").trim() ||
      String(da.stock ?? "").trim() !== "" ||
      String(da.stock_minimo ?? "").trim() !== ""
    );
  };

  // ===== Save =====
  async function handleSave(e) {
    e?.preventDefault?.();
    if (!canRenderForm) return;

    try {
      setSaving(true);
      setError("");

      if (!form.nombre.trim()) {
        setError("El nombre es obligatorio.");
        return;
      }
      if (!form.unidad_medida) {
        setError("La unidad de medida es obligatoria.");
        return;
      }

      const da = form.datos_adicionales || {};
      const stockVal = parseFloat(String(da.stock || 0).replace(",", "."));
      const stockMinVal = parseFloat(String(da.stock_minimo || 0).replace(",", "."));

      if (stockVal < 0) {
        setError("El stock no puede ser negativo.");
        return;
      }
      if (stockMinVal < 0) {
        setError("El stock mínimo no puede ser negativo.");
        return;
      }

      const unit = (form.unidad_medida || da.unidad || "").toUpperCase();
      if (["UN", "UND", "UNIDAD"].includes(unit)) {
        if (stockVal % 1 !== 0) {
          setError("El stock para unidades debe ser un número entero.");
          return;
        }
        if (stockMinVal % 1 !== 0) {
          setError("El stock mínimo para unidades debe ser un número entero.");
          return;
        }
      }

      // 1) PATCH producto
      const resProd = await fetch(`${API_BASE}/productos/${encodeURIComponent(sku)}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          codigo_barras: form.codigo_barras?.trim() ? form.codigo_barras.trim() : null,
          unidad_medida: form.unidad_medida,
          tercero_id: form.tercero_id ? Number(form.tercero_id) : null,
          impuesto_ids: Array.isArray(form.impuesto_ids) ? form.impuesto_ids : [],
        }),
      });

      if (!resProd.ok) {
        const data = await safeJson(resProd);
        throw new Error(data?.detail || JSON.stringify(data) || "No se pudo actualizar el producto.");
      }

      // 2) Sync precios
      const preciosOriginales = Array.isArray(original.precios) ? original.precios : [];
      const preciosForm = Array.isArray(form.precios) ? form.precios : [];

      // Update / Create
      for (const p of preciosForm) {
        const payload = {
          nombre: (p.nombre || "").trim(),
          valor: p.valor,
          es_descuento: !!p.es_descuento,
        };
        if (!payload.nombre) continue;

        if (p.id) {
          const r = await fetch(`${API_BASE}/producto-precios/${p.id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!r.ok) {
            const data = await safeJson(r);
            throw new Error(data?.detail || "No se pudo actualizar un precio.");
          }
        } else {
          const r = await fetch(`${API_BASE}/producto-precios/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, producto: sku }),
          });
          if (!r.ok) {
            const data = await safeJson(r);
            throw new Error(data?.detail || "No se pudo crear un precio.");
          }
        }
      }

      // Delete removidos
      for (const po of preciosOriginales) {
        const sigue = preciosForm.some((x) => x.id === po.id);
        if (!sigue) {
          const r = await fetch(`${API_BASE}/producto-precios/${po.id}/`, { method: "DELETE" });
          if (!r.ok && r.status !== 204) throw new Error("No se pudo eliminar un precio.");
        }
      }

      // 3) Sync datos adicionales (UPSERT real)
      const daOriginal = original.datos_adicionales || null;
      const daForm = form.datos_adicionales;

      const wantsDA = hasDAContent(daForm);

      if (wantsDA) {
        const payload = {
          referencia: (daForm?.referencia || "").trim() || null,
          unidad: daForm?.unidad || form.unidad_medida || "UN",
          stock: daForm?.stock === "" ? "0" : String(daForm?.stock ?? "0"),
          stock_minimo: daForm?.stock_minimo === "" ? "0" : String(daForm?.stock_minimo ?? "0"),
          descripcion: (daForm?.descripcion || "").trim() || null,
          marca: (daForm?.marca || "").trim() || null,
          modelo: (daForm?.modelo || "").trim() || null,
          codigo_arancelario: (daForm?.codigo_arancelario || "").trim() || null,
        };

        await upsertDatosAdicionales({
          sku,
          payload,
          existingId: daOriginal?.id ?? null, // si viene id, PATCH; si no, POST y maneja "already exists"
        });
      } else {
        // si el usuario eliminó/limpió y existía => delete
        if (daOriginal?.id) {
          const r = await fetch(`${API_BASE}/producto-datos-adicionales/${daOriginal.id}/`, {
            method: "DELETE",
          });
          if (!r.ok && r.status !== 204) {
            throw new Error("No se pudieron eliminar los datos adicionales.");
          }
        }
      }

      // 4) GET completo
      const resFull = await fetch(`${API_BASE}/productos/${encodeURIComponent(sku)}/`);
      if (!resFull.ok) throw new Error("Se guardó, pero no se pudo recargar el producto.");
      const full = await resFull.json();

      setResultProduct(full);
      setShowResult(true);

      setOriginal(full);
      onUpdated?.(full);
    } catch (e) {
      console.error(e);
      setError(e.message || "Error guardando cambios.");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-5xl max-h-[92vh] overflow-y-auto border border-white/10 dark:border-slate-800">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Editar producto</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                SKU: <b className="text-slate-700 dark:text-slate-300">{sku}</b>
              </p>
            </div>

            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" onClick={onClose} disabled={saving}>
              ✕
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-xs text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {!canRenderForm ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {loading ? "Cargando producto..." : "No se pudo cargar el formulario."}
              </div>
            ) : (
              <>
                {/* RESUMEN IVA */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Resumen de precios</p>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Precio base</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fmtMoney(bd?.precio_base)}</p>
                    </div>

                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Total descuentos</p>
                      <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                        {bd?.total_descuentos ? `-${fmtMoney(bd.total_descuentos)}` : "—"}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">IVA</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {bd?.valor_iva ? fmtMoney(bd.valor_iva) : "—"}{" "}
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {bd?.porcentaje_impuestos ? `(${fmtPct(bd.porcentaje_impuestos)})` : ""}
                        </span>
                      </p>
                    </div>

                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2">
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Total con IVA</p>
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{fmtMoney(bd?.total)}</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSave} className="space-y-5">
                  {/* Básico */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Nombre</label>
                      <input
                        value={form.nombre}
                        onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Unidad de medida</label>
                      <select
                        value={form.unidad_medida}
                        onChange={(e) => setForm((p) => ({ ...p, unidad_medida: e.target.value }))}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        required
                      >
                        {DIAN_UOM.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Código de barras (opcional)</label>
                      <input
                        value={form.codigo_barras}
                        onChange={(e) => setForm((p) => ({ ...p, codigo_barras: e.target.value }))}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {/* Tercero */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Tercero</label>
                    <select
                      value={form.tercero_id}
                      onChange={(e) => setForm((p) => ({ ...p, tercero_id: e.target.value }))}
                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">— Sin tercero —</option>
                      {tercerosOptions.map((t) => (
                        <option key={t.id} value={String(t.id)}>
                          {t.nombre}{t.codigo ? ` (${t.codigo})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Impuestos */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Impuestos</h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowInactiveTaxes(!showInactiveTaxes)}
                          className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors ${showInactiveTaxes ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                        >
                          {showInactiveTaxes ? "Ocultar inactivos" : "Mostrar inactivos"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingImpuesto(null);
                            setIsImpuestoModalOpen(true);
                          }}
                          className="px-3 py-2 rounded-md bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                        >
                          + Crear impuesto
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      {impuestosOptions.length === 0 ? (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {showInactiveTaxes ? "No hay impuestos registrados." : "No hay impuestos activos."}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {impuestosOptions.map((imp) => {
                            const checked = form.impuesto_ids.includes(imp.id);
                            return (
                              <div
                                key={imp.id}
                                className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${!imp.es_activo ? "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"}`}
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
                                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                                    title="Editar"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleImpuestoActive(imp)}
                                    className={`p-1.5 rounded-md transition-colors ${imp.es_activo ? "text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"}`}
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

                      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                        Puedes dejarlo vacío si el producto no aplica impuestos.
                      </p>
                    </div>
                  </div>

                  {/* Precios */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Precios</h3>
                      <button
                        type="button"
                        onClick={addPrecio}
                        className="px-3 py-2 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                      >
                        + Agregar
                      </button>
                    </div>

                    <div className="p-4 space-y-3">
                      {form.precios.length === 0 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">No hay precios. Agrega uno.</div>
                      )}

                      {form.precios.map((p, i) => (
                        <div key={p.id ?? i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                          <div className="md:col-span-5 space-y-1">
                            <label className="text-[11px] text-slate-500 dark:text-slate-400">Nombre</label>
                            <input
                              value={p.nombre || ""}
                              onChange={(e) => updatePrecio(i, { nombre: e.target.value })}
                              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                              placeholder="Ej: Precio base"
                            />
                          </div>

                          <div className="md:col-span-4 space-y-1">
                            <label className="text-[11px] text-slate-500 dark:text-slate-400">Valor</label>
                            <CurrencyInput
                              value={p.valor ?? ""}
                              onChange={(e) => updatePrecio(i, { valor: e.target.value })}
                              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                              placeholder="Ej: 60.000"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={!!p.es_descuento}
                                onChange={(e) => updatePrecio(i, { es_descuento: e.target.checked })}
                              />
                              Es descuento
                            </label>
                          </div>

                          <div className="md:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => removePrecio(i)}
                              className="px-3 py-2 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Eliminar"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Datos adicionales */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Datos adicionales</h3>

                      {form.datos_adicionales ? (
                        <button
                          type="button"
                          onClick={removeDA}
                          className="px-3 py-2 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700"
                        >
                          Eliminar datos adicionales
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={ensureDA}
                          className="px-3 py-2 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
                        >
                          + Agregar datos adicionales
                        </button>
                      )}
                    </div>

                    <div className="p-4">
                      {!form.datos_adicionales ? (
                        <div className="text-xs text-slate-500 dark:text-slate-400">No hay datos adicionales.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Referencia</label>
                            <input
                              value={form.datos_adicionales.referencia || ""}
                              onChange={(e) => updateDA({ referencia: e.target.value })}
                              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Unidad</label>
                            <select
                              value={form.datos_adicionales.unidad || form.unidad_medida || "UN"}
                              onChange={(e) => updateDA({ unidad: e.target.value })}
                              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            >
                              {DIAN_UOM.map((u) => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Stock</label>
                            <input
                              type="number"
                              step="0.01"
                              value={form.datos_adicionales.stock ?? "0"}
                              onChange={(e) => updateDA({ stock: e.target.value })}
                              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Stock mínimo</label>
                            <input
                              type="number"
                              step="0.01"
                              value={form.datos_adicionales.stock_minimo ?? "0"}
                              onChange={(e) => updateDA({ stock_minimo: e.target.value })}
                              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                          </div>

                          <div className="space-y-1 md:col-span-3">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Descripción</label>
                            <input
                              value={form.datos_adicionales.descripcion || ""}
                              onChange={(e) => updateDA({ descripcion: e.target.value })}
                              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Marca</label>
                            <input
                              value={form.datos_adicionales.marca || ""}
                              onChange={(e) => updateDA({ marca: e.target.value })}
                              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Modelo</label>
                            <input
                              value={form.datos_adicionales.modelo || ""}
                              onChange={(e) => updateDA({ modelo: e.target.value })}
                              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Código arancelario</label>
                            <input
                              value={form.datos_adicionales.codigo_arancelario || ""}
                              onChange={(e) => updateDA({ codigo_arancelario: e.target.value })}
                              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={saving}
                      className="px-3 py-2 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 disabled:opacity-70 transition-all active:scale-95"
                    >
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
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

      <ProductDetailsModal
        isOpen={showResult}
        product={resultProduct}
        title="Producto actualizado ✅"
        onClose={() => {
          setShowResult(false);
          setResultProduct(null);
          onClose();
        }}
      />
    </>
  );
}
