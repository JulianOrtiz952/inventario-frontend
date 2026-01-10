export default function DeleteInsumoModal({
  isOpen,
  insumo,
  onClose,
  onConfirm,
  loading,
  error,
}) {
  if (!isOpen || !insumo) return null;

  const isActive = insumo.es_activo !== false;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            {isActive ? "Desactivar insumo" : "Reactivar insumo"}
          </h2>
          <button
            className="text-slate-400 hover:text-slate-600"
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-3">
          {error && <div className="text-xs text-red-600">{error}</div>}

          <p className="text-sm text-slate-700">
            ¿Estás seguro de que deseas {isActive ? "desactivar" : "reactivar"} el insumo{" "}
            <span className="font-semibold">“{insumo.nombre}”</span>?
          </p>

          <p className="text-xs text-slate-500">
            {isActive
              ? "El insumo pasará a estado inactivo y se ocultará de algunas listas."
              : "El insumo volverá a estar disponible para movimientos."}
          </p>

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
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 rounded-md text-white text-xs font-medium shadow-sm disabled:opacity-70 ${isActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
            >
              {loading
                ? (isActive ? "Desactivando..." : "Reactivando...")
                : (isActive ? "Desactivar" : "Reactivar")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
