import { X, Package, ClipboardList, Info, ArrowDownRight, Truck, FileText } from "lucide-react";
import { formatCurrency } from "../utils/format";
import { useState } from "react";
import NotaEnsambleDocumento from "./NotaEnsambleDocumento";

export default function ViewNotaEnsambleModal({ isOpen, nota, onClose }) {
    const [viewDocument, setViewDocument] = useState(false);

    if (!isOpen || !nota) return null;

    const nf = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
    const num = (n) => nf.format(Number(n || 0));

    const totalProductos = (nota.detalles || []).reduce((acc, d) => acc + Number(d.cantidad || 0), 0);
    const totalCosto = nota.costo_total || "0";

    if (viewDocument) {
        return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all animate-fadeIn">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 relative">
                    <button
                        onClick={() => setViewDocument(false)}
                        className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all z-10 no-print"
                    >
                        <X size={20} />
                    </button>
                    <NotaEnsambleDocumento nota={nota} onClose={() => setViewDocument(false)} />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden border border-slate-100 flex flex-col">
                {/* HEADER */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                            <ClipboardList size={22} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 leading-tight">
                                Detalle de Nota de Ensamble
                            </h2>
                            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                                ID: #{nota.id} — {nota.fecha_elaboracion || "Sin fecha"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setViewDocument(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-sm"
                            title="Ver formato de impresión / PDF"
                        >
                            <FileText size={16} />
                            <span>PDF / Imprimir</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-slate-50/30">
                    {/* SECCIÓN 1: CABECERA */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                <Truck size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Bodega</p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {nota.bodega?.nombre || "—"}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                <Info size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Tercero</p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {nota.tercero?.nombre || "—"}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <Package size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Total Productos</p>
                                <p className="text-sm font-bold text-blue-700">
                                    {num(totalProductos)} UND
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* OBSERVACIONES */}
                    {nota.observaciones && (
                        <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-4">
                            <p className="text-[10px] uppercase font-bold text-amber-700 mb-1">Observaciones</p>
                            <p className="text-sm text-amber-900 leading-relaxed italic">
                                "{nota.observaciones}"
                            </p>
                        </div>
                    )}

                    {/* PRODUCTOS TERMINADOS */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-5 w-1 bg-blue-500 rounded-full"></div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                                Productos Ensamblados
                            </h3>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="px-4 py-3">Referencia / Producto</th>
                                        <th className="px-4 py-3">Talla</th>
                                        <th className="px-4 py-3 text-right">Cantidad</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(nota.detalles || []).map((d) => (
                                        <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">
                                                        {d.producto?.nombre || "—"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-700 font-medium">
                                                {d.talla?.nombre || "N/A"}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-900">
                                                {num(d.cantidad)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* CONSUMO DE INSUMOS (KARDEX) */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-5 w-1 bg-emerald-500 rounded-full"></div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                                Consumo de Insumos Detallado
                            </h3>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="px-4 py-3">Insumo</th>
                                        <th className="px-4 py-3">Bodega Origen</th>
                                        <th className="px-4 py-3 text-right">Cantidad</th>
                                        <th className="px-4 py-3 text-right">Costo Unit.</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(nota.movimientos || []).map((m) => (
                                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-2.5">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800">
                                                        {m.insumo_nombre || "—"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                                                    {m.bodega_nombre || "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-medium text-slate-700 tabular-nums">
                                                {num(m.cantidad)} <span className="text-[10px] text-slate-400 font-normal">{m.unidad_medida}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-slate-600 tabular-nums font-medium">
                                                {formatCurrency(m.costo_unitario)}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-bold text-emerald-700 tabular-nums">
                                                {formatCurrency(m.total)}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!nota.movimientos || nota.movimientos.length === 0) && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                                                No hay movimientos de insumos registrados para esta nota.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                {/* FOOTER - TOTALS */}
                <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">
                            Estado de la Nota
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="text-sm font-semibold">Procesada Correctamente</span>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">
                            Costo Total Consumo
                        </p>
                        <p className="text-3xl font-black text-white tracking-tight">
                            {formatCurrency(totalCosto)}
                            <span className="text-xs font-medium text-slate-500 ml-1 ml-2">COP</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
