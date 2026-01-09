import { useState, useEffect } from "react";
import EstadoBadge from "./EstadoBadge";
import { API_BASE } from "../config/api";

function getActual(insumo) {
  const n = Number(insumo?.cantidad ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function getMin(insumo) {
  const n = Number(insumo?.stock_minimo ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default function ViewInsumoModal({ isOpen, insumo, onClose }) {
  const [stockBodega, setStockBodega] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);

  useEffect(() => {
    if (isOpen && insumo?.codigo) {
      setLoadingStock(true);
      fetch(`${API_BASE}/insumos/${insumo.codigo}/stock_por_bodega/`)
        .then((res) => {
          if (!res.ok) throw new Error("Error fetching stock");
          return res.json();
        })
        .then((data) => setStockBodega(data))
        .catch((err) => console.error(err))
        .finally(() => setLoadingStock(false));
    } else {
      setStockBodega([]);
    }
  }, [isOpen, insumo]);

  if (!isOpen || !insumo) return null;

  const actual = getActual(insumo);
  const minimo = getMin(insumo);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-sm font-semibold text-slate-900">Detalle de insumo</h2>
          <button className="text-slate-400 hover:text-slate-600 transition-colors" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 text-sm">
          {/* Header Info */}
          <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
            <div className="bg-slate-100 p-2 rounded-lg">
              <span className="text-2xl">📦</span>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-lg leading-tight">{insumo.nombre}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{insumo.codigo}</p>
            </div>
            <div className="ml-auto">
              <EstadoBadge estado={insumo.estado} stockActual={actual} stockMinimo={minimo} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Referencia</p>
              <p className="text-slate-700">{insumo.referencia || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Proveedor</p>
              <p className="text-slate-700 truncate" title={insumo.proveedor?.nombre}>{insumo.proveedor?.nombre || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Bodega (Principal)</p>
              <p className="text-slate-700">{insumo.bodega?.nombre || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Tercero (Principal)</p>
              <p className="text-slate-700">{insumo.tercero?.nombre || "—"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] uppercase font-semibold text-slate-400">Observación</p>
              <p className="text-slate-700 italic text-xs">{insumo.observacion || "Sin observaciones."}</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-semibold mb-1">Costo Unit.</p>
              <p className="text-slate-800 font-medium">{insumo.costo_unitario ? `$${insumo.costo_unitario}` : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-semibold mb-1">Stock Global</p>
              <p className="text-blue-600 font-bold text-base">{actual} <span className="text-[10px] text-slate-400 font-normal">{insumo.unidad_medida}</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-semibold mb-1">Mínimo</p>
              <p className="text-slate-600 font-medium">{minimo || "—"}</p>
            </div>
          </div>

          {/* Section: Stock por Bodega */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide flex items-center justify-between">
              <span>Distribución por Bodega</span>
              {loadingStock && <span className="text-[10px] font-normal text-slate-400">Calculando...</span>}
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Bodega</th>
                    <th className="px-3 py-2 font-semibold text-right">Cantidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingStock ? (
                    <tr><td colSpan={2} className="p-3 text-center text-slate-400">Cargando...</td></tr>
                  ) : stockBodega.length === 0 ? (
                    <tr><td colSpan={2} className="p-3 text-center text-slate-400">No hay movimientos registrados.</td></tr>
                  ) : (
                    stockBodega.map(b => (
                      <tr key={b.bodega_id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700">{b.bodega_nombre}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-900">{Number(b.stock).toLocaleString("de-DE")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 text-xs text-slate-400">
            <div>
              Actualizado: {insumo.actualizado_en ? new Date(insumo.actualizado_en).toLocaleDateString() : "—"}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors shadow-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
