import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE = "http://127.0.0.1:8000/api";
const todayISO = () => new Date().toISOString().slice(0, 10);

// Formato Colombia
const nfNum = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const nfMoney = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const num = (n) => nfNum.format(Number(n || 0));
const money = (n) => `$${nfMoney.format(Number(n || 0))}`;

// ✅ Logo temporal (cámbialo luego por el tuyo)
const TEMP_LOGO_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/640px-Placeholder_view_vector.svg.png";

function asRows(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}

async function safeJson(res) {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

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

function NotaDocumento({ nota, mode, onClose, onCreateAnother }) {
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

  // ✅ Descarga PDF (captura el documento y lo convierte a PDF)
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
            {mode === "edit" ? "Nota actualizada" : "Nota creada"}:{" "}
            <span className="text-blue-700">{notaCode}</span>
          </h2>
          <p className="text-xs text-slate-500">
            Vista tipo documento (lista para imprimir o descargar en PDF).
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={descargarPDF}
            disabled={downloading}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-70"
          >
            {downloading ? "Generando PDF…" : "Descargar PDF"}
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

          <button
            type="button"
            onClick={onCreateAnother}
            className="px-4 py-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {mode === "edit" ? "Volver" : "Crear otra"}
          </button>
        </div>
      </div>

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
                      <td colSpan={4} className="px-3 py-3 text-xs text-slate-500">
                        — No hay detalles —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                    <th className="px-3 py-2 text-right">Cantidad requerida</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {(Array.isArray(nota?.insumos) ? nota.insumos : []).map((i) => (
                    <tr key={i.id}>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {i?.insumo?.codigo || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{i?.insumo?.nombre || "—"}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {i?.insumo?.bodega?.nombre || "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">
                        {num(i?.cantidad || 0)}
                      </td>
                    </tr>
                  ))}

                  {(!nota?.insumos || nota.insumos.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-xs text-slate-500">
                        — No hay insumos manuales —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
  const [detalleLines, setDetalleLines] = useState([{ id: Date.now(), talla_id: "", cantidad: "1" }]);

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

  const getTallaById = (id) => tallas.find((t) => String(t.id) === String(id)) || null;

  const getInsumoByCodigo = (codigo) =>
    insumos.find((i) => String(i.codigo) === String(codigo)) || null;

  const productoSeleccionado = useMemo(
    () => getProductoBySku(productoId),
    [productoId, productos]
  );

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

        // ✅ pedimos grande para que no te limite la paginación
        const qs = `?page_size=1000`;

        const [rProd, rBod, rTal, rTer, rIns] = await Promise.all([
          fetch(`${API_BASE}/productos/${qs}`),
          fetch(`${API_BASE}/bodegas/${qs}`),
          fetch(`${API_BASE}/tallas/${qs}`),
          fetch(`${API_BASE}/terceros/${qs}`),
          fetch(`${API_BASE}/insumos/${qs}`),
        ]);

        if (!rProd.ok) throw new Error("Error cargando productos.");
        if (!rBod.ok) throw new Error("Error cargando bodegas.");
        if (!rTal.ok) throw new Error("Error cargando tallas.");
        if (!rTer.ok) throw new Error("Error cargando terceros.");
        if (!rIns.ok) throw new Error("Error cargando insumos.");

        const [dProd, dBod, dTal, dTer, dIns] = await Promise.all([
          rProd.json(),
          rBod.json(),
          rTal.json(),
          rTer.json(),
          rIns.json(),
        ]);

        // ✅ soporta paginado o lista
        setProductos(asRows(dProd));
        setBodegas(asRows(dBod));
        setTallas(asRows(dTal));
        setTerceros(asRows(dTer));
        setInsumos(asRows(dIns));
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
      setDetalleLines([{ id: Date.now(), talla_id: "", cantidad: "1" }]);
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
                talla_id: String(d?.talla?.id || d?.talla_id || ""),
                cantidad: String(d?.cantidad ?? "1"),
              }))
            );
          } else {
            setDetalleLines([{ id: Date.now(), talla_id: "", cantidad: "1" }]);
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
      { id: Date.now() + Math.random(), talla_id: "", cantidad: "1" },
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
        talla_id: l.talla_id ? Number(l.talla_id) : null,
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
        talla_id: d.talla_id,
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
            <NotaDocumento
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
                setDetalleLines([{ id: Date.now(), talla_id: "", cantidad: "1" }]);
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
                  const talla = getTallaById(l.talla_id);

                  return (
                    <div key={l.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-6">
                          <label className="text-xs font-medium text-slate-700">Talla</label>
                          <select
                            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                            value={l.talla_id}
                            onChange={(e) => updateDetalleLine(l.id, "talla_id", e.target.value)}
                            disabled={loading || loadingNota}
                          >
                            <option value="">—</option>
                            {tallas.map((t) => (
                              <option key={t.id} value={t.id}>
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
                  const ins = getInsumoByCodigo(l.insumo_codigo);
                  const bRef = ins?.bodega?.nombre || (ins?.bodega_id ? String(ins.bodega_id) : "—");
                  const cu = Number(ins?.costo_unitario || 0);
                  const q = Number(l.cantidad_req || 0);
                  const totalUnit = cu * q;
                  const totalAll = totalUnit * Number(totalCantidadProductos || 0);

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
                            {insumos.map((i) => (
                              <option key={i.codigo} value={i.codigo}>
                                {i.codigo} — {i.nombre}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-xs font-medium text-slate-700">Bodega ref.</label>
                          <input
                            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-slate-50"
                            value={bRef}
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
                            <div className="text-[11px] text-slate-500">Descripción</div>
                            <div className="font-semibold text-slate-900">{ins?.descripcion || "—"}</div>
                          </div>

                          <div className="rounded-md bg-slate-50 border border-slate-100 p-3">
                            <div className="text-[11px] text-slate-500">Referencia</div>
                            <div className="font-semibold text-slate-900">{ins?.referencia || "—"}</div>
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
