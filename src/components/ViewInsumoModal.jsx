import EstadoBadge from "./EstadoBadge";

function getActual(insumo) {
  const v = insumo?.cantidad ?? insumo?.stock_actual;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getMin(insumo) {
  const n = Number(insumo?.stock_minimo);
  return Number.isFinite(n) ? n : 0;
}

export default function ViewInsumoModal({ isOpen, insumo, onClose }) {
  if (!isOpen || !insumo) return null;

  const actual = getActual(insumo);
  const minimo = getMin(insumo);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Detalle de insumo</h2>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Nombre</p>
            <p className="font-medium text-slate-800">{insumo.nombre}</p>
          </div>
          <div>
  <p className="text-xs text-slate-500">Referencia</p>
  <p className="text-slate-800">{insumo.referencia ?? "—"}</p>
</div>
          {insumo.descripcion && (
            <div>
              <p className="text-xs text-slate-500">Descripción</p>
              <p className="text-slate-800">{insumo.descripcion}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500">Bodega</p>
              <p className="text-slate-800">{insumo.bodega?.nombre ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tercero</p>
              <p className="text-slate-800">{insumo.tercero?.nombre ?? "—"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500">Proveedor</p>
              <p className="text-slate-800">{insumo.proveedor?.nombre ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Unidad</p>
              <p className="text-slate-800">{insumo.unidad ?? "—"}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-slate-500">Cantidad</p>
              <p className="text-slate-800">{actual}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Stock mínimo</p>
              <p className="text-slate-800">{minimo || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Costo unitario</p>
              <p className="text-slate-800">${insumo.costo_unitario}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-1">Estado</p>
            <EstadoBadge
              estado={insumo.estado}
              stockActual={actual}
              stockMinimo={minimo}
            />
          </div>

          {(insumo.creado_en || insumo.actualizado_en) && (
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
              <div>
                <p>Creado en</p>
                <p>{insumo.creado_en ?? "—"}</p>
              </div>
              <div>
                <p>Actualizado en</p>
                <p>{insumo.actualizado_en ?? "—"}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
