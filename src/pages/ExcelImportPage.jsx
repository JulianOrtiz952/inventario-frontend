import { useMemo, useState, useEffect } from "react";
import { API_BASE } from "../config/api";
import { useInventory } from "../context/InventoryContext"; // ✅ Contexto

function safeJsonText(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function safeJson(res) {
  const text = await res.text().catch(() => "");
  return safeJsonText(text);
}

async function downloadExcel(url, filename) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "No se pudo descargar la plantilla.");
  }

  const blob = await res.blob();
  const objectUrl = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(objectUrl);
}

function ErrorsTable({ errores }) {
  if (!Array.isArray(errores) || errores.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Errores por fila</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          El backend no cae toda la importación: procesa lo válido y reporta las filas inválidas.
        </p>
      </div>

      <div className="overflow-auto font-sans">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs text-left">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Fila</th>
              <th className="px-4 py-2.5 font-semibold">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {errores.map((e, idx) => (
              <tr key={`${e?.fila ?? "x"}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">{e?.fila ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                  <pre className="text-xs whitespace-pre-wrap break-words font-mono bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-lg p-3">
                    {String(e?.error ?? "")}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultCard({ result }) {
  if (!result) return null;

  const movimientos = Array.isArray(result.movimientos_ids) ? result.movimientos_ids : [];
  const notas = Array.isArray(result.notas_creadas) ? result.notas_creadas : [];

  const showMovs = movimientos.length > 0 || result.creados !== undefined;
  const showNotas = notas.length > 0 || result.actualizados !== undefined;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Resultado</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Resumen devuelto por el backend.</p>
        </div>

        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${result.ok ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50" : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50"
            }`}
        >
          {result.ok ? "OK" : "Con errores"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Procesadas OK</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{Number(result.procesadas_ok || 0)}</p>
        </div>

        {showMovs && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
              {result.creados !== undefined ? "Creados" : "Movimientos creados"}
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {result.creados !== undefined ? result.creados : movimientos.length}
            </p>
          </div>
        )}

        {showNotas && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
              {result.actualizados !== undefined ? "Actualizados" : "Notas creadas"}
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {result.actualizados !== undefined ? result.actualizados : notas.length}
            </p>
          </div>
        )}
      </div>

      {(movimientos.length > 0 || notas.length > 0) && (
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
          {movimientos.length > 0 && (
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">movimientos_ids:</span>{" "}
              <span className="font-mono">{movimientos.join(", ")}</span>
            </div>
          )}
          {notas.length > 0 && (
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">notas_creadas:</span>{" "}
              <span className="font-mono">{notas.join(", ")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HelpBox({ mode }) {
  /* Ayuda dinámica según tab */
  const helpInfo = useMemo(() => {
    switch (mode) {
      case "insumos":
        return {
          req: ["Codigo Producto", "Referencia", "Descripción", "Cantidad Entrada (Stock)"],
          opt: ["Marca (Proveedor)", "Color", "# FACTURA", "Costo Unitario", "Bodega*", "Tercero*", "Unidad Medida"],
          notes: [
            <>La fecha puede venir como <span className="font-mono text-blue-600 dark:text-blue-400">2025-12-27</span> o <span className="font-mono text-blue-600 dark:text-blue-400">27/12/2025</span>.</>,
            <>* <b>Bodega</b> y <b>Tercero</b> en el Excel tienen prioridad sobre la selección global.</>,
            "Si dejas 'Referencia' vacía, tomará el 'Código' por defecto."
          ]
        };
      case "proveedores":
        return {
          req: ["Nombre"],
          opt: [],
          notes: ["Se convertirá a MAYÚSCULAS automáticamente.", "Si ya existe (por nombre), no se duplica."]
        };
      case "terceros":
        return {
          req: ["Codigo", "Nombre"],
          opt: [],
          notes: ["Se valida duplicados por Código.", "Si el código existe, se actualiza el nombre."]
        };
      case "bodegas":
        return {
          req: ["Codigo", "Nombre"],
          opt: [],
          notes: ["Se valida duplicados por Código.", "Si el código existe, se actualiza el nombre."]
        };
      case "tallas":
        return {
          req: ["Nombre"],
          opt: [],
          notes: ["Se valida duplicados por Nombre."]
        };
      default:
        return { req: [], opt: [], notes: [] };
    }
  }, [mode]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Estructura del Excel</h3>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Columnas requeridas</p>
          <ul className="mt-2 text-xs text-slate-700 dark:text-slate-400 space-y-1 list-disc ml-5 font-medium">
            {helpInfo.req.map((c) => (
              <li key={c} className="font-mono text-slate-600 dark:text-slate-300">
                {c}
              </li>
            ))}
          </ul>
        </div>

        {helpInfo.opt.length > 0 && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Columnas opcionales</p>
            <ul className="mt-2 text-xs text-slate-700 dark:text-slate-400 space-y-1 list-disc ml-5 font-medium">
              {helpInfo.opt.map((c) => (
                <li key={c} className="font-mono text-slate-600 dark:text-slate-300">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Notas:</p>
        <ul className="space-y-1.5 list-disc ml-5">
          {helpInfo.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </div>
    </div>
  );
}



export default function ExcelImportPage() {
  const tabs = useMemo(
    () => [
      {
        id: "insumos",
        label: "Entradas de Insumos",
        templateUrl: `${API_BASE}/excel/plantilla-insumos/`,
        templateName: "plantilla_insumos.xlsx",
        importUrl: `${API_BASE}/excel/importar-insumos/`,
      },
      {
        id: "proveedores",
        label: "Proveedores",
        templateUrl: `${API_BASE}/excel/plantilla-proveedores/`,
        templateName: "plantilla_proveedores.xlsx",
        importUrl: `${API_BASE}/excel/importar-proveedores/`,
      },
      {
        id: "terceros",
        label: "Terceros",
        templateUrl: `${API_BASE}/excel/plantilla-terceros/`,
        templateName: "plantilla_terceros.xlsx",
        importUrl: `${API_BASE}/excel/importar-terceros/`,
      },
      {
        id: "bodegas",
        label: "Bodegas",
        templateUrl: `${API_BASE}/excel/plantilla-bodegas/`,
        templateName: "plantilla_bodegas.xlsx",
        importUrl: `${API_BASE}/excel/importar-bodegas/`,
      },
      {
        id: "tallas",
        label: "Tallas",
        templateUrl: `${API_BASE}/excel/plantilla-tallas/`,
        templateName: "plantilla_tallas.xlsx",
        importUrl: `${API_BASE}/excel/importar-tallas/`,
      },
    ],
    []
  );

  const [tab, setTab] = useState("insumos");
  const active = tabs.find((t) => t.id === tab) || tabs[0];

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inputKey, setInputKey] = useState(0); // Para limpiar input

  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const errores = Array.isArray(result?.errores) ? result.errores : [];

  // =========================================
  //  Selectores Globales (Contexto)
  // =========================================
  const { bodegas, terceros } = useInventory(); // ✅ Usamos el contexto

  // Valores seleccionados en UI para usar como default
  const [globalBodegaId, setGlobalBodegaId] = useState("");
  const [globalTerceroId, setGlobalTerceroId] = useState("");

  // Preseleccionar primera opción cuando carguen los catálogos
  useEffect(() => {
    if (!globalBodegaId && bodegas.length > 0) {
      setGlobalBodegaId(bodegas[0].id);
    }
  }, [bodegas, globalBodegaId]);

  useEffect(() => {
    if (!globalTerceroId && terceros.length > 0) {
      setGlobalTerceroId(terceros[0].id);
    }
  }, [terceros, globalTerceroId]);


  const onPick = (e) => {
    setError("");
    setResult(null);
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const onDownload = async () => {
    setError("");
    try {
      await downloadExcel(active.templateUrl, active.templateName);
    } catch (e) {
      setError(e.message || "Error descargando plantilla.");
    }
  };

  const onImport = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!file) return setError("Selecciona un archivo .xlsx.");

    const name = String(file.name || "").toLowerCase();
    if (!name.endsWith(".xlsx")) return setError("El archivo debe ser .xlsx.");

    try {
      setLoading(true);

      const fd = new FormData();
      // ✅ contrato: key EXACTA file
      fd.append("file", file);

      // Enviar defaults Solo para insumos
      if (tab === "insumos") {
        if (globalBodegaId) fd.append("bodega_id", globalBodegaId);
        if (globalTerceroId) fd.append("tercero_id", globalTerceroId);
      }

      const res = await fetch(active.importUrl, {
        method: "POST",
        body: fd,
      });

      // 400: archivo corrupto / headers malos / falta file
      if (!res.ok) {
        const data = await safeJson(res);
        throw new Error((data && (data.detail || JSON.stringify(data))) || "Error importando Excel.");
      }

      const data = await safeJson(res);
      setResult(data);
    } catch (e2) {
      setError(e2.message || "Error importando Excel.");
    } finally {
      setLoading(false);
      // Forzar limpieza del input para evitar "Failed to fetch" si el usuario reintenta
      // con el mismo objeto File que el navegador ya invalidó por seguridad o cambio.
      setFile(null);
      setInputKey(prev => prev + 1);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Importar Excel</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Descarga la plantilla, llena las columnas y sube el .xlsx para registrar movimientos masivos.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 flex flex-col md:flex-row gap-2 shadow-sm whitespace-nowrap overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setFile(null);
                  setInputKey(prev => prev + 1);
                  setError("");
                  setResult(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md shadow-slate-200/50 dark:shadow-none" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {(error || result) && (
            <div className="space-y-3">
              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">
                  {error}
                </div>
              )}

              {result && <ResultCard result={result} />}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel principal */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">{active.label}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Descarga la plantilla, llénala con los datos correspondientes e importa el archivo.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onDownload}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                  >
                    ⬇ Descargar plantilla
                  </button>
                </div>

                <form onSubmit={onImport} className="mt-6 space-y-6">
                  {/* Selectores de Bodega/Tercero si el tab es 'insumos' */}
                  {tab === "insumos" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Bodega Predeterminada <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={globalBodegaId}
                          onChange={(e) => setGlobalBodegaId(e.target.value)}
                          className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm focus:ring-blue-500 max-h-40"
                        >
                          <option value="">-- Seleccionar Bodega --</option>
                          {bodegas.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.codigo} - {b.nombre}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          Se usará si la columna en Excel está vacía.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Tercero Predeterminado <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={globalTerceroId}
                          onChange={(e) => setGlobalTerceroId(e.target.value)}
                          className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm focus:ring-blue-500 max-h-40"
                        >
                          <option value="">-- Seleccionar Tercero --</option>
                          {terceros.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.codigo} - {t.nombre}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          Se usará si la columna en Excel está vacía.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Archivo Excel (.xlsx)</label>
                    <input
                      key={inputKey} // ✅ Reset input on key change
                      type="file"
                      accept=".xlsx"
                      onChange={onPick}
                      className="block w-full text-sm text-slate-700 dark:text-slate-300 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:bg-slate-900 dark:file:bg-slate-100 file:text-white dark:file:text-slate-900 file:text-xs file:font-bold hover:file:bg-slate-800 dark:hover:file:bg-slate-200 file:transition-all cursor-pointer"
                    />
                    {file && (
                      <p className="mt-4 text-xs text-slate-600 dark:text-slate-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                        <span>Archivo seleccionado: <span className="font-bold text-blue-700 dark:text-blue-400">{file.name}</span></span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 md:justify-end border-t border-slate-100 dark:border-slate-800 pt-5">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 dark:hover:bg-blue-600 transition-all disabled:opacity-60 active:scale-[0.98]"
                    >
                      {loading ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Importando…
                        </>
                      ) : (
                        <>⬆ Importar Archivo</>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              <ErrorsTable errores={errores} />
            </div>

            {/* Ayuda */}
            <div className="space-y-6">
              <HelpBox mode={tab} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
