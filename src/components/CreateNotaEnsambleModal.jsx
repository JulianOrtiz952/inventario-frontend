import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";
import { safeJson, fetchAllPages } from "../utils/api";
import NotaEnsambleDocumento from "./NotaEnsambleDocumento";
import { formatCurrency } from "../utils/format";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function CreateNotaEnsambleModal({
  isOpen,
  onClose,
  onSaved,
  mode = "create",
  notaId = null,
}) {
  const num = (n) => formatCurrency(n);
  const money = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return `$${formatCurrency(n)}`;
  };
  // catálogos
  const [productos, setProductos] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [tallas, setTallas] = useState([]);
  const [terceros, setTerceros] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [operadores, setOperadores] = useState([]);

  // producto cabecera
  const [productoId, setProductoId] = useState("");

  // form cabecera
  const [bodegaDestinoId, setBodegaDestinoId] = useState("");
  const [terceroId, setTerceroId] = useState("");
  const [fechaElaboracion, setFechaElaboracion] = useState(todayISO());
  const [observaciones, setObservaciones] = useState("");
  const [operadorId, setOperadorId] = useState("");
  const [costoServicio, setCostoServicio] = useState("");

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

        const [dProd, dBod, dTal, dTer, dIns, dOpe] = await Promise.all([
          fetchAllPages(`${API_BASE}/productos/?page_size=200`),
          fetchAllPages(`${API_BASE}/bodegas/?page_size=200`),
          fetchAllPages(`${API_BASE}/tallas/?page_size=200`),
          fetchAllPages(`${API_BASE}/terceros/?page_size=200`),
          fetchAllPages(`${API_BASE}/insumos/?page_size=200`),
          fetchAllPages(`${API_BASE}/operadores/?page_size=200`),
        ]);

        setProductos(dProd.filter((x) => x.es_activo !== false));
        setBodegas(dBod.filter((x) => x.es_activo !== false));
        setTallas(dTal.filter((x) => x.es_activo !== false));
        setTerceros(dTer.filter((x) => x.es_activo !== false));
        setInsumos(dIns.filter((x) => x.es_activo !== false));
        setOperadores(dOpe.filter((x) => x.es_activo !== false));
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
      setOperadorId("");
      setCostoServicio("");
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
          const opId = n?.operador?.id ?? n?.operador_id ?? "";
          setOperadorId(opId ? String(opId) : "");
          setCostoServicio(n?.costo_servicio ? String(n.costo_servicio) : "");

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

    // ✅ Nueva validación: Asegurar que todas las líneas con cantidad tengan talla
    if (detallesValidos.some(d => !d.talla_nombre)) {
      return setError("Todas las líneas de productos deben tener una talla seleccionada.");
    }

    if (detallesValidos.some(d => Number(d.cantidad) % 1 !== 0)) {
      return setError("La cantidad de productos ensamblados debe ser un número entero (sin decimales).");
    }

    const insumosValidos = insumoLines
      .map((l) => ({
        insumo_codigo: String(l.insumo_codigo || "").trim(),
        cantidad: String(l.cantidad_req ?? "0").trim(),
      }))
      .filter((i) => i.insumo_codigo && Number(i.cantidad || 0) > 0);

    if (insumosValidos.length === 0)
      return setError("Debes agregar al menos un insumo con cantidad > 0.");

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
      operador_id: operadorId ? Number(operadorId) : null,
      costo_servicio: costoServicio ? Number(costoServicio) : 0,
    };

    if (!payload.tercero_id) delete payload.tercero_id;
    payload.detalles_input = payload.detalles_input.map((d) => {
      const nd = { ...d };
      if (nd.talla_id === null) delete nd.talla_id;
      return nd;
    });
    if (!payload.insumos_input?.length) delete payload.insumos_input;
    if (payload.operador_id === null) delete payload.operador_id;

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
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-all animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-white/10 dark:border-slate-800">
        <div className="no-print px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 transition-colors">
          <div>
            <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100 italic">
              {mode === "edit" ? "Editar Nota de Ensamble" : "Nueva Nota de Ensamble"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cabecera + tallas/cantidades + insumos manuales (por unidad).
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
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
                className="px-5 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 disabled:opacity-70 transition-all active:scale-95 shadow-blue-500/20"
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
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                {error && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-4 py-3 text-xs text-red-700 dark:text-red-400 whitespace-pre-line flex items-start gap-2">
                    <span className="flex-shrink-0">⚠️</span>
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
                    <span className="flex-shrink-0">✅</span>
                    {success}
                  </div>
                )}
              </div>
            )}

            {(loading || loadingNota) && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-xs text-slate-600 dark:text-slate-400 animate-pulse">
                Cargando…
              </div>
            )}

            {/* Producto */}
            <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Producto
                </h2>
              </div>

              <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Seleccionar producto
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
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

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">SKU</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{productoSeleccionado?.codigo_sku || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Referencia</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {productoSeleccionado?.datos_adicionales?.referencia ||
                          productoSeleccionado?.codigo_sku ||
                          "—"}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Nombre</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{productoSeleccionado?.nombre || "—"}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Descripción</div>
                      <div className="leading-relaxed text-slate-600 dark:text-slate-400 mt-0.5">
                        {productoSeleccionado?.datos_adicionales?.descripcion || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Datos nota */}
            <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Datos de la Nota
                </h2>
              </div>

              <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Bodega
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Fecha
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={fechaElaboracion}
                    onChange={(e) => setFechaElaboracion(e.target.value)}
                    disabled={loading || loadingNota}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Tercero (opcional)
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Observaciones
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Opcional…"
                    disabled={loading || loadingNota}
                  />
                </div>
              </div>
            </section>

            {/* Servicio Operador (Opcional) */}
            <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Servicio de Operador (Opcional)
                </h2>
              </div>

              <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Operador / Taller Externo
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    value={operadorId}
                    onChange={(e) => setOperadorId(e.target.value)}
                    disabled={loading || loadingNota}
                  >
                    <option value="">— Ninguno —</option>
                    {operadores.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.codigo} — {op.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Valor del Servicio (Costo Total)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-7 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium tabular-nums"
                      value={costoServicio}
                      onChange={(e) => setCostoServicio(e.target.value)}
                      placeholder="0.00"
                      disabled={loading || loadingNota}
                    />
                  </div>
                  {operadorId && !costoServicio && (
                    <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                      <span>⚠️</span> Si seleccionas un operador, debes asignar el costo del servicio.
                    </p>
                  )}
                </div>
              </div>
            </section>
            <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/30">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Productos terminados (tallas)
                </h2>
                <button
                  type="button"
                  onClick={addDetalleLine}
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white transition-all shadow-sm active:scale-95"
                  disabled={loading || loadingNota}
                >
                  + Agregar talla
                </button>
              </div>

              <div className="px-6 py-4 space-y-3">
                {detalleLines.map((l) => {
                  const talla = getTallaByNombre(l.talla_nombre);

                  return (
                    <div key={l.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/30 dark:bg-slate-800/20 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-6">
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Talla</label>
                          <select
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
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
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider text-right">Cantidad (Entero)</label>
                          <input
                            type="number"
                            step="1"
                            onKeyDown={(e) => {
                              if (e.key === "." || e.key === "," || e.key === "e" || e.key === "E") {
                                e.preventDefault();
                              }
                            }}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-right font-medium tabular-nums"
                            value={l.cantidad}
                            onChange={(e) => updateDetalleLine(l.id, "cantidad", e.target.value)}
                            disabled={loading || loadingNota}
                          />
                        </div>

                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeDetalleLine(l.id)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                            disabled={detalleLines.length === 1}
                            title="Eliminar línea"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 shadow-sm">
                          <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Producto</div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-1">
                            {productoSeleccionado?.codigo_sku
                              ? `${productoSeleccionado.codigo_sku} — ${productoSeleccionado.nombre || ""}`
                              : "—"}
                          </div>
                        </div>

                        <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 shadow-sm">
                          <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Talla</div>
                          <div className="font-semibold">{talla?.nombre || "—"}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Total productos a ensamblar:{" "}
                  <span className="text-slate-900 dark:text-slate-100 font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{num(totalCantidadProductos)}</span>
                </div>
              </div>
            </section>

            {/* Insumos manuales */}
            <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/30">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  Insumos manuales (por unidad)
                </h2>
                <button
                  type="button"
                  onClick={addInsumoLine}
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white transition-all shadow-sm active:scale-95"
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
                    <div key={l.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/30 dark:bg-slate-800/20 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-6">
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Insumo</label>
                          <select
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            value={l.insumo_codigo}
                            onChange={(e) => updateInsumoLine(l.id, "insumo_codigo", e.target.value)}
                            disabled={loading || loadingNota}
                          >
                            <option value="">Seleccionar…</option>
                            {insumosAgrupados.map((i) => (
                              <option key={i.codigo} value={i.codigo}>
                                {i.codigo} — {i.nombre} (Stock: {num(i.stock_global)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 mb-1 uppercase tracking-wider">Cant. Total Nota</label>
                          <input
                            className="w-full rounded-lg border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 text-sm font-bold text-indigo-700 dark:text-indigo-400 outline-none transition-all tabular-nums"
                            value={num(totalCantidadNota)}
                            readOnly
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider text-right">Cant. requerida</label>
                          <input
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-right font-medium tabular-nums"
                            value={l.cantidad_req}
                            onChange={(e) => updateInsumoLine(l.id, "cantidad_req", e.target.value)}
                            disabled={loading || loadingNota}
                          />
                        </div>

                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeInsumoLine(l.id)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                            disabled={insumoLines.length === 1}
                            title="Eliminar insumo"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                        <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 shadow-sm">
                          <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Stock Global</div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-1">
                            {num(insGroup?.stock_global)} {insGroup?.unidad_medida || ""}
                          </div>
                        </div>

                        <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 shadow-sm">
                          <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Referencia</div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{insGroup?.referencia || "—"}</div>
                        </div>

                        <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 shadow-sm">
                          <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Costo unitario</div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{money(cu)}</div>
                        </div>

                        <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 shadow-sm">
                          <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Total (unidad / nota)</div>
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                            {money(totalUnit)} / {money(totalAll)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Informe de costos */}
            <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  Informe de costos
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 ml-4">
                  Desglose de costos de insumos y servicios de operación.
                </p>
              </div>

              <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 p-4 shadow-sm">
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total productos</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">{num(totalCantidadProductos)}</div>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 p-4 shadow-sm">
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Costo Insumos</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">{money(costoInsumosTotal)}</div>
                </div>

                <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 p-4 shadow-sm md:col-span-1">
                  <div className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Costo Servicio</div>
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">{money(costoServicio || 0)}</div>
                </div>

                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 p-4 shadow-sm md:col-span-1">
                  <div className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">TOTAL Nota</div>
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 tabular-nums">
                    {money(Number(costoInsumosTotal) + Number(costoServicio || 0))}
                  </div>
                </div>
              </div>

              {costoServicio > 0 && totalCantidadProductos > 0 && (
                <div className="px-6 pb-5 pt-0">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 text-[11px] text-blue-700 dark:text-blue-300 transition-all animate-in slide-in-from-left-2 duration-300">
                    💡 Costo promedio del servicio por producto: <b>{money(Number(costoServicio) / totalCantidadProductos)}</b>
                  </div>
                </div>
              )}
            </section>
          </form>
        )}
      </div>
    </div >
  );
}
