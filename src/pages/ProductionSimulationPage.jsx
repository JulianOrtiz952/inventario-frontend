// src/pages/ProductionSimulationPage.jsx
import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";


export default function ProductionSimulationPage() {
  const [recetas, setRecetas] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [historial, setHistorial] = useState([]);

  const [selectedRecetaId, setSelectedRecetaId] = useState("");
  const [cantidadDeseada, setCantidadDeseada] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [results, setResults] = useState(null); // { items, summary, unidades }
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [creating, setCreating] = useState(false);

  const [factibilidadCalculada, setFactibilidadCalculada] = useState(false);
  const [factible, setFactible] = useState(false);

  // Cargar recetas, insumos e historial
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [resRecetas, resInsumos, resHistorial] = await Promise.all([
          fetch(`${API_BASE}/recetas/`),
          fetch(`${API_BASE}/insumos/`),
          fetch(`${API_BASE}/producciones/`),
        ]);

        if (!resRecetas.ok) throw new Error("Error al cargar recetas.");
        if (!resInsumos.ok) throw new Error("Error al cargar insumos.");
        if (!resHistorial.ok) throw new Error("Error al cargar historial.");

        const [dataRecetas, dataInsumos, dataHistorial] = await Promise.all([
          resRecetas.json(),
          resInsumos.json(),
          resHistorial.json(),
        ]);

        setRecetas(dataRecetas);
        setInsumos(dataInsumos);
        setHistorial(dataHistorial);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error cargando datos.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Mapa de insumos por ID
  const insumosMap = useMemo(() => {
    const map = {};
    insumos.forEach((i) => {
      map[i.id] = i;
    });
    return map;
  }, [insumos]);

  const selectedReceta =
    recetas.find((r) => String(r.id) === String(selectedRecetaId)) || null;

  // -------------------------
  // Calcular factibilidad
  // -------------------------
  async function handleCalcular(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setResults(null);
    setFactibilidadCalculada(false);
    setFactible(false);

    if (!selectedReceta) {
      setError("Debes seleccionar una receta de producción.");
      return;
    }

    const unidades = Number(cantidadDeseada);
    if (!unidades || unidades <= 0) {
      setError("Ingresa una cantidad deseada mayor a 0.");
      return;
    }

    if (!selectedReceta.items || selectedReceta.items.length === 0) {
      setError("La receta seleccionada no tiene insumos configurados.");
      return;
    }

    try {
      setCalculating(true);

      const itemsResult = selectedReceta.items.map((item) => {
        const cantidadRequerida = Number(item.cantidad || 0) * unidades;

        const insumoId = item.insumo?.id ?? item.insumo_id;
        const insumoInfo = insumosMap[insumoId] || {};

        const stockDisponible = Number(insumoInfo.stock_actual || 0);
        const faltante =
          cantidadRequerida > stockDisponible
            ? cantidadRequerida - stockDisponible
            : 0;

        const estado = faltante > 0 ? "Insuficiente" : "Disponible";

        return {
          id: insumoId,
          nombre: insumoInfo.nombre || item.insumo?.nombre || "—",
          unidad: insumoInfo.unidad || item.unidad || "—",
          cantidadRequerida,
          stockDisponible,
          faltante,
          estado,
        };
      });

      const total = itemsResult.length;
      const disponibles = itemsResult.filter((i) => i.faltante <= 0).length;
      const faltantes = total - disponibles;
      const pctDisponibles = total ? (disponibles / total) * 100 : 0;

      const resumen = {
        total,
        disponibles,
        faltantes,
        pctDisponibles,
      };

      setResults({
        items: itemsResult,
        summary: resumen,
        unidades,
      });

      setFactibilidadCalculada(true);
      setFactible(faltantes === 0);

      if (faltantes > 0) {
        setError(
          "La simulación muestra insumos insuficientes. No se puede crear el producto."
        );
      }
    } catch (err) {
      console.error(err);
      setError("Error al calcular factibilidad.");
    } finally {
      setCalculating(false);
    }
  }

  // -------------------------
  // Crear producto (descontar stock + historial)
  // -------------------------
  async function handleCrearProducto() {
    setError("");
    setSuccess("");

    if (!selectedReceta || !factibilidadCalculada || !factible || !results) {
      setError(
        "Primero calcula la factibilidad y asegúrate de que no haya insumos faltantes."
      );
      return;
    }

    const unidades = results.unidades;
    if (!unidades || unidades <= 0) {
      setError("Cantidad inválida.");
      return;
    }

    try {
      setCreating(true);

      const res = await fetch(
        `${API_BASE}/recetas/${selectedReceta.id}/producir/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cantidad: unidades }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Error produciendo:", data);
        if (data.insumos) {
          setError(
            "El stock cambió y ya no es suficiente para crear el producto."
          );
        } else {
          setError(data.detail || "Error al crear el producto.");
        }
        return;
      }

      const data = await res.json();

      // Actualizar insumos con el nuevo stock
      if (Array.isArray(data.insumos_actualizados)) {
        setInsumos((prev) =>
          prev.map((ins) => {
            const updated = data.insumos_actualizados.find(
              (u) => u.id === ins.id
            );
            return updated
              ? { ...ins, stock_actual: updated.stock_actual }
              : ins;
          })
        );
      }

      // Refrescar historial (o podríamos solo insertar el nuevo delante)
      try {
        const resHist = await fetch(`${API_BASE}/producciones/`);
        if (resHist.ok) {
          const dataHist = await resHist.json();
          setHistorial(dataHist);
        }
      } catch (err) {
        console.error("Error refrescando historial", err);
      }

      setSuccess("Producto creado y stock de insumos actualizado.");
    } catch (err) {
      console.error(err);
      setError("Error al crear el producto.");
    } finally {
      setCreating(false);
    }
  }

  const botonCrearDisabled =
    !factibilidadCalculada || !factible || !results || creating;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header principal */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Simulación de Factibilidad
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Verifica la disponibilidad de insumos y crea productos a partir de una receta.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-50"
        >
          <span className="text-slate-500 text-sm">🕒</span>
          Historial
        </button>
      </div>

      {/* Configuración + Resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Configuración */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <span className="text-indigo-500 text-lg">🧪</span>
            <h2 className="text-sm font-semibold text-slate-900">
              Configuración de Simulación
            </h2>
          </div>

          <form className="px-6 py-4 space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-700">
                {success}
              </div>
            )}

            {loading ? (
              <p className="text-xs text-slate-500">
                Cargando recetas, insumos e historial...
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Receta */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Receta de Producción
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      value={selectedRecetaId}
                      onChange={(e) => {
                        setSelectedRecetaId(e.target.value);
                        // Si cambia la receta, se resetea la factibilidad
                        setFactibilidadCalculada(false);
                        setFactible(false);
                        setResults(null);
                        setError("");
                        setSuccess("");
                      }}
                    >
                      <option value="">Seleccionar receta</option>
                      {recetas.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.codigo ? `${r.codigo} — ${r.nombre}` : r.nombre}
                        </option>
                      ))}
                    </select>
                    {selectedReceta && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Seleccionada:{" "}
                        <span className="font-semibold">
                          {selectedReceta.nombre}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Cantidad deseada */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Cantidad Deseada (unidades)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={cantidadDeseada}
                      onChange={(e) => {
                        setCantidadDeseada(e.target.value);
                        setFactibilidadCalculada(false);
                        setFactible(false);
                        setResults(null);
                        setError("");
                        setSuccess("");
                      }}
                      placeholder="Ej: 500"
                    />
                  </div>
                </div>

                {/* Botón 1: Calcular factibilidad */}
                <button
                  type="button"
                  onClick={handleCalcular}
                  disabled={calculating}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 disabled:opacity-70"
                >
                  <span className="text-sm">📊</span>
                  {calculating ? "Calculando..." : "Calcular factibilidad"}
                </button>

                {/* Botón 2: Crear producto */}
                <button
                  type="button"
                  onClick={handleCrearProducto}
                  disabled={botonCrearDisabled}
                  className={`mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium shadow-sm ${
                    botonCrearDisabled
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  <span className="text-sm">📦</span>
                  {creating ? "Creando producto..." : "Crear producto"}
                </button>
              </>
            )}
          </form>
        </section>

        {/* Resumen General */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <span className="text-indigo-500 text-lg">📊</span>
            <h2 className="text-sm font-semibold text-slate-900">
              Resumen General
            </h2>
          </div>

          <div className="px-6 py-4 space-y-4">
            {!results ? (
              <p className="text-xs text-slate-500">
                Selecciona una receta, ingresa la cantidad y pulsa{" "}
                <span className="font-semibold">"Calcular factibilidad"</span>.
              </p>
            ) : (
              <>
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-emerald-800">
                      Insumos Disponibles
                    </span>
                    <span className="text-emerald-600 text-sm">✔</span>
                  </div>
                  <p className="text-emerald-700">
                    {results.summary.disponibles} de{" "}
                    {results.summary.total} (
                    {results.summary.total
                      ? Math.round(results.summary.pctDisponibles)
                      : 0}
                    % del total)
                  </p>
                </div>

                <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-red-800">
                      Insumos Faltantes
                    </span>
                    <span className="text-red-600 text-sm">✖</span>
                  </div>
                  <p className="text-red-700">
                    {results.summary.faltantes} de{" "}
                    {results.summary.total} (
                    {results.summary.total
                      ? 100 - Math.round(results.summary.pctDisponibles)
                      : 0}
                    % del total)
                  </p>
                </div>

                {/* Donut */}
                <div className="flex flex-col items-center pt-2">
                  <div className="relative w-28 h-28 rounded-full flex items-center justify-center">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(#22c55e ${
                          results.summary.pctDisponibles || 0
                        }%, #ef4444 0)`,
                      }}
                    ></div>
                    <div className="relative w-18 h-18 bg-white rounded-full flex flex-col items-center justify-center text-xs">
                      <span className="text-[11px] text-slate-500">
                        Total
                      </span>
                      <span className="text-lg font-semibold text-slate-900">
                        {results.summary.total}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 text-center">
                    Factibilidad para{" "}
                    <span className="font-semibold">
                      {results.unidades}
                    </span>{" "}
                    unidades.
                  </p>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Análisis de Insumos */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-indigo-500 text-lg">📦</span>
            <h2 className="text-sm font-semibold text-slate-900">
              Análisis de Insumos
            </h2>
          </div>
        </div>

        {!results ? (
          <div className="px-6 py-6 text-xs text-slate-500">
            Aún no hay datos para mostrar. Configura la simulación y pulsa{" "}
            <span className="font-semibold">"Calcular factibilidad"</span>.
          </div>
        ) : (
          <div className="px-4 py-4 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 border border-slate-100">
                <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-3 py-2 text-left">Insumo</th>
                  <th className="px-3 py-2 text-right">Cant. Requerida</th>
                  <th className="px-3 py-2 text-right">Stock Disponible</th>
                  <th className="px-3 py-2 text-right">Faltante</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {results.items.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-slate-100 hover:bg-slate-50/80"
                  >
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-800">
                          {i.nombre}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ID: {i.id} · Unidad: {i.unidad}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-slate-700">
                      {i.cantidadRequerida.toLocaleString()} {i.unidad}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-emerald-700">
                      {i.stockDisponible.toLocaleString()} {i.unidad}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-red-700">
                      {i.faltante > 0
                        ? `${i.faltante.toLocaleString()} ${i.unidad}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {i.estado === "Disponible" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-medium">
                          ● Disponible
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100 text-[10px] font-medium">
                          ● Insuficiente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Historial de productos creados */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 mb-10">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-indigo-500 text-lg">🕒</span>
            <h2 className="text-sm font-semibold text-slate-900">
              Historial de productos creados
            </h2>
          </div>
        </div>

        {historial.length === 0 ? (
          <div className="px-6 py-6 text-xs text-slate-500">
            Aún no se han registrado producciones.
          </div>
        ) : (
          <div className="px-4 py-4 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 border border-slate-100">
                <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Receta</th>
                  <th className="px-3 py-2 text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr
                    key={h.id}
                    className="border-b border-slate-100 hover:bg-slate-50/80"
                  >
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {new Date(h.creado_en).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-800">
                          {h.receta_codigo
                            ? `${h.receta_codigo} — ${h.receta_nombre}`
                            : h.receta_nombre}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-slate-700">
                      {h.cantidad.toLocaleString()} u
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
