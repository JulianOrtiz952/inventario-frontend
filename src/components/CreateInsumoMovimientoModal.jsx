import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";

const TIPOS = [
  { value: "ENTRADA", label: "ENTRADA (Suma stock)" },
  { value: "SALIDA", label: "SALIDA (Resta stock)" },
  // Si luego habilitas AJUSTE en backend, lo agregas aquí:
  // { value: "AJUSTE", label: "AJUSTE" },
];

export default function CreateInsumoMovimientoModal({
  isOpen,
  onClose,
  insumoOptions,
  terceroOptions,
  bodegaOptions,
  onCreated,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    insumo_codigo: "",
    tipo: "ENTRADA",
    tercero_id: "",
    cantidad: "",
    costo_unitario: "",
    bodega_id: "",
    factura: "",
    observacion: "",
  });

  const defaults = useMemo(() => {
    return {
      insumo_codigo: insumoOptions?.[0]?.codigo ?? "",
      tercero_id: terceroOptions?.[0]?.id ?? "",
      bodega_id: bodegaOptions?.[0]?.id ?? "",
    };
  }, [insumoOptions, terceroOptions, bodegaOptions]);

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setLoading(false);
    setForm((prev) => ({
      ...prev,
      insumo_codigo: defaults.insumo_codigo,
      tercero_id: defaults.tercero_id,
      bodega_id: defaults.bodega_id,
      tipo: "ENTRADA",
      cantidad: "",
      costo_unitario: "",
      factura: "",
      observacion: "",
    }));
  }, [isOpen, defaults]);

  if (!isOpen) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.insumo_codigo) return setError("Selecciona un insumo.");
    if (!form.tipo) return setError("Selecciona el tipo.");
    if (!form.tercero_id) return setError("Selecciona un tercero.");
    if (!form.bodega_id) return setError("Selecciona una bodega.");
    if (!form.cantidad) return setError("La cantidad es obligatoria.");
    if (!form.costo_unitario) return setError("El costo unitario es obligatorio.");

    try {
      setLoading(true);

      const payload = {
        tipo: form.tipo,
        tercero_id: Number(form.tercero_id),
        cantidad: String(form.cantidad),
        costo_unitario: String(form.costo_unitario),
        bodega_id: Number(form.bodega_id),
        factura: form.factura?.trim() || "",
        observacion: form.observacion?.trim() || "",
      };

      const res = await fetch(`${API_BASE}/insumos/${form.insumo_codigo}/movimiento/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Caso clave: stock insuficiente
        if (res.status === 400) {
          const msg =
            data?.cantidad ||
            data?.detail ||
            (typeof data === "object" ? JSON.stringify(data) : "Validación fallida");
          throw new Error(msg);
        }
        throw new Error("No se pudo registrar el movimiento.");
      }

      // const movimiento = await res.json(); // si lo quieres usar luego
      if (typeof onCreated === "function") await onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error registrando movimiento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Registrar movimiento</h2>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose} disabled={loading}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          {error && <div className="text-xs text-red-600">{error}</div>}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Insumo</label>
            <select
              name="insumo_codigo"
              value={form.insumo_codigo}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              {insumoOptions.map((i) => (
                <option key={i.codigo} value={i.codigo}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Tipo</label>
              <select
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Bodega</label>
              <select
                name="bodega_id"
                value={form.bodega_id}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {bodegaOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Tercero</label>
            <select
              name="tercero_id"
              value={form.tercero_id}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              {terceroOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Cantidad</label>
              <input
                type="number"
                step="0.001"
                name="cantidad"
                value={form.cantidad}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                onChange={handleChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Factura {form.tipo === "SALIDA" ? "(opcional)" : "(opcional)"}
              </label>
              <input
                type="text"
                name="factura"
                value={form.factura}
                onChange={handleChange}
                placeholder="Ej: FAC-999"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Observación</label>
              <input
                type="text"
                name="observacion"
                value={form.observacion}
                onChange={handleChange}
                placeholder="Ej: Compra adicional / Uso manual"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
              disabled={loading}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 disabled:opacity-70"
            >
              {loading ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
