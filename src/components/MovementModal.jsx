export default function MovementModal({
  isOpen,
  type,
  onClose,
  loading,
  error,
  search,
  onSearchChange,
  insumos,
  selected,
  onSelect,
  qty,
  onQtyChange,
  onSubmit,
}) {
  if (!isOpen) return null;

  const titulo =
    type === "entrada" ? "Registrar entrada" : "Registrar salida";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
          <button
            className="text-slate-400 hover:text-slate-600"
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-4 space-y-3 text-sm">
          {error && <div className="text-xs text-red-600">{error}</div>}

          {/* Buscar insumo */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Buscar insumo (por nombre o ID)
            </label>
            <div className="flex items-center bg-white rounded-md border border-slate-200 px-3 py-2 text-sm">
              <span className="mr-2 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                placeholder="Ej: 1, Azúcar..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>

          {/* Lista de insumos con scroll */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-700">
              Selecciona un insumo
            </p>
            <div className="border border-slate-200 rounded-md max-h-48 overflow-y-auto">
              {insumos.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-500">
                  No se encontraron insumos.
                </div>
              )}

              {insumos.map((i) => {
                const isSelected = selected?.id === i.id;
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => onSelect(i)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between ${
                      isSelected
                        ? "bg-blue-50 border-l-2 border-blue-500"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">
                        #{i.id} — {i.nombre}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Stock: {i.stock_actual} {i.unidad} ·{" "}
                        {i.proveedor?.nombre ?? "Sin proveedor"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resumen del insumo seleccionado */}
          {selected && (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700 space-y-1">
              <p className="font-semibold">
                Insumo seleccionado: {selected.nombre}
              </p>
              <p>
                Stock actual:{" "}
                <span className="font-medium">
                  {selected.stock_actual} {selected.unidad}
                </span>
              </p>
              <p>
                Proveedor:{" "}
                <span className="font-medium">
                  {selected.proveedor?.nombre ?? "—"}
                </span>
              </p>
            </div>
          )}

          {/* Cantidad */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Cantidad a {type === "entrada" ? "ingresar" : "descontar"}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="movementQty"
              value={qty}
              onChange={(e) => onQtyChange(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: 10.5"
            />
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
              className={`px-4 py-2 rounded-md text-xs font-medium shadow-sm disabled:opacity-70 ${
                type === "entrada"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-orange-500 text-white hover:bg-orange-600"
              }`}
            >
              {loading
                ? "Guardando..."
                : type === "entrada"
                ? "Registrar entrada"
                : "Registrar salida"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
