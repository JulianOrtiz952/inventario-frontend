import React from "react";
import { formatCurrency } from "../utils/format";

export default function ProductDetailsModal({ isOpen, onClose, product, title = "Detalle del producto" }) {
  if (!isOpen) return null;

  const impuestos = Array.isArray(product?.impuestos) ? product.impuestos : [];
  const precios = Array.isArray(product?.precios) ? product.precios : [];
  const da = product?.datos_adicionales || null;
  const bd = product?.price_breakdown || null;

  const fmtMoney = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return v ?? "—";
    return `$${formatCurrency(n)}`;
  };
  const fmtPct = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return `${formatCurrency(n)}%`;
  };

  const terceroLabel =
    product?.tercero?.nombre
      ? `${product.tercero.nombre}${product.tercero.codigo ? ` (${product.tercero.codigo})` : ""}`
      : "—";

  const Card = ({ title, children }) => (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-xs font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );

  const Field = ({ label, value }) => (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm text-slate-800">{value ?? "—"}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-5xl max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              SKU: <b>{product?.codigo_sku || "—"}</b>
            </p>
          </div>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Información básica">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nombre" value={product?.nombre || "—"} />
                <Field label="SKU" value={product?.codigo_sku || "—"} />
                <Field label="Unidad de medida" value={product?.unidad_medida || "—"} />
                <Field label="Código de barras" value={product?.codigo_barras || "—"} />
                <Field label="Tercero" value={terceroLabel} />

              </div>

              <div className="mt-4">
                <p className="text-[11px] text-slate-500 mb-2">Impuestos</p>
                {impuestos.length ? (
                  <div className="flex flex-wrap gap-2">
                    {impuestos.map((imp) => (
                      <span
                        key={imp.id}
                        className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs text-slate-700"
                      >
                        <b className="mr-1">{imp.codigo}</b>
                        <span className="text-slate-500">
                          {imp.valor !== undefined ? `${imp.valor}%` : ""}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">— Sin impuestos</span>
                )}
              </div>
            </Card>

            <Card title="Precios (incluye IVA)">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">Precio base</p>
                  <p className="text-sm font-semibold text-slate-900">{fmtMoney(bd?.precio_base)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">Total descuentos</p>
                  <p className="text-sm font-semibold text-orange-700">
                    {bd?.total_descuentos ? `-${fmtMoney(bd.total_descuentos)}` : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">IVA</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {bd?.valor_iva ? fmtMoney(bd.valor_iva) : "—"}{" "}
                    <span className="text-[11px] text-slate-400">
                      {bd?.porcentaje_impuestos ? `(${fmtPct(bd.porcentaje_impuestos)})` : ""}
                    </span>
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-[11px] text-emerald-700">Total</p>
                  <p className="text-sm font-bold text-emerald-800">{fmtMoney(bd?.total)}</p>
                </div>
              </div>

              <div className="mt-3 overflow-x-auto">
                {precios.length ? (
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 border border-slate-200">
                      <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="px-3 py-2 text-left">Nombre</th>
                        <th className="px-3 py-2 text-right">Valor</th>
                        <th className="px-3 py-2 text-center">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {precios.map((p, idx) => (
                        <tr key={p.id ?? idx} className="border-b border-slate-100">
                          <td className="px-3 py-2 text-slate-800">{p.nombre}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-800">
                            {fmtMoney(p.valor)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {p.es_descuento ? (
                              <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-xs text-orange-700">
                                Descuento
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs text-emerald-700">
                                Precio
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-xs text-slate-500">No hay precios registrados.</div>
                )}
              </div>
            </Card>

            <div className="lg:col-span-2">
              <Card title="Datos adicionales">
                {!da ? (
                  <div className="text-xs text-slate-500">No se registraron datos adicionales.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Referencia" value={da.referencia || "—"} />
                    <Field label="Unidad" value={da.unidad || "—"} />
                    <Field label="Stock mínimo" value={da.stock_minimo ?? "—"} />
                    <Field label="Marca" value={da.marca || "—"} />
                    <Field label="Modelo" value={da.modelo || "—"} />
                    <Field label="Código arancelario" value={da.codigo_arancelario || "—"} />
                    <Field label="Stock" value={da.stock ?? "—"} />
                    <div className="md:col-span-3">
                      <Field label="Descripción" value={da.descripcion || "—"} />
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
