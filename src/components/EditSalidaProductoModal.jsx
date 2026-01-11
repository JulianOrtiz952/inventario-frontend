import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { API_BASE } from "../config/api";
import { asRows, safeJson, fetchAllPages } from "../utils/api";
import { Trash2 } from "lucide-react";

const todayISO = () => new Date().toISOString().slice(0, 10);

const nfNum = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const nfMoney = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const num = (n) => nfNum.format(Number(n || 0));
const money = (n) => `$${nfMoney.format(Number(n || 0))}`;

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

export default function EditSalidaProductoModal({ isOpen, onClose, onSaved, salidaId }) {
    // catálogos
    const [bodegas, setBodegas] = useState([]);
    const [terceros, setTerceros] = useState([]);

    // stock terminado por bodega
    const [stock, setStock] = useState([]);

    // form
    const [fecha, setFecha] = useState(todayISO());
    const [bodegaId, setBodegaId] = useState("");
    const [terceroId, setTerceroId] = useState("");
    const [observacion, setObservacion] = useState("");

    // selección
    const [productoId, setProductoId] = useState("");

    // líneas
    const [detalleLines, setDetalleLines] = useState([]);

    // ui
    const [loadingInitial, setLoadingInitial] = useState(false);
    const [loadingStock, setLoadingStock] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Al abrir y tener un salidaId, cargar datos
    useEffect(() => {
        if (!isOpen || !salidaId) return;

        setError("");
        const loadData = async () => {
            try {
                setLoadingInitial(true);
                const [bodegasArr, tercerosArr, currentSalida] = await Promise.all([
                    fetchAllPages(`${API_BASE}/bodegas/?page_size=200`),
                    fetchAllPages(`${API_BASE}/terceros/?page_size=200`),
                    fetch(`${API_BASE}/salidas-producto/${salidaId}/`).then(r => r.json()),
                ]);

                setBodegas(bodegasArr.filter(x => x.es_activo !== false || String(x.id) === String(currentSalida.bodega?.id)));
                setTerceros(tercerosArr.filter(x => x.es_activo !== false || String(x.id) === String(currentSalida.tercero?.id)));

                // Seteo de form
                setFecha(currentSalida.fecha || todayISO());
                setBodegaId(String(currentSalida.bodega?.id || ""));
                setTerceroId(String(currentSalida.tercero?.id || ""));
                setObservacion(currentSalida.observacion || "");

                // Detalle: asumimos un solo producto por nota de salida (según diseño de CreateSalidaProductoModal)
                // Si hay varios, se agrupan por SKU
                if (currentSalida.detalles?.length > 0) {
                    const firstSku = currentSalida.detalles[0].producto?.codigo_sku;
                    setProductoId(firstSku);

                    setDetalleLines(currentSalida.detalles.map(d => ({
                        id: d.id || Math.random(),
                        talla_nombre: d.talla || "",
                        cantidad: String(d.cantidad || ""),
                        costo_unitario: String(d.costo_unitario || ""),
                    })));
                }

            } catch (e) {
                console.error(e);
                setError("Error cargando los datos de la nota.");
            } finally {
                setLoadingInitial(false);
            }
        };

        loadData();
    }, [isOpen, salidaId]);

    // Cargar stock al cambiar bodega
    useEffect(() => {
        if (!isOpen || !bodegaId) return;

        const loadStock = async () => {
            try {
                setLoadingStock(true);
                const r = await fetch(`${API_BASE}/bodegas/${bodegaId}/stock-terminado/`);
                if (!r.ok) throw new Error("Error cargando stock.");
                const d = await r.json();
                setStock(Array.isArray(d) ? d : []);
            } catch (e) {
                console.error(e);
                setError("Error cargando stock disponible.");
            } finally {
                setLoadingStock(false);
            }
        };

        loadStock();
    }, [isOpen, bodegaId]);

    const productosEnBodega = useMemo(() => {
        const map = new Map();
        // Sumar el stock actual de la nota de salida al stock disponible si es la misma bodega
        // (Para que el usuario vea cuánto habría si devuelve lo de esta nota)
        // Pero por simplicidad, mostramos el stock actual y confiamos en que el backend valide.
        for (const row of stock) {
            if (!row.producto_id) continue;
            if (!map.has(row.producto_id)) {
                map.set(row.producto_id, { producto_id: row.producto_id, producto_nombre: row.producto_nombre });
            }
        }
        // Asegurar que el producto actual esté en la lista aunque no tenga stock extra
        if (productoId && !map.has(productoId)) {
            map.set(productoId, { producto_id: productoId, producto_nombre: productoId });
        }
        return Array.from(map.values()).sort((a, b) => String(a.producto_id).localeCompare(String(b.producto_id)));
    }, [stock, productoId]);

    const tallasDisponiblesProducto = useMemo(() => {
        if (!productoId) return [];
        return stock
            .filter((r) => String(r?.producto_id) === String(productoId))
            .map((r) => ({
                talla_nombre: r?.talla || "—",
                cantidad: r?.cantidad,
            }))
            .sort((a, b) => String(a.talla_nombre).localeCompare(String(b.talla_nombre)));
    }, [stock, productoId]);

    const addLine = () => {
        setDetalleLines(prev => [...prev, { id: Date.now() + Math.random(), talla_nombre: "", cantidad: "1", costo_unitario: "" }]);
    };

    const removeLine = (id) => {
        setDetalleLines(prev => prev.filter(x => x.id !== id));
    };

    const updateLine = (id, field, value) => {
        setDetalleLines(prev => prev.map(x => x.id === id ? { ...x, [field]: value } : x));
    };

    const totalCantidad = useMemo(() => {
        return detalleLines.reduce((acc, l) => acc + Number(l.cantidad || 0), 0);
    }, [detalleLines]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const detalles = detalleLines
            .map(l => ({
                producto_id: String(productoId),
                talla: String(l.talla_nombre || "").trim(),
                cantidad: String(l.cantidad || "").trim(),
                costo_unitario: String(l.costo_unitario || "").trim(),
            }))
            .filter(d => d.talla && Number(d.cantidad || 0) > 0);

        if (detalles.length === 0) return setError("Agrega al menos una talla con cantidad > 0.");

        if (detalles.some(d => !d.costo_unitario || Number(d.costo_unitario) <= 0)) {
            return setError("Todas las líneas deben tener un precio unitario mayor a 0.");
        }

        const payload = {
            fecha,
            bodega_id: Number(bodegaId),
            tercero_id: Number(terceroId),
            observacion: observacion || "",
            detalles_input: detalles
        };

        try {
            setSaving(true);
            const r = await fetch(`${API_BASE}/salidas-producto/${salidaId}/`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!r.ok) {
                const data = await safeJson(r);
                throw new Error(data?.detail || JSON.stringify(data) || "No se pudo actualizar la salida.");
            }

            const updated = await r.json();
            if (onSaved) onSaved(updated);
        } catch (e) {
            console.error(e);
            setError(e.message || "Error actualizando salida.");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h1 className="text-sm font-semibold text-slate-900">Editar Nota de Salida</h1>
                        <p className="text-xs text-slate-500">Modifica los datos y cantidades de la salida.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onClose}
                            className="px-4 py-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="edit-salida-form"
                            disabled={saving || loadingInitial}
                            className="px-5 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 disabled:opacity-70"
                        >
                            {saving ? "Guardando..." : "Guardar Cambios"}
                        </button>
                    </div>
                </div>

                <form id="edit-salida-form" onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
                    {error && (
                        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 whitespace-pre-line">
                            {error}
                        </div>
                    )}

                    {loadingInitial ? (
                        <div className="py-20 text-center text-slate-500 animate-pulse">Cargando datos de la nota...</div>
                    ) : (
                        <>
                            {/* 1. Datos Generales */}
                            <section className="bg-white rounded-xl shadow-sm border border-slate-200">
                                <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div>
                                        <label className="text-xs font-medium text-slate-700">Fecha</label>
                                        <input type="date" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={fecha} onChange={e => setFecha(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-700">Bodega</label>
                                        <select className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={bodegaId} onChange={e => setBodegaId(e.target.value)}>
                                            {bodegas.map(b => (
                                                <option key={b.id} value={b.id}>{b.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-700">Tercero / Cliente</label>
                                        <select className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={terceroId} onChange={e => setTerceroId(e.target.value)}>
                                            {terceros.map(t => (
                                                <option key={t.id} value={t.id}>{t.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="text-xs font-medium text-slate-700">Observación</label>
                                        <input className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={observacion} onChange={e => setObservacion(e.target.value)} />
                                    </div>
                                </div>
                            </section>

                            {/* 2. Producto */}
                            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-medium text-slate-700">Producto</label>
                                        <select className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={productoId} onChange={e => setProductoId(e.target.value)}>
                                            {productosEnBodega.map(p => (
                                                <option key={p.producto_id} value={p.producto_id}>{p.producto_id} - {p.producto_nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Stock Disponible (Actual en Bodega)</div>
                                        <div className="space-y-1">
                                            {tallasDisponiblesProducto.map(t => (
                                                <div key={t.talla_nombre} className="flex justify-between text-xs">
                                                    <span>{t.talla_nombre}</span>
                                                    <span className="font-mono">{num(t.cantidad)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 3. Detalles */}
                            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <h2 className="text-sm font-semibold text-slate-900">Cantidades de Salida</h2>
                                    <button type="button" onClick={addLine} className="px-4 py-2 bg-blue-600 text-white text-[11px] font-bold rounded-lg uppercase tracking-wider">
                                        + Agregar Talla
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    {detalleLines.map(l => (
                                        <div key={l.id} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                                            <div className="md:col-span-12 lg:col-span-5">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Talla</label>
                                                <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white" value={l.talla_nombre} onChange={e => updateLine(l.id, "talla_nombre", e.target.value)}>
                                                    <option value="">Seleccionar...</option>
                                                    {tallasDisponiblesProducto.map(t => (
                                                        <option key={t.talla_nombre} value={t.talla_nombre}>{t.talla_nombre}</option>
                                                    ))}
                                                    {l.talla_nombre && !tallasDisponiblesProducto.find(x => x.talla_nombre === l.talla_nombre) && (
                                                        <option value={l.talla_nombre}>{l.talla_nombre} (actual)</option>
                                                    )}
                                                </select>
                                            </div>
                                            <div className="md:col-span-6 lg:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cantidad</label>
                                                <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-right bg-white" value={l.cantidad} onChange={e => updateLine(l.id, "cantidad", e.target.value)} />
                                            </div>
                                            <div className="md:col-span-6 lg:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Costo Unit.</label>
                                                <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-right bg-white" value={l.costo_unitario} onChange={e => updateLine(l.id, "costo_unitario", e.target.value)} />
                                            </div>
                                            <div className="md:col-span-6 lg:col-span-2 text-right">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Subtotal</label>
                                                <div className="py-2 text-xs font-bold text-blue-600">
                                                    {money(Number(l.cantidad || 0) * Number(l.costo_unitario || 0))}
                                                </div>
                                            </div>
                                            <div className="md:col-span-6 lg:col-span-1 flex justify-end">
                                                <button type="button" onClick={() => removeLine(l.id)} className="p-2 text-slate-400 hover:text-red-600" disabled={detalleLines.length === 1}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-100">
                                        <div className="text-xs text-slate-500">
                                            Total unidades: <span className="font-bold text-slate-900">{num(totalCantidad)}</span>
                                        </div>
                                        <div className="text-right text-sm">
                                            Total Nota: <span className="font-bold text-blue-700 text-lg ml-2">
                                                {money(detalleLines.reduce((acc, l) => acc + (Number(l.cantidad || 0) * Number(l.costo_unitario || 0)), 0))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
