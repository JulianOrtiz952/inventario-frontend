import { useEffect, useMemo, useState } from "react";
import CreateNotaEnsambleModal from "../components/CreateNotaEnsambleModal"; // ajusta ruta si aplica

const API_BASE = "http://127.0.0.1:8000/api";
const PAGE_SIZE = 30;

const nf = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const num = (n) => nf.format(Number(n || 0));

function asRows(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}

export default function NotasEnsamblePage() {
  const [notas, setNotas] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editNotaId, setEditNotaId] = useState(null);

  // filtros (por ahora: sobre la página actual)
  const [q, setQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // detalle seleccionado
  const [selectedNotaId, setSelectedNotaId] = useState(null);
  const [selectedNota, setSelectedNota] = useState(null);

  // ------------------ helpers ------------------
  const getBodegaLabel = (nota) => {
    const b = nota?.bodega;
    if (b?.codigo) return `${b.codigo} — ${b.nombre}`;
    if (b?.nombre) return b.nombre;
    if (nota?.bodega_id) return String(nota.bodega_id);
    return "—";
  };

  const getTerceroLabel = (nota) => {
    const t = nota?.tercero;
    if (t?.codigo) return `${t.codigo} — ${t.nombre}`;
    if (t?.nombre) return t.nombre;
    if (nota?.tercero_id) return String(nota.tercero_id);
    return "—";
  };

  const getProductosResumen = (nota) => {
    const det = Array.isArray(nota?.detalles) ? nota.detalles : [];
    if (det.length === 0) return "—";

    const uniq = [];
    const seen = new Set();
    for (const d of det) {
      const sku = d?.producto?.codigo_sku || d?.producto_id || "";
      const name = d?.producto?.nombre || "";
      const key = `${sku}::${name}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniq.push({ sku, name });
      }
    }

    if (uniq.length === 0) return "—";
    if (uniq.length === 1) return `${uniq[0].sku}${uniq[0].name ? ` — ${uniq[0].name}` : ""}`;
    return `${uniq[0].sku}${uniq[0].name ? ` — ${uniq[0].name}` : ""} (+${uniq.length - 1})`;
  };

  const getTotalCantidad = (nota) => {
    const det = Array.isArray(nota?.detalles) ? nota.detalles : [];
    return det.reduce((acc, d) => acc + Number(d?.cantidad || 0), 0);
  };

  // ------------------ loaders ------------------
  const loadNotas = async (targetPage = 1) => {
    setError("");
    setSuccess("");

    try {
      setLoading(true);
      const r = await fetch(`${API_BASE}/notas-ensamble/?page=${targetPage}&page_size=${PAGE_SIZE}`);
      if (!r.ok) throw new Error("Error cargando notas de ensamble.");
      const d = await r.json();

      setNotas(asRows(d));
      setCount(Number(d?.count || 0));
      setNextUrl(d?.next || null);
      setPrevUrl(d?.previous || null);
      setPage(targetPage);
    } catch (e) {
      console.error(e);
      setError(e.message || "Error cargando notas.");
      setNotas([]);
      setCount(0);
      setNextUrl(null);
      setPrevUrl(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotas(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDetalle = async (id) => {
    setError("");
    setSuccess("");
    setSelectedNotaId(id);
    setSelectedNota(null);

    try {
      setLoadingDetalle(true);
      const r = await fetch(`${API_BASE}/notas-ensamble/${id}/`);
      if (!r.ok) throw new Error("No se pudo cargar el detalle de la nota.");
      const d = await r.json();
      setSelectedNota(d);
    } catch (e) {
      console.error(e);
      setError(e.message || "Error cargando detalle.");
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleOpenEdit = async (id) => {
    setEditNotaId(id);
    setIsEditOpen(true);
    if (selectedNotaId === id) await loadDetalle(id);
  };

  const handleDelete = async (id) => {
    setError("");
    setSuccess("");

    const ok = window.confirm(
      "¿Eliminar esta nota de ensamble?\nEsto debería revertir stock e insumos automáticamente."
    );
    if (!ok) return;

    try {
      const r = await fetch(`${API_BASE}/notas-ensamble/${id}/`, { method: "DELETE" });

      if (!r.ok) {
        const data = await r.json().catch(() => null);
        throw new Error(data?.detail || "No se pudo eliminar la nota.");
      }

      setSuccess("Nota eliminada. Stock revertido (según lógica del backend).");

      if (selectedNotaId === id) {
        setSelectedNotaId(null);
        setSelectedNota(null);
      }

      // ✅ si borraste el último de la página, intenta ir a la anterior
      const newCount = Math.max(0, count - 1);
      const maxPage = Math.max(1, Math.ceil(newCount / PAGE_SIZE));
      const target = Math.min(page, maxPage);

      await loadNotas(target);
      setCount(newCount);
    } catch (e) {
      console.error(e);
      setError(e.message || "Error eliminando nota.");
    }
  };

  // ------------------ filtros (página actual) ------------------
  const notasFiltradas = useMemo(() => {
    const text = q.trim().toLowerCase();

    return notas.filter((n) => {
      const prod = getProductosResumen(n).toLowerCase();
      const bod = getBodegaLabel(n).toLowerCase();
      const ter = getTerceroLabel(n).toLowerCase();

      const matchText =
        !text ||
        prod.includes(text) ||
        bod.includes(text) ||
        ter.includes(text) ||
        String(n.id || "").includes(text);

      const fe = n.fecha_elaboracion ? String(n.fecha_elaboracion) : "";
      const afterFrom = !fromDate || (fe && fe >= fromDate);
      const beforeTo = !toDate || (fe && fe <= toDate);

      return matchText && afterFrom && beforeTo;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notas, q, fromDate, toDate]);

  // ------------------ paginación UI ------------------
  const goPrev = async () => {
    if (!prevUrl || loading) return;
    await loadNotas(Math.max(1, page - 1));
  };

  const goNext = async () => {
    if (!nextUrl || loading) return;
    await loadNotas(page + 1);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 lg:p-8 bg-slate-50 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Notas de Ensamble</h1>
              <p className="text-sm text-slate-500">
                Crear actualiza stock y descuenta insumos. Editar revierte y reaplica (según backend). Eliminar revierte.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadNotas(page)}
                className="px-4 py-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                disabled={loading}
              >
                {loading ? "Actualizando…" : "Actualizar"}
              </button>

              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
              >
                + Nueva nota
              </button>
            </div>
          </div>

          {(error || success) && (
            <div className="space-y-2">
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 whitespace-pre-line">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">
                  {success}
                </div>
              )}
            </div>
          )}

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Filtros</h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-700">
                  Buscar (producto, bodega, tercero, id)
                </label>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ej: CAM-002, Taller, 8…"
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  *Por ahora filtra solo lo cargado en la página actual.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Desde</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Hasta</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>

          {/* ✅ Barra de paginación */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Total: <b>{count}</b> • Página <b>{page}</b>
              <span className="ml-2 text-[11px] text-slate-400">(mostrando {PAGE_SIZE} por página)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!prevUrl || loading}
                onClick={goPrev}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs disabled:opacity-50 hover:bg-slate-50"
              >
                ← Anterior
              </button>
              <button
                type="button"
                disabled={!nextUrl || loading}
                onClick={goNext}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs disabled:opacity-50 hover:bg-slate-50"
              >
                Siguiente →
              </button>
            </div>
          </div>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* LISTADO */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Listado ({notasFiltradas.length})
                </h2>
                <p className="text-[11px] text-slate-500">Ver / Editar / Eliminar</p>
              </div>

              <div className="overflow-auto">
                {notasFiltradas.length === 0 ? (
                  <div className="p-5 text-sm text-slate-500">
                    {loading ? "Cargando…" : "No hay notas en esta página."}
                  </div>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="px-3 py-2 text-left">ID</th>
                        <th className="px-3 py-2 text-left">Fecha</th>
                        <th className="px-3 py-2 text-left">Productos</th>
                        <th className="px-3 py-2 text-left">Bodega</th>
                        <th className="px-3 py-2 text-left">Tercero</th>
                        <th className="px-3 py-2 text-right">Líneas</th>
                        <th className="px-3 py-2 text-right">Cant. total</th>
                        <th className="px-3 py-2 text-center">Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {notasFiltradas.map((n) => {
                        const active = selectedNotaId === n.id;
                        const detCount = Array.isArray(n.detalles) ? n.detalles.length : 0;
                        const totalCant = getTotalCantidad(n);

                        return (
                          <tr
                            key={n.id}
                            className={`border-b border-slate-100 hover:bg-slate-50/80 ${
                              active ? "bg-blue-50/50" : ""
                            }`}
                          >
                            <td className="px-3 py-2 text-slate-700 font-medium">{n.id}</td>
                            <td className="px-3 py-2 text-slate-600">{n.fecha_elaboracion || "—"}</td>
                            <td className="px-3 py-2 text-slate-700">{getProductosResumen(n)}</td>
                            <td className="px-3 py-2 text-slate-700">{getBodegaLabel(n)}</td>
                            <td className="px-3 py-2 text-slate-700">{getTerceroLabel(n)}</td>
                            <td className="px-3 py-2 text-right text-slate-700">{detCount}</td>
                            <td className="px-3 py-2 text-right text-slate-700">{num(totalCant)}</td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => loadDetalle(n.id)}
                                  className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] text-slate-700 hover:bg-slate-50"
                                >
                                  Ver
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(n.id)}
                                  className="px-2 py-1 rounded-md border border-blue-200 bg-blue-50 text-[11px] text-blue-700 hover:bg-blue-100"
                                >
                                  Editar
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(n.id)}
                                  className="px-2 py-1 rounded-md border border-red-200 bg-red-50 text-[11px] text-red-700 hover:bg-red-100"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* DETALLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Detalle</h2>
                {selectedNotaId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNotaId(null);
                      setSelectedNota(null);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              <div className="px-5 py-4">
                {!selectedNotaId ? (
                  <div className="text-xs text-slate-500">Selecciona una nota y presiona Ver.</div>
                ) : loadingDetalle ? (
                  <div className="text-xs text-slate-500">Cargando detalle…</div>
                ) : !selectedNota ? (
                  <div className="text-xs text-slate-500">No hay detalle para mostrar.</div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">ID</span>
                        <span className="font-semibold text-slate-900">{selectedNota.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Fecha</span>
                        <span className="text-slate-800">{selectedNota.fecha_elaboracion || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Bodega</span>
                        <span className="text-slate-800">{getBodegaLabel(selectedNota)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tercero</span>
                        <span className="text-slate-800">{getTerceroLabel(selectedNota)}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-slate-600 mb-1">Observaciones</p>
                      <div className="rounded-md border border-slate-200 p-3 text-xs text-slate-700">
                        {selectedNota.observaciones?.trim() ? selectedNota.observaciones : "—"}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-slate-600 mb-1">Productos terminados</p>

                      <div className="rounded-md border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase grid grid-cols-12 gap-2">
                          <div className="col-span-7">Producto</div>
                          <div className="col-span-3">Talla</div>
                          <div className="col-span-2 text-right">Cantidad</div>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {(Array.isArray(selectedNota.detalles) ? selectedNota.detalles : []).map((d) => (
                            <div key={d.id} className="px-3 py-2 grid grid-cols-12 gap-2 text-xs">
                              <div className="col-span-7 font-medium text-slate-900">
                                {d?.producto?.codigo_sku
                                  ? `${d.producto.codigo_sku} — ${d.producto.nombre || ""}`
                                  : String(d?.producto_id || "—")}
                              </div>
                              <div className="col-span-3 text-slate-700">
                                {d?.talla?.nombre || (d?.talla_id ? String(d.talla_id) : "—")}
                              </div>
                              <div className="col-span-2 text-right font-semibold">
                                {num(d?.cantidad || 0)}
                              </div>
                            </div>
                          ))}

                          {(!selectedNota.detalles || selectedNota.detalles.length === 0) && (
                            <div className="px-3 py-3 text-xs text-slate-500">—</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(selectedNota.id)}
                        className="w-full px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                      >
                        Editar nota
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(selectedNota.id)}
                        className="w-full px-4 py-2 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* CREATE */}
      <CreateNotaEnsambleModal
        isOpen={isCreateOpen}
        mode="create"
        onClose={() => setIsCreateOpen(false)}
        onSaved={async () => {
          await loadNotas(page);
        }}
      />

      {/* EDIT */}
      <CreateNotaEnsambleModal
        isOpen={isEditOpen}
        mode="edit"
        notaId={editNotaId}
        onClose={() => {
          setIsEditOpen(false);
          setEditNotaId(null);
        }}
        onSaved={async (nota) => {
          await loadNotas(page);
          if (selectedNotaId === nota?.id) await loadDetalle(nota.id);
        }}
      />
    </div>
  );
}
