import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";
import { safeJson, fetchAllPages } from "../utils/api";
import { formatCurrency } from "../utils/format";
import { Trash2 } from "lucide-react";
import SalidaProductoDocumento from "./SalidaProductoDocumento";

const todayISO = () => new Date().toISOString().slice(0, 10);

const num = (n) => formatCurrency(n);
const money = (n) => `$${formatCurrency(n)}`;

function FieldRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-xs font-semibold text-slate-900 dark:text-white text-right whitespace-pre-line">
        {value ?? "—"}
      </div>
    </div>
  );
}


export default function CreateSalidaProductoModal({ isOpen, onClose, onSaved }) {
  // catálogos
  const [bodegas, setBodegas] = useState([]);
  const [terceros, setTerceros] = useState([]);
  const [tallasCatalog, setTallasCatalog] = useState([]);

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
  const [detalleLines, setDetalleLines] = useState([
    { id: Date.now(), talla_nombre: "", cantidad: "1", costo_unitario: "" },
  ]);

  // ui
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // post guardado
  const [savedSalida, setSavedSalida] = useState(null);

  // ----------------- cargar catálogos al abrir -----------------
  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setSavedSalida(null);

    const load = async () => {
      try {
        setLoadingCatalogs(true);

        const [bodegasArr, tercerosArr, tallasArr] = await Promise.all([
          fetchAllPages(`${API_BASE}/bodegas/?page_size=200`),
          fetchAllPages(`${API_BASE}/terceros/?page_size=200`),
          fetchAllPages(`${API_BASE}/tallas/?page_size=200`),
        ]);

        const activeBodegas = bodegasArr.filter((x) => x.es_activo !== false);
        const activeTerceros = tercerosArr.filter((x) => x.es_activo !== false);
        const activeTallas = tallasArr.filter((x) => x.es_activo !== false);

        setBodegas(activeBodegas);
        setTerceros(activeTerceros);
        setTallasCatalog(activeTallas);

        // defaults
        setFecha(todayISO());
        setBodegaId(String(activeBodegas?.[0]?.id || ""));
        setTerceroId(String(activeTerceros?.[0]?.id || ""));
        setObservacion("");
        setDetalleLines([{ id: Date.now(), talla_nombre: "", cantidad: "1", costo_unitario: "" }]);
      } catch (e) {
        console.error(e);
        setError(e.message || "Error cargando catálogos.");
      } finally {
        setLoadingCatalogs(false);
      }
    };

    load();
  }, [isOpen]);

  // ----------------- cargar stock al cambiar bodega -----------------
  useEffect(() => {
    if (!isOpen) return;
    if (!bodegaId) return;

    const loadStock = async () => {
      try {
        setLoadingStock(true);
        setError("");

        const r = await fetch(`${API_BASE}/bodegas/${bodegaId}/stock-terminado/`);
        if (!r.ok) throw new Error("Error cargando stock terminado de la bodega.");
        const d = await r.json();

        // este endpoint devuelve array
        const arr = Array.isArray(d) ? d : [];
        setStock(arr);

        // reset al cambiar bodega
        setProductoId("");
        setDetalleLines([{ id: Date.now(), talla_nombre: "", cantidad: "1", costo_unitario: "" }]);
      } catch (e) {
        console.error(e);
        setError(e.message || "Error cargando stock.");
        setStock([]);
      } finally {
        setLoadingStock(false);
      }
    };

    loadStock();
  }, [isOpen, bodegaId]);

  // ---------- maps de tallas ----------
  // ----------------- productos disponibles en bodega (desde stock) -----------------
  const productosEnBodega = useMemo(() => {
    const map = new Map();
    for (const row of stock) {
      const sku = row?.producto_id;
      if (!sku) continue;
      if (!map.has(sku)) {
        map.set(sku, {
          producto_id: sku,
          producto_nombre: row?.producto_nombre || sku,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      String(a.producto_id).localeCompare(String(b.producto_id))
    );
  }, [stock]);

  const handleProductChange = (e) => {
    setProductoId(e.target.value);
    setDetalleLines([{ id: Date.now(), talla_nombre: "", cantidad: "1", costo_unitario: "" }]);
  };

  const productoNombre = useMemo(() => {
    if (!productoId) return "";
    return (
      productosEnBodega.find((p) => String(p.producto_id) === String(productoId))
        ?.producto_nombre || ""
    );
  }, [productosEnBodega, productoId]);

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

  // helpers líneas
  const addLine = () => {
    setDetalleLines((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), talla_nombre: "", cantidad: "1", costo_unitario: "" },
    ]);
  };

  const removeLine = (id) => {
    setDetalleLines((prev) => prev.filter((x) => x.id !== id));
  };

  const updateLine = (id, field, value) => {
    setDetalleLines((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  };

  const totalCantidad = useMemo(() => {
    return detalleLines.reduce((acc, l) => acc + Number(l.cantidad || 0), 0);
  }, [detalleLines]);

  // submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!fecha) return setError("Debes seleccionar la fecha.");
    if (!bodegaId) return setError("Debes seleccionar la bodega.");
    if (!terceroId) return setError("Debes seleccionar el tercero.");
    if (!productoId) return setError("Debes seleccionar un producto de la bodega.");

    const detalles = detalleLines
      .map((l) => ({
        producto_id: String(productoId),
        talla: String(l.talla_nombre || "").trim(),
        cantidad: String(l.cantidad || "").trim(),
        costo_unitario: String(l.costo_unitario || "").trim(),
      }))
      .filter((d) => d.talla && Number(d.cantidad || 0) > 0);

    if (detalles.length === 0) return setError("Agrega al menos una talla con cantidad > 0.");

    // Validar que todas tengan precio
    if (detalles.some(d => !d.costo_unitario || Number(d.costo_unitario) <= 0)) {
      return setError("Todas las líneas deben tener un precio unitario mayor a 0.");
    }

    const payload = {
      fecha,
      bodega_id: Number(bodegaId),
      tercero_id: Number(terceroId),
      observacion: observacion || "",
      detalles_input: detalles.map((d) => {
        const item = {
          producto_id: d.producto_id,
          talla: d.talla,
          cantidad: d.cantidad,
        };
        if (d.costo_unitario) item.costo_unitario = d.costo_unitario;
        return item;
      }),
    };

    try {
      setSaving(true);

      const r = await fetch(`${API_BASE}/salidas-producto/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const data = await safeJson(r);

        // errores esperados de stock
        if (data?.non_field_errors?.length) {
          throw new Error(data.non_field_errors.join("\n"));
        }

        if (data && typeof data === "object") {
          throw new Error(data.detail || JSON.stringify(data));
        }
        throw new Error("No se pudo crear la salida.");
      }

      const salida = await r.json();
      setSavedSalida(salida);
      if (onSaved) onSaved(salida);
    } catch (e2) {
      console.error(e2);
      setError(e2.message || "Error creando salida.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-white/10 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-slate-900 dark:text-white">Nueva Nota de Salida</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Registra la salida de producto terminado (Ventas, traslados externos, etc).
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>

            {!savedSalida && (
              <button
                type="submit"
                form="salida-form"
                disabled={saving}
                className="px-5 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 disabled:opacity-70"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            )}
          </div>
        </div>

        {savedSalida ? (
          <div className="px-6 py-5">
            <SalidaProductoDocumento
              salida={savedSalida}
              onClose={onClose}
              onCreateAnother={() => {
                setSavedSalida(null);
                setProductoId("");
                setDetalleLines([{ id: Date.now(), talla_nombre: "", cantidad: "1", costo_unitario: "" }]);
              }}
            />
          </div>
        ) : (
          <form id="salida-form" onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-xs text-red-700 dark:text-red-400 whitespace-pre-line">
                {error}
              </div>
            )}

            {/* 1. Cabecera */}
            <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Datos Generales</h2>
              </div>

              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Fecha</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    disabled={loadingCatalogs}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Bodega de Origen</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={bodegaId}
                    onChange={(e) => setBodegaId(e.target.value)}
                    disabled={loadingCatalogs}
                  >
                    <option value="">Seleccionar…</option>
                    {bodegas.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.codigo ? `${b.codigo} — ${b.nombre}` : b.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Tercero / Cliente</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={terceroId}
                    onChange={(e) => setTerceroId(e.target.value)}
                    disabled={loadingCatalogs}
                  >
                    <option value="">Seleccionar…</option>
                    {terceros.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.codigo ? `${t.codigo} — ${t.nombre}` : t.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Observación</label>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    placeholder="Ej: Salida por venta mostrador, despacho a tienda, etc..."
                  />
                </div>
              </div>
            </section>

            {/* 2. Selección de Producto */}
            <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Producto y Stock</h2>
              </div>

              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Seleccionar producto (disponible en bodega)
                  </label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={productoId}
                    onChange={handleProductChange}
                    disabled={!bodegaId || loadingStock}
                  >
                    <option value="">Seleccionar…</option>
                    {productosEnBodega.map((p) => (
                      <option key={p.producto_id} value={p.producto_id}>
                        {p.producto_id} — {p.producto_nombre}
                      </option>
                    ))}
                  </select>
                  {loadingStock && (
                    <p className="mt-1 text-[11px] text-blue-500 animate-pulse">Cargando stock de la bodega…</p>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">Resumen Selección</div>
                  <div className="space-y-2 text-slate-700 dark:text-slate-300">
                    <FieldRow label="SKU" value={productoId || "—"} />
                    <FieldRow label="Nombre" value={productoNombre || "—"} />
                  </div>
                </div>
              </div>

              {productoId && (
                <div className="px-6 pb-6">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="bg-slate-100/50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 px-4 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase grid grid-cols-12 gap-2">
                      <div className="col-span-8">Talla</div>
                      <div className="col-span-4 text-right">Disponible</div>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {tallasDisponiblesProducto.map((t) => (
                        <div key={t.talla_nombre} className="px-4 py-2 text-xs grid grid-cols-12 gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <div className="col-span-8 font-medium text-slate-900 dark:text-slate-100">{t.talla_nombre}</div>
                          <div className="col-span-4 text-right text-slate-700 dark:text-slate-400 font-mono italic">{num(t.cantidad)}</div>
                        </div>
                      ))}

                      {tallasDisponiblesProducto.length === 0 && (
                        <div className="px-4 py-4 text-xs text-slate-500 italic text-center text-red-500">
                          ⚠️ No hay stock registrado para este producto en esta bodega.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* 3. Detalle de Salida */}
            <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Tallas y Cantidades</h2>
                <button
                  type="button"
                  onClick={addLine}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
                  disabled={!productoId || loadingStock}
                >
                  ＋ Agregar Talla
                </button>
              </div>

              <div className="px-6 py-6 space-y-4">
                {!productoId ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                    <p className="text-xs text-slate-400">Seleccione un producto para configurar las cantidades de salida.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {detalleLines.map((l) => (
                        <div key={l.id} className="group relative bg-slate-50/30 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/10 dark:hover:bg-blue-900/10 transition-all">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-5">
                              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 mb-1 block">Talla</label>
                              <select
                                className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                value={l.talla_nombre}
                                onChange={(e) => updateLine(l.id, "talla_nombre", e.target.value)}
                              >
                                <option value="">Seleccionar talla…</option>
                                {tallasDisponiblesProducto.map((t) => (
                                  <option key={t.talla_nombre} value={t.talla_nombre}>
                                    {t.talla_nombre} (Disponible: {num(t.cantidad)})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 mb-1 block">Cantidad</label>
                              <input
                                className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                value={l.cantidad}
                                onChange={(e) => updateLine(l.id, "cantidad", e.target.value)}
                                placeholder="0"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 mb-1 block">Costo unit.</label>
                              <input
                                className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                value={l.costo_unitario}
                                onChange={(e) => updateLine(l.id, "costo_unitario", e.target.value)}
                                placeholder="0"
                              />
                            </div>

                            <div className="md:col-span-2 text-right">
                              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mr-1 mb-1 block">Subtotal</label>
                              <div className="py-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                                {money(Number(l.cantidad || 0) * Number(l.costo_unitario || 0))}
                              </div>
                            </div>

                            <div className="md:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeLine(l.id)}
                                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                                disabled={detalleLines.length === 1}
                                title="Eliminar línea"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between px-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Total unidades: <span className="font-bold text-slate-900 dark:text-white">{num(totalCantidad)}</span>
                      </div>
                      <div className="text-right text-sm text-slate-700 dark:text-slate-300">
                        Total Nota: <span className="font-bold text-blue-700 dark:text-blue-400 text-lg ml-2">
                          {money(detalleLines.reduce((acc, l) => acc + (Number(l.cantidad || 0) * Number(l.costo_unitario || 0)), 0))}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </form>
        )}
      </div>
    </div>
  );
}
