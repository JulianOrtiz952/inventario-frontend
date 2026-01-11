import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { formatCurrency } from "../utils/format";

const num = (n) => formatCurrency(n);
const money = (n) => `$${formatCurrency(n)}`;

const TEMP_LOGO_URL =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/640px-Placeholder_view_vector.svg.png";

function FieldRow({ label, value }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div className="text-[11px] text-slate-500">{label}</div>
            <div className="text-xs font-semibold text-slate-900 text-right whitespace-pre-line">
                {value ?? "—"}
            </div>
        </div>
    );
}

export default function NotaEnsambleDocumento({ nota, mode, onClose, onCreateAnother, showActions = true }) {
    const printAreaRef = useRef(null);
    const [downloading, setDownloading] = useState(false);

    const notaCode = `NE-${nota?.id ?? "—"}`;

    const getBodegaLabel = () => {
        const b = nota?.bodega;
        if (b?.codigo) return `${b.codigo} — ${b.nombre}`;
        if (b?.nombre) return b.nombre;
        return "—";
    };

    const getTerceroLabel = () => {
        const t = nota?.tercero;
        if (!t) return "—";
        if (t?.codigo) return `${t.codigo} — ${t.nombre}`;
        if (t?.nombre) return t.nombre;
        return "—";
    };

    const totalProductos = (Array.isArray(nota?.detalles) ? nota.detalles : []).reduce(
        (acc, d) => acc + Number(d?.cantidad || 0),
        0
    );

    const imprimir = () => window.print();

    const descargarPDF = async () => {
        const el = printAreaRef.current;
        if (!el) return;

        try {
            setDownloading(true);

            const canvas = await html2canvas(el, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                scrollX: 0,
                scrollY: -window.scrollY,
            });

            const imgData = canvas.toDataURL("image/png");

            const pdf = new jsPDF({
                orientation: "landscape",
                unit: "pt",
                format: "a4",
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
            const renderW = imgWidth * ratio;
            const renderH = imgHeight * ratio;

            const marginX = (pageWidth - renderW) / 2;
            const marginY = (pageHeight - renderH) / 2;

            if (renderH <= pageHeight) {
                pdf.addImage(imgData, "PNG", marginX, marginY, renderW, renderH);
            } else {
                let yOffset = 0;
                const pageCanvas = document.createElement("canvas");
                const ctx = pageCanvas.getContext("2d");

                const pxPerPt = imgWidth / renderW;
                const pageImgHeightPx = Math.floor(pageHeight * pxPerPt);

                pageCanvas.width = imgWidth;
                pageCanvas.height = pageImgHeightPx;

                while (yOffset < imgHeight) {
                    ctx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);

                    ctx.drawImage(
                        canvas,
                        0,
                        yOffset,
                        imgWidth,
                        pageImgHeightPx,
                        0,
                        0,
                        imgWidth,
                        pageImgHeightPx
                    );

                    const pageData = pageCanvas.toDataURL("image/png");
                    if (yOffset > 0) pdf.addPage();

                    const r = Math.min(pageWidth / imgWidth, pageHeight / (pageImgHeightPx / pxPerPt));
                    const w = imgWidth * r;
                    const h = (pageImgHeightPx / pxPerPt) * r;

                    const x = (pageWidth - w) / 2;
                    const y = (pageHeight - h) / 2;

                    pdf.addImage(pageData, "PNG", x, y, w, h);

                    yOffset += pageImgHeightPx;
                }
            }

            pdf.save(`Nota_Ensamble_${notaCode}.pdf`);
        } catch (err) {
            console.error(err);
            alert("No se pudo generar el PDF. Revisa la consola.");
        } finally {
            setDownloading(false);
        }
    };

    // Expose download function via ref if needed, or just use the button
    // For now, let's keep it as is but allow hiding actions

    return (
        <div className="space-y-4">
            <style>
                {`
          @media print {
            body { background: white !important; }
            .no-print { display: none !important; }
            .print-area { box-shadow: none !important; border: none !important; }
            .modal-backdrop { background: transparent !important; }
          }
        `}
            </style>

            {showActions && (
                <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-4 rounded-xl mb-4 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            ✅
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                {mode === "edit" ? "Nota Actualizada" : "Nota Creada"}:{" "}
                                <span className="text-blue-600 dark:text-blue-400">{notaCode}</span>
                            </h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Vista tipo documento (lista para imprimir o descargar en PDF).
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={descargarPDF}
                            disabled={downloading}
                            className="px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-500 text-white text-xs font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-70 shadow-sm transition-all active:scale-95 flex items-center gap-2"
                        >
                            {downloading ? "Generando..." : "Descargar PDF"}
                        </button>

                        <button
                            type="button"
                            onClick={imprimir}
                            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white transition-all shadow-sm active:scale-95"
                        >
                            Imprimir
                        </button>

                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                            >
                                Cerrar
                            </button>
                        )}

                        {onCreateAnother && (
                            <button
                                type="button"
                                onClick={onCreateAnother}
                                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                            >
                                {mode === "edit" ? "Volver" : "Crear otra"}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* If not showing actions, we still might want a standalone download button somewhere else */}
            {!showActions && (
                <div className="no-print flex justify-end mb-4">
                    <button
                        type="button"
                        onClick={descargarPDF}
                        disabled={downloading}
                        className="px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-500 text-white text-xs font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 shadow-sm transition-all active:scale-95 flex items-center gap-2"
                    >
                        {downloading ? "Generando..." : "Descargar PDF"}
                    </button>
                </div>
            )}

            <div
                ref={printAreaRef}
                className="print-area rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden"
            >
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="flex items-center gap-3">
                            <img
                                src={TEMP_LOGO_URL}
                                alt="Logo"
                                className="h-14 w-auto object-contain rounded-md bg-white border border-slate-200 p-2"
                            />
                            <div className="hidden md:block">
                                <div className="text-xs font-semibold text-slate-900">CALA BOUTIQUE</div>
                                <div className="text-[11px] text-slate-500">
                                    Documento interno — Nota de Ensamble
                                </div>
                            </div>
                        </div>

                        <div className="text-[11px] text-slate-600 md:text-center">
                            <div className="font-semibold text-slate-900">GRUPO CALA SAS</div>
                            <div>NIT: 901.367.797-5</div>
                            <div>Cúcuta — Colombia</div>
                            <div>Tel: 000 000 0000</div>
                        </div>

                        <div className="md:flex md:justify-end">
                            <div className="w-full md:w-auto rounded-lg border border-slate-200 bg-white px-4 py-3">
                                <div className="text-[11px] uppercase font-semibold text-slate-500 text-center">
                                    Materia prima - Producto terminado
                                </div>
                                <div className="mt-1 text-sm font-bold text-slate-900 text-center">
                                    No. {`NE-${nota?.id ?? "—"}`}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-lg border border-slate-200 p-4">
                            <div className="text-xs font-semibold text-slate-900 mb-3">Tercero</div>
                            <div className="space-y-2">
                                <FieldRow label="Tercero" value={getTerceroLabel()} />
                            </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-4">
                            <div className="text-xs font-semibold text-slate-900 mb-3">Bodega</div>
                            <div className="space-y-2">
                                <FieldRow label="Bodega" value={getBodegaLabel()} />
                            </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-4">
                            <div className="text-xs font-semibold text-slate-900 mb-3">Fecha</div>
                            <div className="space-y-2">
                                <FieldRow label="Fecha de elaboración" value={nota?.fecha_elaboracion || "—"} />
                                <FieldRow label="Cantidad a ensamblar" value={num(totalProductos)} />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div className="text-xs font-semibold text-slate-900">Entrada de producto</div>
                            <div className="text-[11px] text-slate-500">Productos terminados</div>
                        </div>

                        <div className="overflow-auto">
                            <table className="min-w-full text-xs">
                                <thead className="bg-white border-b border-slate-200">
                                    <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                        <th className="px-3 py-2 text-left">Código producto</th>
                                        <th className="px-3 py-2 text-left">Nombre producto</th>
                                        <th className="px-3 py-2 text-left">Talla</th>
                                        <th className="px-3 py-2 text-right">Cantidad</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(Array.isArray(nota?.detalles) ? nota.detalles : []).map((d) => (
                                        <tr key={d.id}>
                                            <td className="px-3 py-2 font-medium text-slate-900">
                                                {d?.producto?.codigo_sku || "—"}
                                            </td>
                                            <td className="px-3 py-2 text-slate-700">{d?.producto?.nombre || "—"}</td>
                                            <td className="px-3 py-2 text-slate-700">{d?.talla?.nombre || "—"}</td>
                                            <td className="px-3 py-2 text-right font-semibold text-slate-900">
                                                {num(d?.cantidad || 0)}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!nota?.detalles || nota.detalles.length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-3 text-xs text-slate-500 text-center">
                                                — No hay detalles —
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-6 items-center">
                            <div className="text-[11px] text-slate-500 uppercase font-bold">Total Unidades:</div>
                            <div className="text-sm font-bold text-slate-900">
                                {num(totalProductos)} UND
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div className="text-xs font-semibold text-slate-900">Salida de producto</div>
                            <div className="text-[11px] text-slate-500">Insumos manuales (por nota)</div>
                        </div>

                        <div className="overflow-auto">
                            <table className="min-w-full text-xs">
                                <thead className="bg-white border-b border-slate-200">
                                    <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                        <th className="px-3 py-2 text-left">Código</th>
                                        <th className="px-3 py-2 text-left">Insumo</th>
                                        <th className="px-3 py-2 text-left">Bodega</th>
                                        <th className="px-3 py-2 text-right">Cantidad</th>
                                        <th className="px-3 py-2 text-right">Costo Unit.</th>
                                        <th className="px-3 py-2 text-right">Total</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {(Array.isArray(nota?.insumos) ? nota.insumos : []).map((i) => {
                                        const cu = Number(i?.insumo?.costo_unitario || 0);
                                        const qty = Number(i?.cantidad || 0);
                                        const total = cu * qty;

                                        return (
                                            <tr key={i.id}>
                                                <td className="px-3 py-2 font-medium text-slate-900">
                                                    {i?.insumo?.codigo || "—"}
                                                </td>
                                                <td className="px-3 py-2 text-slate-700">{i?.insumo?.nombre || "—"}</td>
                                                <td className="px-3 py-2 text-slate-700">
                                                    {i?.insumo?.bodega?.nombre || "—"}
                                                </td>
                                                <td className="px-3 py-2 text-right font-semibold text-slate-900">
                                                    {num(qty)}
                                                </td>
                                                <td className="px-3 py-2 text-right text-slate-700">
                                                    {money(cu)}
                                                </td>
                                                <td className="px-3 py-2 text-right font-bold text-slate-900">
                                                    {money(total)}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {(!nota?.insumos || nota.insumos.length === 0) && (
                                        <tr>
                                            <td colSpan={6} className="px-3 py-3 text-xs text-slate-500 text-center">
                                                — No hay insumos manuales —
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-6 items-center">
                            <div className="text-[11px] text-slate-500 uppercase font-bold">Total Consumo Insumos:</div>
                            <div className="text-sm font-bold text-blue-700">
                                {money(nota?.costo_total || (Array.isArray(nota?.insumos) ? nota.insumos : []).reduce((acc, i) => acc + (Number(i.cantidad || 0) * Number(i.insumo?.costo_unitario || 0)), 0))}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-4">
                        <div className="text-xs font-semibold text-slate-900 mb-2">Observaciones</div>
                        <div className="text-xs text-slate-700 whitespace-pre-line">
                            {nota?.observaciones?.trim() ? nota.observaciones : "—"}
                        </div>
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>Generado desde el módulo de Inventario.</div>
                        <div className="md:text-right">Documento: {notaCode}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
