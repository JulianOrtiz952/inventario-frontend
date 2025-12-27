import { useMemo, useState } from "react";
import { API_BASE } from "../config/api";

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
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">Errores por fila</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          El backend no cae toda la importación: procesa lo válido y reporta las filas inválidas.
        </p>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Fila</th>
              <th className="text-left px-4 py-2.5 font-semibold">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {errores.map((e, idx) => (
              <tr key={`${e?.fila ?? "x"}-${idx}`} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">{e?.fila ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-700">
                  <pre className="text-xs whitespace-pre-wrap break-words font-mono bg-slate-50 border border-slate-100 rounded-md p-2">
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Resultado</h3>
          <p className="text-xs text-slate-500 mt-0.5">Resumen devuelto por el backend.</p>
        </div>

        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
            result.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {result.ok ? "OK" : "Con errores"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Procesadas OK</p>
          <p className="text-lg font-semibold text-slate-900">{Number(result.procesadas_ok || 0)}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Movimientos creados</p>
          <p className="text-lg font-semibold text-slate-900">{movimientos.length}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Notas creadas</p>
          <p className="text-lg font-semibold text-slate-900">{notas.length}</p>
        </div>
      </div>

      {(movimientos.length > 0 || notas.length > 0) && (
        <div className="text-xs text-slate-600 space-y-1">
          {movimientos.length > 0 && (
            <div>
              <span className="font-semibold">movimientos_ids:</span>{" "}
              <span className="font-mono">{movimientos.join(", ")}</span>
            </div>
          )}
          {notas.length > 0 && (
            <div>
              <span className="font-semibold">notas_creadas:</span>{" "}
              <span className="font-mono">{notas.join(", ")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HelpBox({ mode }) {
  const isInsumos = mode === "insumos";

  const colsReq = isInsumos
    ? ["codigo", "nombre", "bodega_id", "cantidad_entrada", "costo_unitario", "tercero_id"]
    : ["fecha", "bodega_id", "tercero_id", "producto_sku", "cantidad"];

  const colsOpt = isInsumos
    ? ["referencia", "factura", "unidad_medida", "color", "stock_minimo", "observacion"]
    : ["talla", "costo_unitario", "observacion"];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Estructura del Excel</h3>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Columnas requeridas</p>
          <ul className="mt-2 text-xs text-slate-700 space-y-1 list-disc ml-5">
            {colsReq.map((c) => (
              <li key={c} className="font-mono">
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Columnas opcionales</p>
          <ul className="mt-2 text-xs text-slate-700 space-y-1 list-disc ml-5">
            {colsOpt.map((c) => (
              <li key={c} className="font-mono">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-700">Notas:</p>
        <ul className="mt-1 space-y-1 list-disc ml-5">
          <li>La fecha puede venir como <span className="font-mono">2025-12-27</span> o <span className="font-mono">27/12/2025</span> (según tu contrato).</li>
          <li>El front solo sube el archivo; el backend valida headers/filas y devuelve el resumen.</li>
          <li>Si el backend responde 400 por headers/archivo, se muestra el error tal cual.</li>
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
        id: "terminado",
        label: "Ingreso Producto Terminado",
        templateUrl: `${API_BASE}/excel/plantilla-terminado/`,
        templateName: "plantilla_producto_terminado.xlsx",
        importUrl: `${API_BASE}/excel/importar-terminado/`,
      },
    ],
    []
  );

  const [tab, setTab] = useState("insumos");
  const active = tabs.find((t) => t.id === tab) || tabs[0];

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const errores = Array.isArray(result?.errores) ? result.errores : [];

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
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 lg:p-8 bg-slate-50 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Importar Excel</h1>
              <p className="text-sm text-slate-500">
                Descarga la plantilla, llena las columnas y sube el .xlsx para registrar movimientos masivos.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-col md:flex-row gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setFile(null);
                  setError("");
                  setResult(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {(error || result) && (
            <div className="space-y-3">
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 whitespace-pre-wrap">
                  {error}
                </div>
              )}

              {result && <ResultCard result={result} />}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel principal */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{active.label}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      1) Descarga plantilla → 2) Llénala → 3) Importa el archivo.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onDownload}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    ⬇ Descargar plantilla
                  </button>
                </div>

                <form onSubmit={onImport} className="mt-4 space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <label className="block text-xs font-semibold text-slate-700">Archivo Excel (.xlsx)</label>
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={onPick}
                      className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-slate-900 file:text-white file:text-xs file:font-semibold hover:file:bg-slate-800"
                    />
                    {file && (
                      <p className="mt-2 text-xs text-slate-600">
                        Seleccionado: <span className="font-mono">{file.name}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row gap-2 md:justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700 disabled:opacity-60"
                    >
                      {loading ? "Importando…" : "⬆ Importar"}
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
