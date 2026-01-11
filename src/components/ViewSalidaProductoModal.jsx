import { X, Package, ClipboardList, Info, Truck, FileText } from "lucide-react";
import { useState } from "react";
import SalidaProductoDocumento from "./SalidaProductoDocumento";
import { API_BASE } from "../config/api";
import { formatCurrency } from "../utils/format";

export default function ViewSalidaProductoModal({ isOpen, salida, onClose }) {
    const [viewDocument, setViewDocument] = useState(false);

    if (!isOpen || !salida) return null;

    const num = (n) => formatCurrency(n);
    const money = (n) => `$${formatCurrency(n)}`;

    const totalProductos = (salida.detalles || []).reduce((acc, d) => acc + Number(d.cantidad || 0), 0);
    const totalVenta = (salida.detalles || []).reduce((acc, d) => acc + (Number(d.cantidad || 0) * Number(d.costo_unitario || 0)), 0);

    const getBodegaLabel = () => {
        const b = salida.bodega;
        if (b?.nombre) return b.nombre;
        return "—";
    };

    const getTerceroLabel = () => {
        const t = salida.tercero;
        if (t?.nombre) return t.nombre;
        return "—";
    };

    if (viewDocument) {
        return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-all animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 relative border border-white/10 dark:border-slate-800">
                    <button
                        onClick={() => setViewDocument(false)}
                        className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-all z-10 no-print"
                    >
                        <X size={20} />
                    </button>
                    <SalidaProductoDocumento salida={salida} onClose={() => setViewDocument(false)} />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-all animate-fadeIn px-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col">
                {/* HEADER */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600 dark:text-blue-400">
                            <ClipboardList size={22} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                Detalle de Nota de Salida
                            </h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                                {salida.numero || `ID: #${salida.id}`} — {salida.fecha || "Sin fecha"}
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
                            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/30">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                                <Truck size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Bodega Origen</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    {getBodegaLabel()}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                                <Info size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Tercero / Cliente</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    {getTerceroLabel()}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Package size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Total Unidades</p>
                                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                                    {num(totalProductos)} UND
                                </p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                                $
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Valor Total</p>
                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                    {money(totalVenta)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* OBSERVACIONES */}
                    {salida.observacion && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-2">Observaciones</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                "{salida.observacion}"
                            </p>
                        </div>
                    )}

                    {/* PRODUCTOS */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-5 w-1 bg-blue-500 rounded-full"></div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                                Productos Despachados
                            </h3>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                    <tr className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <th className="px-4 py-3">SKU / Producto</th>
                                        <th className="px-4 py-3 text-center">Talla</th>
                                        <th className="px-4 py-3 text-right">Cant.</th>
                                        <th className="px-4 py-3 text-right">Precio Unit.</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                        <th className="px-4 py-3 text-left">Traza (Ensambles)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {(salida.detalles || []).map((d) => (
                                        <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                        {d.producto?.codigo_sku || "—"}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        {d.producto?.nombre || "—"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-medium">
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-800 dark:text-slate-200">
                                                    {d.talla || "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                                {num(d.cantidad)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                {money(d.costo_unitario)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                                                {money(Number(d.cantidad) * Number(d.costo_unitario))}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {(d.afectaciones || []).map((af) => (
                                                        <span key={af.id} className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-800 font-medium whitespace-nowrap">
                                                            NE#{af.nota_ensamble_id} ({num(af.cantidad)})
                                                        </span>
                                                    ))}
                                                    {(d.afectaciones || []).length === 0 && (
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Sin traza</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                {/* FOOTER */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-lg dark:shadow-none shadow-slate-200"
                    >
                        Cerrar Detalle
                    </button>
                </div>
            </div>
        </div>
    );
}
