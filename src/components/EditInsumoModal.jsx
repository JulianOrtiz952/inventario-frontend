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

import CurrencyInput from "./CurrencyInput";

export default function EditInsumoModal({
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Editar insumo</h2>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose} disabled={loading}>
            ✕
          </button>
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (typeof onSubmit === "function") onSubmit(e);
          }}
          className="px-6 py-4 space-y-3"
        >
          {error && <div className="text-xs text-red-600">{error}</div>}

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Código</label>
              <input
                type="text"
                name="codigo"
                value={form.codigo}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 bg-slate-100 text-slate-500 px-3 py-2 text-sm outline-none cursor-not-allowed"
                readOnly
                disabled
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Nombre</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Observación</label>
              <input
                type="text"
                name="observacion"
                value={form.observacion || ""}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Factura</label>
              <input
                type="text"
                name="factura"
                value={form.factura || ""}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Referencia</label>
              <input
                type="text"
                name="referencia"
                value={form.referencia || ""}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Bodega</label>
              <select
                name="bodega_id"
                value={form.bodega_id}
                onChange={onChange}
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

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Tercero</label>
              <select
                name="tercero_id"
                value={form.tercero_id}
                onChange={onChange}
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
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Proveedor</label>
              <select
                name="proveedor_id"
                value={form.proveedor_id}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">—</option>
                {proveedoresOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Unidad de medida</label>
              <select
                name="unidad_medida"
                value={form.unidad_medida || ""}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="text-xs font-medium text-slate-700">Color</label>
              <input
                type="text"
                name="color"
                value={form.color || ""}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Cantidad</label>
              <CurrencyInput
                name="stock_actual"
                value={form.stock_actual}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Stock mínimo</label>
              <CurrencyInput
                name="stock_minimo"
                value={form.stock_minimo}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Costo unitario</label>
              <CurrencyInput
                name="costo_unitario"
                value={form.costo_unitario}
                onChange={onChange}
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
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
