const DIAN_UOM = [
  // (código) - (nombre)
  { code: "UN", name: "Unidad" },
  { code: "KGM", name: "Kilogramo" },
  { code: "GRM", name: "Gramo" },
  { code: "MTR", name: "Metro" },
  { code: "CMT", name: "Centímetro" },
  { code: "MMT", name: "Milímetro" },
  { code: "MTK", name: "Metro cuadrado" },
  { code: "MTQ", name: "Metro cúbico" },
  { code: "LTR", name: "Litro" },
  { code: "MLT", name: "Mililitro" },
  { code: "H87", name: "Pieza" },
  { code: "PR", name: "Par" },
  { code: "SET", name: "Juego / Set" },
  { code: "DZN", name: "Docena" },
  { code: "BX", name: "Caja" },
  { code: "PK", name: "Paquete" },
  { code: "ROL", name: "Rollo" },
  { code: "EA", name: "Cada uno (Each)" },
];

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
})

{
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Nuevo Insumo</h2>
          <button
            className="text-slate-400 hover:text-slate-600"
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-4 space-y-3">
          {error && <div className="text-xs text-red-600">{error}</div>}

          {/* Código + Nombre */}
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Código</label>
              <input
                type="text"
                name="codigo"
                value={form.codigo}
                onChange={onChange}
                placeholder="Ej: INS-0004"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
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
              <label className="text-xs font-medium text-slate-700">Descripción (opcional)</label>
              <input
                type="text"
                name="descripcion"
                value={form.descripcion || ""}
                onChange={onChange}
                placeholder="Ej: Tela blanca"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
  <label className="text-xs font-medium text-slate-700">
    Referencia (si la dejas vacía, se usa el Código)
  </label>
  <input
    type="text"
    name="referencia"
    value={form.referencia || ""}
    onChange={onChange}
    placeholder="Ej: INS-0001"
    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />
</div>
          </div>

          {/* Bodega + Tercero */}
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

          {/* Proveedor (opcional) + Extras */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Proveedor (opcional)</label>
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
  <label className="text-xs font-medium text-slate-700">Unidad (DIAN)</label>
  <select
    name="unidad"
    value={form.unidad || ""}
    onChange={onChange}
    className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  >
    <option value="">—</option>
    {DIAN_UOM.map((u) => (
      <option key={u.code} value={u.code}>
        {u.code} - {u.name}
      </option>
    ))}
  </select>
  
</div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Color (opcional)</label>
              <input
                type="text"
                name="color"
                value={form.color || ""}
                onChange={onChange}
                placeholder="Ej: Negro"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Cantidad + stock min + costo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Cantidad</label>
              <input
                type="number"
                step="0.01"
                name="stock_actual"
                value={form.stock_actual}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Stock mínimo</label>
              <input
                type="number"
                step="0.01"
                name="stock_minimo"
                value={form.stock_minimo}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Costo unitario</label>
              <input
                type="number"
                step="0.01"
                name="costo_unitario"
                value={form.costo_unitario}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
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
              {loading ? "Guardando..." : "Guardar insumo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
