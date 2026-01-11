import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";
import { safeJson, fetchAllPages } from "../utils/api";
import NotaEnsambleDocumento from "./NotaEnsambleDocumento";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function CreateNotaEnsambleModal({
  isOpen,
  onClose,
  onSaved,
  mode = "create",
  notaId = null,
}) {
  // catálogos
  const [productos, setProductos] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [tallas, setTallas] = useState([]);
  const [terceros, setTerceros] = useState([]);
  const [insumos, setInsumos] = useState([]);

  // producto cabecera
  const [productoId, setProductoId] = useState("");

  // form cabecera
  const [bodegaDestinoId, setBodegaDestinoId] = useState("");
  const [terceroId, setTerceroId] = useState("");
  const [fechaElaboracion, setFechaElaboracion] = useState(todayISO());
  const [observaciones, setObservaciones] = useState("");

  // detalles
  const [detalleLines, setDetalleLines] = useState([{ id: Date.now(), talla_nombre: "", cantidad: "1" }]);

  // insumos manuales
  const [insumoLines, setInsumoLines] = useState([
    { id: Date.now() + 1, insumo_codigo: "", cantidad_req: "0" },
  ]);

  // ui
  const [loading, setLoading] = useState(false);
  const [loadingNota, setLoadingNota] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ documento post-guardado
  const [savedNota, setSavedNota] = useState(null);

  const getProductoBySku = (sku) =>
    productos.find((p) => String(p.codigo_sku) === String(sku)) || null;

  const getTallaByNombre = (nombre) => tallas.find((t) => String(t.nombre) === String(nombre)) || null;

  const getInsumoByCodigo = (codigo) =>
    insumos.find((i) => String(i.codigo) === String(codigo)) || null;

  const productoSeleccionado = useMemo(
    () => getProductoBySku(productoId),
    [productoId, productos]
  );

  // ✅ Insumos agrupados por código para mostrar stock global
  const insumosAgrupados = useMemo(() => {
    const map = new Map();
    for (const i of insumos) {
      if (!map.has(i.codigo)) {
        map.set(i.codigo, {
          ...i,
          stock_global: 0,
        });
      }
      const existing = map.get(i.codigo);
      existing.stock_global += Number(i.cantidad || 0);
    }
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [insumos]);

  const getInsumoAgrupadoByCodigo = (codigo) =>
    insumosAgrupados.find((i) => String(i.codigo) === String(codigo)) || null;

  const totalCantidadProductos = useMemo(() => {
    return detalleLines.reduce((acc, l) => acc + Number(l.cantidad || 0), 0);
  }, [detalleLines]);

  const costoInsumosUnitario = useMemo(() => {
    return insumoLines.reduce((acc, l) => {
      if (!l.insumo_codigo) return acc;
      const ins = getInsumoByCodigo(l.insumo_codigo);
      const cu = Number(ins?.costo_unitario || 0);
      const q = Number(l.cantidad_req || 0);
      return acc + cu * q;
    }, 0);
  }, [insumoLines, insumos]);

  const costoInsumosTotal = useMemo(() => {
    return costoInsumosUnitario * Number(totalCantidadProductos || 0);
  }, [costoInsumosUnitario, totalCantidadProductos]);

  const costoPromedioPorProducto = useMemo(() => {
    const totalQty = Number(totalCantidadProductos || 0);
    if (!totalQty) return 0;
    return costoInsumosTotal / totalQty;
  }, [costoInsumosTotal, totalCantidadProductos]);

  // cargar catálogos
  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setSuccess("");
    setSavedNota(null);

    const loadCatalogs = async () => {
      try {
        setLoading(true);

        const [dProd, dBod, dTal, dTer, dIns] = await Promise.all([
          fetchAllPages(`${API_BASE}/productos/?page_size=200`),
          fetchAllPages(`${API_BASE}/bodegas/?page_size=200`),
          fetchAllPages(`${API_BASE}/tallas/?page_size=200`),
          fetchAllPages(`${API_BASE}/terceros/?page_size=200`),
          fetchAllPages(`${API_BASE}/insumos/?page_size=200`),
        ]);

        setProductos(dProd.filter((x) => x.es_activo !== false));
        setBodegas(dBod.filter((x) => x.es_activo !== false));
        setTallas(dTal.filter((x) => x.es_activo !== false));
        setTerceros(dTer.filter((x) => x.es_activo !== false));
        setInsumos(dIns.filter((x) => x.es_activo !== false));
      } catch (e) {
        console.error(e);
        setError(e.message || "Error cargando catálogos.");
      } finally {
        setLoading(false);
      }
    };

    loadCatalogs();
  }, [isOpen]);

  // cargar nota si edit
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "create") {
      setProductoId("");
      setBodegaDestinoId("");
      setTerceroId("");
      setFechaElaboracion(todayISO());
      setObservaciones("");
      setDetalleLines([{ id: Date.now(), talla_nombre: "", cantidad: "1" }]);
      setInsumoLines([{ id: Date.now() + 1, insumo_codigo: "", cantidad_req: "0" }]);
      return;
    }

    if (mode === "edit" && notaId) {
      const loadNota = async () => {
        try {
          setLoadingNota(true);
          setError("");
          setSuccess("");
          setSavedNota(null);

          const r = await fetch(`${API_BASE}/notas-ensamble/${notaId}/`);
          if (!r.ok) throw new Error("No se pudo cargar la nota para editar.");
          const n = await r.json();

          const bId = n?.bodega?.id ?? n?.bodega_id ?? "";
          const tId = n?.tercero?.id ?? n?.tercero_id ?? "";
          setBodegaDestinoId(bId ? String(bId) : "");
          setTerceroId(tId ? String(tId) : "");
          setFechaElaboracion(n?.fecha_elaboracion || todayISO());
          setObservaciones(n?.observaciones || "");

          const det = Array.isArray(n?.detalles) ? n.detalles : [];
          const sku = det?.[0]?.producto?.codigo_sku || det?.[0]?.producto_id || "";
          setProductoId(sku ? String(sku) : "");

          if (det.length > 0) {
            setDetalleLines(
              det.map((d) => ({
                id: d.id || Date.now() + Math.random(),
                talla_nombre: String(d?.talla?.nombre || d?.talla || ""),
                cantidad: String(d?.cantidad ?? "1"),
              }))
            );
          } else {
            setDetalleLines([{ id: Date.now(), talla_nombre: "", cantidad: "1" }]);
          }

          const ins = Array.isArray(n?.insumos) ? n.insumos : [];
          if (ins.length > 0) {
            setInsumoLines(
              ins.map((i) => ({
                id: i.id || Date.now() + Math.random(),
                insumo_codigo: String(i?.insumo?.codigo || i?.insumo || i?.insumo_codigo || ""),
                cantidad_req: String(i?.cantidad ?? "0"),
              }))
            );
          } else {
            setInsumoLines([{ id: Date.now() + 1, insumo_codigo: "", cantidad_req: "0" }]);
          }
        } catch (e) {
          console.error(e);
          setError(e.message || "Error cargando nota.");
        } finally {
          setLoadingNota(false);
        }
      };

      loadNota();
    }
  }, [isOpen, mode, notaId]);

  // CRUD detalles
  const addDetalleLine = () => {
    setDetalleLines((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), talla_nombre: "", cantidad: "1" },
    ]);
  };
  const removeDetalleLine = (id) => setDetalleLines((prev) => prev.filter((x) => x.id !== id));
  const updateDetalleLine = (id, field, value) =>
    setDetalleLines((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

  // CRUD insumos
  const addInsumoLine = () => {
    setInsumoLines((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), insumo_codigo: "", cantidad_req: "0" },
    ]);
  };
  const removeInsumoLine = (id) => setInsumoLines((prev) => prev.filter((x) => x.id !== id));
  const updateInsumoLine = (id, field, value) =>
    setInsumoLines((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

  // submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSavedNota(null);

    if (!productoId) return setError("Debes seleccionar el producto.");
    if (!bodegaDestinoId) return setError("Debes seleccionar la bodega.");
    if (!fechaElaboracion) return setError("Debes seleccionar la fecha.");

    const detallesValidos = detalleLines
      .map((l) => ({
        talla_nombre: l.talla_nombre ? String(l.talla_nombre).trim() : null,
        cantidad: String(l.cantidad ?? "").trim(),
      }))
      .filter((d) => Number(d.cantidad || 0) > 0);

    if (detallesValidos.length === 0)
      return setError("Debes agregar al menos una talla con cantidad > 0.");

    const insumosValidos = insumoLines
      .map((l) => ({
        insumo_codigo: String(l.insumo_codigo || "").trim(),
        cantidad: String(l.cantidad_req ?? "0").trim(),
      }))
      .filter((i) => i.insumo_codigo && Number(i.cantidad || 0) > 0);

    const payload = {
      bodega_id: Number(bodegaDestinoId),
      tercero_id: terceroId ? Number(terceroId) : null,
      fecha_elaboracion: fechaElaboracion,
      observaciones: observaciones || "",
      detalles_input: detallesValidos.map((d) => ({
        producto_id: String(productoId),
        talla_id: d.talla_nombre,
        cantidad: d.cantidad,
      })),
      insumos_input: insumosValidos,
    };

    if (!payload.tercero_id) delete payload.tercero_id;
    payload.detalles_input = payload.detalles_input.map((d) => {
      const nd = { ...d };
      if (nd.talla_id === null) delete nd.talla_id;
      return nd;
    });
    if (!payload.insumos_input?.length) delete payload.insumos_input;

    try {
      setSaving(true);

      const url =
        mode === "edit" && notaId
          ? `${API_BASE}/notas-ensamble/${notaId}/`
          : `${API_BASE}/notas-ensamble/`;
      const method = mode === "edit" ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const data = await safeJson(r);

        if (data?.stock_insuficiente) {
          const items = Object.values(data.stock_insuficiente);
          const msg = items
            .map(
              (x) =>
                `• ${x.insumo}: disponible ${x.disponible}, requerido ${x.requerido}, faltante ${x.faltante}`
            )
            .join("\n");
          throw new Error(`Stock insuficiente:\n${msg}`);
        }

        if (data?.code === "NOTA_CON_TRASLADOS") {
          throw new Error(data.detail);
        }
        if (data && typeof data === "object") {
          throw new Error(data.detail || JSON.stringify(data));
        }
        throw new Error("No se pudo guardar la nota.");
      }

      const nota = await r.json();

      setSavedNota(nota);
      setSuccess(mode === "edit" ? "Nota actualizada correctamente." : "Nota creada correctamente.");
      if (onSaved) onSaved(nota, mode);
    } catch (e2) {
      console.error(e2);
      setError(e2.message || "Error guardando nota.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <div className="no-print px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-slate-900">
              {mode === "edit" ? "Editar Nota de Ensamble" : "Nueva Nota de Ensamble"}
            </h1>
            <p className="text-xs text-slate-500">
              Cabecera + tallas/cantidades + insumos manuales (por unidad).
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>

            {!savedNota && (
              <button
                type="submit"
                form="nota-ensamble-form"
                disabled={saving}
                className="px-5 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 disabled:opacity-70"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            )}
          </div>
        </div>

        {savedNota ? (
          <div className="px-6 py-5">
            <NotaEnsambleDocumento
              nota={savedNota}
              mode={mode}
              onClose={onClose}
              onCreateAnother={() => {
                if (mode === "edit") {
                  setSavedNota(null);
                  setSuccess("");
                  setError("");
                  return;
                }

                setSavedNota(null);
                setSuccess("");
                setError("");
                setProductoId("");
                setBodegaDestinoId("");
                setTerceroId("");
                setFechaElaboracion(todayISO());
                setObservaciones("");
                setDetalleLines([{ id: Date.now(), talla_nombre: "", cantidad: "1" }]);
                setInsumoLines([{ id: Date.now() + 1, insumo_codigo: "", cantidad_req: "0" }]);
              }}
            />
          </div>
        ) : (
          <form id="nota-ensamble-form" onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
            {(error || success) && (
              <div className="space-y-2">
                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 whitespace-pre-line">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-700">
                    {success}
                  </div>
                )}
              </div>
            )}

            {(loading || loadingNota) && (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Cargando…
              </div>
            )}

            {/* Producto */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">Producto</h2>
              </div>

              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">Seleccionar producto</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={productoId}
                    onChange={(e) => setProductoId(e.target.value)}
                    disabled={loading || loadingNota}
                  >
                    <option value="">Seleccionar…</option>
                    {productos.map((p) => (
                      <option key={p.codigo_sku} value={p.codigo_sku}>
                        {p.codigo_sku} — {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[11px] text-slate-500">SKU</div>
                      <div className="font-semibold">{productoSeleccionado?.codigo_sku || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Referencia</div>
                      <div className="font-semibold">
                        {productoSeleccionado?.datos_adicionales?.referencia ||
                          productoSeleccionado?.codigo_sku ||
                          "—"}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[11px] text-slate-500">Nombre</div>
                      <div className="font-semibold">{productoSeleccionado?.nombre || "—"}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[11px] text-slate-500">Descripción</div>
                      <div className="font-semibold">
                        {productoSeleccionado?.datos_adicionales?.descripcion || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Datos nota */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">Datos de la Nota</h2>
              </div>

              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">Bodega</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={bodegaDestinoId}
                    onChange={(e) => setBodegaDestinoId(e.target.value)}
                    disabled={loading || loadingNota}
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
                  <label className="text-xs font-medium text-slate-700">Fecha</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={fechaElaboracion}
                    onChange={(e) => setFechaElaboracion(e.target.value)}
                    disabled={loading || loadingNota}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">Tercero (opcional)</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={terceroId}
                    onChange={(e) => setTerceroId(e.target.value)}
                    disabled={loading || loadingNota}
                  >
                    <option value="">—</option>
                    {terceros.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.codigo ? `${t.codigo} — ${t.nombre}` : t.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="text-xs font-medium text-slate-700">Observaciones</label>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Opcional…"
                    disabled={loading || loadingNota}
                  />
                </div>
              </div>
            </section>

            {/* Detalles */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Productos terminados (tallas)</h2>
                <button
                  type="button"
                  onClick={addDetalleLine}
                  className="px-3 py-2 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
                  disabled={loading || loadingNota}
                >
                  + Agregar talla
                </button>
              </div>

              <div className="px-6 py-4 space-y-3">
                {detalleLines.map((l) => {
                  const talla = getTallaByNombre(l.talla_nombre);

                  return (
                    <div key={l.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-6">
                          <label className="text-xs font-medium text-slate-700">Talla</label>
                          <select
                            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                            value={l.talla_nombre}
                            onChange={(e) => updateDetalleLine(l.id, "talla_nombre", e.target.value)}
                            disabled={loading || loadingNota}
                          >
                            <option value="">—</option>
                            {tallas.map((t) => (
                              <option key={t.nombre} value={t.nombre}>
                                {t.nombre}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-5">
                          <label className="text-xs font-medium text-slate-700">Cantidad</label>
                          <input
                            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-right"
                            value={l.cantidad}
                            onChange={(e) => updateDetalleLine(l.id, "cantidad", e.target.value)}
                            disabled={loading || loadingNota}
                          />
                        </div>

                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeDetalleLine(l.id)}
                            className="px-3 py-2 rounded-md border border-red-200 bg-red-50 text-xs text-red-700 hover:bg-red-100"
                            disabled={detalleLines.length === 1}
                            title="Eliminar línea"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
                        <div className="rounded-md bg-slate-50 border border-slate-100 p-3">
                          <div className="text-[11px] text-slate-500">Producto</div>
                          <div className="font-semibold">
                            {productoSeleccionado?.codigo_sku
                              ? `${productoSeleccionado.codigo_sku} — ${productoSeleccionado.nombre || ""}`
                              : "—"}
                          </div>
                        </div>

                        <div className="rounded-md bg-slate-50 border border-slate-100 p-3">
                          <div className="text-[11px] text-slate-500">Talla</div>
                          <div className="font-semibold">{talla?.nombre || "—"}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="text-xs text-slate-600">
                  Total productos a ensamblar:{" "}
                  <b className="text-slate-900">{num(totalCantidadProductos)}</b>
                </div>
              </div>
            </section>

            {/* Insumos manuales */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Insumos manuales (por unidad)</h2>
                <button
                  type="button"
                  onClick={addInsumoLine}
                  className="px-3 py-2 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
                  disabled={loading || loadingNota}
                >
                  + Agregar insumo
                </button>
              </div>

              <div className="px-6 py-4 space-y-3">
                {insumoLines.map((l) => {
                  const insGroup = getInsumoAgrupadoByCodigo(l.insumo_codigo);
                  const cu = Number(insGroup?.costo_unitario || 0);
                  const q = Number(l.cantidad_req || 0);
                  const totalUnit = cu * q;
                  const totalAll = totalUnit * Number(totalCantidadProductos || 0);
                  const totalCantidadNota = q * Number(totalCantidadProductos || 0);

                  return (
                    <div key={l.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-6">
                          <label className="text-xs font-medium text-slate-700">Insumo</label>
                          <select
                            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                            value={l.insumo_codigo}
                            onChange={(e) => updateInsumoLine(l.id, "insumo_codigo", e.target.value)}
                            disabled={loading || loadingNota}
                          >
                            <option value="">Seleccionar…</option>
                            {insumosAgrupados.map((i) => (
                              <option key={i.codigo} value={i.codigo}>
                                {i.codigo} — {i.nombre} (Stock Global: {num(i.stock_global)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-xs font-medium text-slate-700">Cant. Total Nota</label>
                          <input
                            className="mt-1 w-full rounded-md border border-indigo-200 px-3 py-2 text-sm bg-indigo-50 font-bold text-indigo-700"
                            value={num(totalCantidadNota)}
                            readOnly
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="text-xs font-medium text-slate-700">Cant. requerida</label>
                          <input
                            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-right"
                            value={l.cantidad_req}
                            onChange={(e) => updateInsumoLine(l.id, "cantidad_req", e.target.value)}
                            disabled={loading || loadingNota}
                          />
                        </div>

                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeInsumoLine(l.id)}
                            className="px-3 py-2 rounded-md border border-red-200 bg-red-50 text-xs text-red-700 hover:bg-red-100"
                            disabled={insumoLines.length === 1}
                            title="Eliminar insumo"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                          <div className="rounded-md bg-slate-50 border border-slate-100 p-3">
                            <div className="text-[11px] text-slate-500">Global Stock</div>
                            <div className="font-semibold text-slate-900">
                              {num(insGroup?.stock_global)} {insGroup?.unidad_medida || ""}
                            </div>
                          </div>

                          <div className="rounded-md bg-slate-50 border border-slate-100 p-3">
                            <div className="text-[11px] text-slate-500">Referencia</div>
                            <div className="font-semibold text-slate-900">{insGroup?.referencia || "—"}</div>
                          </div>

                          <div className="rounded-md bg-slate-50 border border-slate-100 p-3">
                            <div className="text-[11px] text-slate-500">Costo unitario</div>
                            <div className="font-semibold text-slate-900">{money(cu)}</div>
                          </div>

                          <div className="rounded-md bg-slate-50 border border-slate-100 p-3">
                            <div className="text-[11px] text-slate-500">Total (por unidad / por nota)</div>
                            <div className="font-semibold text-slate-900">
                              {money(totalUnit)} / {money(totalAll)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Informe de costos */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">Informe de costos</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Basado en insumos manuales (por unidad) × total de productos terminados.
                </p>
              </div>

              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="rounded-md bg-slate-50 border border-slate-100 p-3">
                  <div className="text-[11px] text-slate-500">Total productos</div>
                  <div className="text-lg font-semibold text-slate-900">{num(totalCantidadProductos)}</div>
                </div>

                <div className="rounded-md bg-slate-50 border border-slate-100 p-3">
                  <div className="text-[11px] text-slate-500">Costo insumos por unidad</div>
                  <div className="text-lg font-semibold text-slate-900">{money(costoInsumosUnitario)}</div>
                </div>

                <div className="rounded-md bg-slate-50 border border-slate-100 p-3">
                  <div className="text-[11px] text-slate-500">Costo total insumos (nota)</div>
                  <div className="text-lg font-semibold text-slate-900">{money(costoInsumosTotal)}</div>
                </div>

                <div className="rounded-md bg-slate-50 border border-slate-100 p-3">
                  <div className="text-[11px] text-slate-500">Costo promedio por producto</div>
                  <div className="text-lg font-semibold text-slate-900">{money(costoPromedioPorProducto)}</div>
                </div>
              </div>
            </section>
          </form>
        )}
      </div>
    </div>
  );
}
