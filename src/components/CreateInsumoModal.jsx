export default function CreateInsumoModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
  error,
  form,
  onChange,
  proveedoresOptions,
  bodegasOptions,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Nuevo Insumo
          </h2>
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
              <label className="text-xs font-medium text-slate-700">
                ID / Código interno (opcional)
              </label>
              <input
                type="text"
                name="codigo"
                value={form.codigo}
                onChange={onChange}
                placeholder="Ej: INS-0001"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400">
                Si lo dejas vacío, el sistema generará uno automáticamente.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Nombre
              </label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Unidad + Color + Proveedor */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Unidad
              </label>
              <select
                name="unidad"
                value={form.unidad}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Selecciona...</option>
                <option value="Kg">Kg</option>
                <option value="Unidad">Unidad</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Color
              </label>
              <input
                type="text"
                name="color"
                value={form.color}
                onChange={onChange}
                placeholder="Ej: Azul"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Proveedor
              </label>
              <select
                name="proveedor_id"
                value={form.proveedor_id}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Selecciona...</option>
                {proveedoresOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Bodega
              </label>
                <select
                  name="bodega_id"
                  value={form.bodega_id}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          </div>

          {/* Stock + costo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Stock actual
              </label>
              <input
                type="number"
                step="0.01"
                name="stock_actual"
                value={form.stock_actual}
                onChange={onChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Stock mínimo
              </label>
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
              <label className="text-xs font-medium text-slate-700">
                Costo unitario
              </label>
              <input
                type="number"
                step="0.01"
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
              {loading ? "Guardando..." : "Guardar insumo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
