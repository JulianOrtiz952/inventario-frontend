const UOM = [
  { code: "UN", name: "Unidad" },
  { code: "M", name: "Metro" },
  { code: "CM", name: "Centímetro" },
  { code: "MM", name: "Milímetro" },
  { code: "KG", name: "Kilogramo" },
  { code: "G", name: "Gramo" },
  { code: "L", name: "Litro" },
  { code: "ML", name: "Mililitro" },
  { code: "CONO", name: "Cono" },
  { code: "ROLLO", name: "Rollo" },
  { code: "CAJA", name: "Caja" },
];

import { useState } from "react";
import CurrencyInput from "./CurrencyInput";

export default function CreateInsumoModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
  error,
  form,
  onChange,
  proveedoresOptions,
  tercerosOptions,
  bodegasOptions,
}) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [localError, setLocalError] = useState("");

  if (!isOpen) return null;

  function handleInitialSubmit(e) {
    e.preventDefault();
    setLocalError("");

    // Validaciones básicas
    if (!form.codigo || !form.nombre || !form.bodega_id || !form.tercero_id || !form.stock_actual || !form.costo_unitario) {
      if (onSubmit) onSubmit(e);
      return;
    }

    // ✅ Validación específica antes de mostrar confirmación
    const codigoRegex = /^[a-zA-Z0-9-]+$/;
    if (!codigoRegex.test(form.codigo)) {
      setLocalError("No se permiten caracteres especiales diferentes a '-'.");
      return;
    }

    setShowConfirmation(true);
  }

  function handleFinalSubmit(e) {
    if (onSubmit) onSubmit(e);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-md overflow-hidden relative border border-white/10 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {showConfirmation ? "Confirmar nuevo insumo" : "Nuevo Insumo"}
          </h2>
          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" onClick={onClose} disabled={loading}>
            ✕
          </button>
        </div>

        {showConfirmation ? (
          <div className="px-6 py-6 space-y-4 bg-white dark:bg-slate-900">
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                ¿Estás seguro de que quieres ingresar este insumo?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verifica que toda la información a continuación sea correcta.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-4 text-sm space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Código</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{form.codigo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Referencia</p>
                  <p className="text-slate-800 dark:text-slate-200">{form.referencia || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Nombre</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">{form.nombre}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Observación</p>
                <p className="text-slate-800 dark:text-slate-200">{form.observacion || "—"}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Factura</p>
                <p className="text-slate-800 dark:text-slate-200">{form.factura || "—"}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Bodega</p>
                  <p className="text-slate-800 dark:text-slate-200">
                    {bodegasOptions.find(b => String(b.id) === String(form.bodega_id))?.nombre || form.bodega_id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tercero</p>
                  <p className="text-slate-800 dark:text-slate-200">
                    {tercerosOptions.find(t => String(t.id) === String(form.tercero_id))?.nombre || form.tercero_id}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Proveedor</p>
                  <p className="text-slate-800 dark:text-slate-200">
                    {proveedoresOptions.find(p => String(p.id) === String(form.proveedor_id))?.nombre || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Unidad de medida</p>
                  <p className="text-slate-800 dark:text-slate-200">{form.unidad_medida || "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Color</p>
                  <p className="text-slate-800 dark:text-slate-200">{form.color || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Costo Unitario</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{form.costo_unitario}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Cantidad Inicial</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{form.stock_actual}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Stock Mínimo</p>
                  <p className="text-slate-800 dark:text-slate-200">{form.stock_minimo || "—"}</p>
                </div>
              </div>
            </div>

            {error && <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/30 p-2 rounded">{error}</div>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="px-3 py-2 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                disabled={loading}
              >
                Atrás / Editar
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={loading}
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 disabled:opacity-70"
              >
                {loading ? "Creando..." : "Sí, crear insumo"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInitialSubmit} className="px-6 py-4 space-y-3 bg-white dark:bg-slate-900">
            {localError && <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-100 dark:border-red-900/50">{localError}</div>}
            {error && <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-100 dark:border-red-900/50">{error}</div>}

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Código</label>
                <input
                  type="text"
                  name="codigo"
                  value={form.codigo}
                  onChange={onChange}
                  placeholder="Ej: INS-0004"
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-slate-200"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-slate-200"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Observación (opcional)</label>
                <input
                  type="text"
                  name="observacion"
                  value={form.observacion || ""}
                  onChange={onChange}
                  placeholder="Ej: Lote para camisas"
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Factura (opcional)</label>
                  <input
                    type="text"
                    name="factura"
                    value={form.factura || ""}
                    onChange={onChange}
                    placeholder="Ej: FAC-98451"
                    className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Referencia</label>
                  <input
                    type="text"
                    name="referencia"
                    value={form.referencia || ""}
                    onChange={onChange}
                    placeholder="Ej: REF-TELA-01"
                    className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Bodega</label>
                <select
                  name="bodega_id"
                  value={form.bodega_id}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-slate-200"
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

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Tercero</label>
                <select
                  name="tercero_id"
                  value={form.tercero_id}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-slate-200"
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
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Proveedor</label>
                <select
                  name="proveedor_id"
                  value={form.proveedor_id}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-slate-200"
                >
                  <option value="">—</option>
                  {proveedoresOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* ✅ unidad_medida */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Unidad de medida</label>
                <select
                  name="unidad_medida"
                  value={form.unidad_medida || ""}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-slate-200"
                >
                  <option value="">—</option>
                  {UOM.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.code} - {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Color</label>
                <input
                  type="text"
                  name="color"
                  value={form.color || ""}
                  onChange={onChange}
                  placeholder="Ej: Blanco"
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Cantidad</label>
                <CurrencyInput
                  name="stock_actual"
                  value={form.stock_actual}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Stock mínimo</label>
                <CurrencyInput
                  name="stock_minimo"
                  value={form.stock_minimo}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Costo unitario</label>
                <CurrencyInput
                  name="costo_unitario"
                  value={form.costo_unitario}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-3 py-2 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 disabled:opacity-70"
              >
                {loading ? "Guardando..." : "Guardar insumo"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
