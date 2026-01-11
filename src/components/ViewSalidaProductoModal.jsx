import { X, Package, ClipboardList, Info, Truck } from "lucide-react";

export default function ViewSalidaProductoModal({ isOpen, salida, onClose }) {
    if (!isOpen || !salida) return null;

    const nf = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
    const nfMoney = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
    const num = (n) => nf.format(Number(n || 0));
    const money = (n) => `$${nfMoney.format(Number(n || 0))}`;

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

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all animate-fadeIn px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden border border-slate-100 flex flex-col">
                {/* HEADER */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                            <ClipboardList size={22} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 leading-tight">
                                Detalle de Nota de Salida
                            </h2>
                            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                                {salida.numero || `ID: #${salida.id}`} — {salida.fecha || "Sin fecha"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                    >
                        <X size={20} />
                    </button>
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
                                <p className="text-[10px] uppercase font-bold text-slate-400">Bodega Origen</p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {getBodegaLabel()}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                <Info size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Tercero / Cliente</p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {getTerceroLabel()}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <Package size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Total Unidades</p>
                                <p className="text-sm font-bold text-blue-700">
                                    {num(totalProductos)} UND
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
                                $
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Valor Total</p>
                                <p className="text-sm font-bold text-emerald-700">
                                    {money(totalVenta)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* OBSERVACIONES */}
                    {salida.observacion && (
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Observaciones</p>
                            <p className="text-sm text-slate-700 leading-relaxed italic">
                                "{salida.observacion}"
                            </p>
                        </div>
                    )}

                    {/* PRODUCTOS */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-5 w-1 bg-blue-500 rounded-full"></div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                                Productos Despachados
                            </h3>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="px-4 py-3">SKU / Producto</th>
                                        <th className="px-4 py-3 text-center">Talla</th>
                                        <th className="px-4 py-3 text-right">Cant.</th>
                                        <th className="px-4 py-3 text-right">Precio Unit.</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                        <th className="px-4 py-3 text-left">Traza (Ensambles)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(salida.detalles || []).map((d) => (
                                        <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">
                                                        {d.producto?.codigo_sku || "—"}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500">
                                                        {d.producto?.nombre || "—"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-700 font-medium">
                                                <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-[10px] font-bold">
                                                    {d.talla || "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                                {num(d.cantidad)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">
                                                {money(d.costo_unitario)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-blue-700 whitespace-nowrap">
                                                {money(Number(d.cantidad) * Number(d.costo_unitario))}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {(d.afectaciones || []).map((af) => (
                                                        <span key={af.id} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 font-medium whitespace-nowrap">
                                                            NE#{af.nota_ensamble_id} ({num(af.cantidad)})
                                                        </span>
                                                    ))}
                                                    {(d.afectaciones || []).length === 0 && (
                                                        <span className="text-[10px] text-slate-400 italic">Sin traza</span>
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
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                    >
                        Cerrar Detalle
                    </button>
                </div>
            </div>
        </div>
    );
}
