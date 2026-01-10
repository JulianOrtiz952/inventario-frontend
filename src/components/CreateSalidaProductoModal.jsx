import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";
import { asRows, safeJson, fetchAllPages } from "../utils/api";

const todayISO = () => new Date().toISOString().slice(0, 10);

const nfNum = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const num = (n) => nfNum.format(Number(n || 0));



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

/** Vista de “documento” post-guardado */
function SalidaDocumento({ salida, onClose }) {
  const abrirPDF = () => {
    if (!salida?.id) return;
    window.open(`${API_BASE}/salidas-producto/${salida.id}/pdf/`, "_blank", "noopener,noreferrer");
  };

  const imprimir = () => window.print();

  const getBodegaLabel = () => {
    const b = salida?.bodega;
    if (b?.codigo) return `${b.codigo} — ${b.nombre}`;
    if (b?.nombre) return b.nombre;
    return "—";
  };

  const getTerceroLabel = () => {
    const t = salida?.tercero;
    if (!t) return "—";
    if (t?.codigo) return `${t.codigo} — ${t.nombre}`;
    if (t?.nombre) return t.nombre;
    return "—";
  };

  const numero = salida?.numero || `SP-${salida?.id ?? "—"}`;

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

      <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Salida creada: <span className="text-blue-700">{numero}</span>
          </h2>
          <p className="text-xs text-slate-500">Lista para PDF (backend) o imprimir.</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={abrirPDF}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
          >
            Abrir PDF
          </button>
          <button
            type="button"
            onClick={imprimir}
            className="px-4 py-2 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
          >
            Imprimir
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>

      <div className="print-area rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <div className="text-xs font-semibold text-slate-900">CALA</div>
              <div className="text-[11px] text-slate-500">Nota de salida</div>
            </div>

            <div className="text-[11px] text-slate-600 md:text-center">
              <div className="font-semibold text-slate-900">Salida de producto terminado</div>
              <div>{numero}</div>
            </div>

            <div className="md:text-right">
              <div className="text-xs font-semibold text-slate-900">{salida?.fecha || "—"}</div>
              <div className="text-[11px] text-slate-500">{getBodegaLabel()}</div>
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
              <div className="text-xs font-semibold text-slate-900 mb-3">Observación</div>
              <div className="text-xs text-slate-700 whitespace-pre-line">
                {salida?.observacion?.trim() ? salida.observacion : "—"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="text-xs font-semibold text-slate-900">Detalle</div>
            </div>

            <div className="overflow-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-white border-b border-slate-200">
                  <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-left">Talla</th>
                    <th className="px-3 py-2 text-right">Cantidad</th>
                    <th className="px-3 py-2 text-right">Costo unit.</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(Array.isArray(salida?.detalles) ? salida.detalles : []).map((d, idx) => (
                    <tr key={d.id || idx}>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {d?.producto?.codigo_sku || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{d?.producto?.nombre || "—"}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {d?.talla?.nombre || d?.talla || "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">
                        {num(d?.cantidad || 0)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {d?.costo_unitario != null ? num(d.costo_unitario) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {d?.total != null ? num(d.total) : "—"}
                      </td>
                    </tr>
                  ))}
                  {(!salida?.detalles || salida.detalles.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-3 py-3 text-xs text-slate-500">
                        — No hay detalles —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <div>Generado desde Inventario.</div>
            <div>{salida?.creado_en || ""}</div>
          </div>
        </div>
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
    { id: Date.now(), tallaId: "", cantidad: "1", costo_unitario: "" },
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

        setBodegas(bodegasArr);
        setTerceros(tercerosArr);
        setTallasCatalog(tallasArr);

        // defaults
        setFecha(todayISO());
        setBodegaId(String(bodegasArr?.[0]?.id || ""));
        setTerceroId(String(tercerosArr?.[0]?.id || ""));
        setObservacion("");
        setProductoId("");
        setStock([]);
        setDetalleLines([{ id: Date.now(), tallaId: "", cantidad: "1", costo_unitario: "" }]);
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
        setDetalleLines([{ id: Date.now(), tallaId: "", cantidad: "1", costo_unitario: "" }]);
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
  const tallaNombreById = useMemo(() => {
    const m = new Map();
    for (const t of tallasCatalog) {
      if (t?.id == null) continue;
      m.set(Number(t.id), t?.nombre ?? `Talla #${t.id}`);
    }
    return m;
  }, [tallasCatalog]);

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

  const productoNombre = useMemo(() => {
    if (!productoId) return "";
    return (
      productosEnBodega.find((p) => String(p.producto_id) === String(productoId))
        ?.producto_nombre || ""
    );
  }, [productosEnBodega, productoId]);

  // ----------------- tallas disponibles para el producto (desde stock) -----------------
  const tallasDisponiblesProducto = useMemo(() => {
    if (!productoId) return [];
    return stock
      .filter((r) => String(r?.producto_id) === String(productoId))
      .map((r) => {
        const talla_id = Number(r?.talla); // 👈 stock-terminado devuelve ID
        return {
          talla_id,
          talla_nombre: tallaNombreById.get(talla_id) || `Talla #${talla_id}`,
          cantidad: r?.cantidad,
        };
      })
      .sort((a, b) => String(a.talla_nombre).localeCompare(String(b.talla_nombre)));
  }, [stock, productoId, tallaNombreById]);

  // helpers líneas
  const addLine = () => {
    setDetalleLines((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), tallaId: "", cantidad: "1", costo_unitario: "" },
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
        talla_id: Number(l.tallaId),
        cantidad: String(l.cantidad || "").trim(),
        costo_unitario: String(l.costo_unitario || "").trim(),
      }))
      .filter((d) => d.talla_id && Number(d.cantidad || 0) > 0);

    if (detalles.length === 0) return setError("Agrega al menos una talla con cantidad > 0.");

    const payload = {
      fecha,
      bodega_id: Number(bodegaId),
      tercero_id: Number(terceroId),
      observacion: observacion || "",
      detalles_input: detalles.map((d) => {
        const item = {
          producto_id: d.producto_id,
          // 👇 backend espera FK: por eso enviamos el ID numérico
          talla: d.talla_id,
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
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-slate-900">Nueva Nota de Salida</h1>
            <p className="text-xs text-slate-500">
              Elige bodega → producto → tallas (según stock). Enviamos talla_id (FK) al backend.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
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
                className="px-5 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-70"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            )}
          </div>
        </div>

        {savedSalida ? (
          <div className="px-6 py-5">
            <SalidaDocumento salida={savedSalida} onClose={onClose} />
          </div>
        ) : (
          <form id="salida-form" onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 whitespace-pre-line">
                {error}
              </div>
            )}

            {/* Cabecera */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">Datos de la salida</h2>
              </div>

              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">Fecha</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    disabled={loadingCatalogs}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">Bodega</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
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
                  <p className="mt-1 text-[11px] text-slate-400">
                    {loadingStock ? "Cargando stock-terminado…" : `Items stock-terminado: ${stock.length}`}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">Tercero</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
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

                <div className="md:col-span-4">
                  <label className="text-xs font-medium text-slate-700">Observación</label>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    placeholder="Ej: Salida por venta mostrador…"
                  />
                </div>
              </div>
            </section>

            {/* Producto desde stock de bodega */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">Producto (según bodega)</h2>
              </div>

              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Seleccionar producto en esta bodega
                  </label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={productoId}
                    onChange={(e) => setProductoId(e.target.value)}
                    disabled={!bodegaId || loadingStock}
                  >
                    <option value="">Seleccionar…</option>
                    {productosEnBodega.map((p) => (
                      <option key={p.producto_id} value={p.producto_id}>
                        {p.producto_id} — {p.producto_nombre}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-400">
                    *Esta lista sale de <code>/bodegas/{`{id}`}/stock-terminado/</code>
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 p-4 space-y-2">
                  <div className="text-xs font-semibold text-slate-900">Resumen</div>
                  <FieldRow label="SKU" value={productoId || "—"} />
                  <FieldRow label="Nombre" value={productoNombre || "—"} />
                  <FieldRow label="Tallas disponibles" value={productoId ? tallasDisponiblesProducto.length : "—"} />
                </div>
              </div>

              {productoId && (
                <div className="px-6 pb-4">
                  <div className="rounded-md border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase grid grid-cols-12 gap-2">
                      <div className="col-span-6">Talla</div>
                      <div className="col-span-6 text-right">Stock disponible</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {tallasDisponiblesProducto.map((t) => (
                        <div key={t.talla_id} className="px-4 py-2 text-xs grid grid-cols-12 gap-2">
                          <div className="col-span-6 font-medium text-slate-900">{t.talla_nombre}</div>
                          <div className="col-span-6 text-right text-slate-700">{num(t.cantidad)}</div>
                        </div>
                      ))}

                      {tallasDisponiblesProducto.length === 0 && (
                        <div className="px-4 py-3 text-xs text-slate-500">— Sin tallas —</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Detalle */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Detalle (tallas a descontar)</h2>
                <button
                  type="button"
                  onClick={addLine}
                  className="px-3 py-2 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-60"
                  disabled={!productoId}
                >
                  + Agregar talla
                </button>
              </div>

              <div className="px-6 py-4 space-y-3">
                {!productoId ? (
                  <div className="text-xs text-slate-500">Selecciona primero un producto.</div>
                ) : (
                  <>
                    {detalleLines.map((l) => (
                      <div key={l.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                          <div className="md:col-span-5">
                            <label className="text-xs font-medium text-slate-700">Talla</label>
                            <select
                              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                              value={l.tallaId}
                              onChange={(e) => updateLine(l.id, "tallaId", e.target.value)}
                            >
                              <option value="">Seleccionar…</option>
                              {tallasDisponiblesProducto.map((t) => (
                                <option key={t.talla_id} value={t.talla_id}>
                                  {t.talla_nombre} (stock: {num(t.cantidad)})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-3">
                            <label className="text-xs font-medium text-slate-700">Cantidad</label>
                            <input
                              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-right"
                              value={l.cantidad}
                              onChange={(e) => updateLine(l.id, "cantidad", e.target.value)}
                            />
                          </div>

                          <div className="md:col-span-3">
                            <label className="text-xs font-medium text-slate-700">Costo unitario (opcional)</label>
                            <input
                              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-right"
                              value={l.costo_unitario}
                              onChange={(e) => updateLine(l.id, "costo_unitario", e.target.value)}
                              placeholder="Ej: 45000.00"
                            />
                          </div>

                          <div className="md:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeLine(l.id)}
                              className="px-3 py-2 rounded-md border border-red-200 bg-red-50 text-xs text-red-700 hover:bg-red-100 disabled:opacity-60"
                              disabled={detalleLines.length === 1}
                              title="Eliminar línea"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="text-xs text-slate-600">
                      Total unidades a sacar: <b className="text-slate-900">{num(totalCantidad)}</b>
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
