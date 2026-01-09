import { useEffect, useMemo, useState } from "react";
import ProductDetailsModal from "./ProductDetailsModal";
import { API_BASE } from "../config/api";


import CurrencyInput from "./CurrencyInput";
import { formatCurrency, parseCurrency } from "../utils/format";


const DIAN_UOM = [
  "UN", "H87", "KGM", "GRM", "MTR", "CMT", "MMT", "MTK", "MTQ", "LTR", "MLT", "BX", "PK", "ROL",
];

function asRows(data) {
  return Array.isArray(data)
    ? data
    : Array.isArray(data?.results)
      ? data.results
      : [];
}

async function safeJson(res) {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

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

// ===============================
// Modal crear impuesto (reuso)
// ===============================
function CreateImpuestoModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({ nombre: "", codigo: "", valor: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setForm({ nombre: "", codigo: "", valor: "" });
    setError("");
  }, [isOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.nombre.trim() || !form.codigo.trim() || form.valor === "") {
      setError("Nombre, código y valor son obligatorios.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/impuestos/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          codigo: form.codigo.trim(),
          valor: moneyStr(form.valor),
        }),
      });

      if (!res.ok) {
        const data = await safeJson(res);
        throw new Error(data?.detail || JSON.stringify(data) || "No se pudo crear el impuesto.");
      }

      const created = await res.json();
      onCreated?.(created);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error creando impuesto.");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Crear impuesto</h2>
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
              placeholder="Ej: IVA"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Código</label>
            <input
              value={form.codigo}
              onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: IVA19"
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

  useEffect(() => {
    if (!isOpen || !sku) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setSaving(false);
        setError("");
        setForm(null);
        setOriginal(null);
        setShowResult(false);
        setResultProduct(null);

        const [resProd, resT, resImp] = await Promise.all([
          fetch(`${API_BASE}/productos/${encodeURIComponent(sku)}/`),
          fetch(`${API_BASE}/terceros/`),
          fetch(`${API_BASE}/impuestos/`),
        ]);

        if (!resProd.ok) {
          const data = await safeJson(resProd);
          throw new Error(data?.detail || "No se pudo cargar el producto.");
        }

        const data = await resProd.json();
        if (cancelled) return;

        if (resT.ok) {
          const tData = await resT.json();
          if (!cancelled) setTercerosOptions(asRows(tData));
        }

        if (resImp.ok) {
          const impData = await resImp.json();
          setImpuestos(asRows(impData));
        }

        setOriginal(data);

        setForm({
          codigo_sku: data.codigo_sku,
          nombre: data.nombre || "",
          codigo_barras: data.codigo_barras || "",
          unidad_medida: data.unidad_medida || "UN",
          tercero_id: data.tercero?.id ? String(data.tercero.id) : "",
          impuesto_ids: Array.isArray(data.impuestos) ? data.impuestos.map((i) => i.id) : [],
          precios: Array.isArray(data.precios) ? data.precios.map((p) => ({ ...p })) : [],
          // Nota: a veces el backend no manda "id" aquí. Por eso existe el UPSERT.
          datos_adicionales: data.datos_adicionales ? { ...data.datos_adicionales } : null,
        });
      } catch (e) {
        if (cancelled) return;
        setError(e.message || "Error cargando producto.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [isOpen, sku]);

  const canRenderForm = !!form && !!original;

  const impuestosResumen = useMemo(() => {
    if (!original?.impuestos?.length) return "—";
    return original.impuestos.map((i) => `${i.codigo} (${i.valor}%)`).join(", ");
  }, [original]);

  const bd = useMemo(() => original?.price_breakdown || null, [original]);

  // ===== Impuestos =====
  const impuestosOptions = useMemo(() => {
    return (impuestos || []).map((i) => ({
      id: i.id,
      label: `${i.codigo} - ${i.nombre} (${formatCurrency(i.valor)}%)`,
    }));
  }, [impuestos]);

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
    const resImp = await fetch(`${API_BASE}/impuestos/`);
    if (!resImp.ok) return;
    const impData = await resImp.json();
    setImpuestos(Array.isArray(impData) ? impData : []);

    if (selectId) {
      setForm((prev) => ({
        ...prev,
        impuesto_ids: prev.impuesto_ids.includes(selectId)
          ? prev.impuesto_ids
          : [...prev.impuesto_ids, selectId],
      }));
    }
  };

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
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-5xl max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Editar producto</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                SKU: <b>{sku}</b> • Impuestos actuales: {impuestosResumen}
              </p>
            </div>

            <button className="text-slate-400 hover:text-slate-600" onClick={onClose} disabled={saving}>
              ✕
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                {error}
              </div>
            )}

            {!canRenderForm ? (
              <div className="text-sm text-slate-500">
                {loading ? "Cargando producto..." : "No se pudo cargar el formulario."}
              </div>
            ) : (
              <>
                {/* RESUMEN IVA */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-700 mb-3">Resumen de precios (IVA)</p>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] text-slate-500">Precio base</p>
                      <p className="text-sm font-semibold text-slate-900">{fmtMoney(bd?.precio_base)}</p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] text-slate-500">Total descuentos</p>
                      <p className="text-sm font-semibold text-orange-700">
                        {bd?.total_descuentos ? `-${fmtMoney(bd.total_descuentos)}` : "—"}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] text-slate-500">IVA</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {bd?.valor_iva ? fmtMoney(bd.valor_iva) : "—"}{" "}
                        <span className="text-[11px] text-slate-400">
                          {bd?.porcentaje_impuestos ? `(${fmtPct(bd.porcentaje_impuestos)})` : ""}
                        </span>
                      </p>
                    </div>

                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <p className="text-[11px] text-emerald-700">Total con IVA</p>
                      <p className="text-sm font-bold text-emerald-800">{fmtMoney(bd?.total)}</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSave} className="space-y-5">
                  {/* Básico */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-medium text-slate-700">Nombre</label>
                      <input
                        value={form.nombre}
                        onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700">Unidad de medida</label>
                      <select
                        value={form.unidad_medida}
                        onChange={(e) => setForm((p) => ({ ...p, unidad_medida: e.target.value }))}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {DIAN_UOM.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-medium text-slate-700">Código de barras (opcional)</label>
                      <input
                        value={form.codigo_barras}
                        onChange={(e) => setForm((p) => ({ ...p, codigo_barras: e.target.value }))}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Tercero */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Tercero</label>
                    <select
                      value={form.tercero_id}
                      onChange={(e) => setForm((p) => ({ ...p, tercero_id: e.target.value }))}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-700">Impuestos</h3>
                      <button
                        type="button"
                        onClick={() => setIsImpuestoModalOpen(true)}
                        className="px-3 py-2 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
                      >
                        + Crear impuesto
                      </button>
                    </div>

                    <div className="p-4">
                      {impuestosOptions.length === 0 ? (
                        <div className="text-xs text-slate-500">No hay impuestos registrados.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {impuestosOptions.map((imp) => {
                            const checked = form.impuesto_ids.includes(imp.id);
                            return (
                              <label
                                key={imp.id}
                                className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <input type="checkbox" checked={checked} onChange={() => toggleImpuesto(imp.id)} />
                                <span>{imp.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      <p className="mt-3 text-[11px] text-slate-400">
                        Puedes dejarlo vacío (equivale a <b>sin impuestos</b>).
                      </p>
                    </div>
                  </div>

                  {/* Precios */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-700">Precios</h3>
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
                        <div className="text-xs text-slate-500">No hay precios. Agrega uno.</div>
                      )}

                      {form.precios.map((p, i) => (
                        <div key={p.id ?? i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                          <div className="md:col-span-5 space-y-1">
                            <label className="text-[11px] text-slate-500">Nombre</label>
                            <input
                              value={p.nombre || ""}
                              onChange={(e) => updatePrecio(i, { nombre: e.target.value })}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Ej: Precio base"
                            />
                          </div>

                          <div className="md:col-span-4 space-y-1">
                            <label className="text-[11px] text-slate-500">Valor</label>
                            <CurrencyInput
                              value={p.valor ?? ""}
                              onChange={(e) => updatePrecio(i, { valor: e.target.value })}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Ej: 60.000"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="flex items-center gap-2 text-xs text-slate-700">
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
                              className="px-3 py-2 rounded-md text-xs font-medium text-red-600 hover:bg-red-50"
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
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-700">Datos adicionales</h3>

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
                        <div className="text-xs text-slate-500">No hay datos adicionales.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Referencia</label>
                            <input
                              value={form.datos_adicionales.referencia || ""}
                              onChange={(e) => updateDA({ referencia: e.target.value })}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Unidad</label>
                            <select
                              value={form.datos_adicionales.unidad || form.unidad_medida || "UN"}
                              onChange={(e) => updateDA({ unidad: e.target.value })}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              {DIAN_UOM.map((u) => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Stock</label>
                            <input
                              type="number"
                              step="0.01"
                              value={form.datos_adicionales.stock ?? "0"}
                              onChange={(e) => updateDA({ stock: e.target.value })}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Stock mínimo</label>
                            <input
                              type="number"
                              step="0.01"
                              value={form.datos_adicionales.stock_minimo ?? "0"}
                              onChange={(e) => updateDA({ stock_minimo: e.target.value })}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div className="space-y-1 md:col-span-3">
                            <label className="text-xs font-medium text-slate-700">Descripción</label>
                            <input
                              value={form.datos_adicionales.descripcion || ""}
                              onChange={(e) => updateDA({ descripcion: e.target.value })}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Marca</label>
                            <input
                              value={form.datos_adicionales.marca || ""}
                              onChange={(e) => updateDA({ marca: e.target.value })}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Modelo</label>
                            <input
                              value={form.datos_adicionales.modelo || ""}
                              onChange={(e) => updateDA({ modelo: e.target.value })}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Código arancelario</label>
                            <input
                              value={form.datos_adicionales.codigo_arancelario || ""}
                              onChange={(e) => updateDA({ codigo_arancelario: e.target.value })}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="px-3 py-2 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 disabled:opacity-70"
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

      <CreateImpuestoModal
        isOpen={isImpuestoModalOpen}
        onClose={() => setIsImpuestoModalOpen(false)}
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
