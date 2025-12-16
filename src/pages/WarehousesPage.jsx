import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

const nf = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const nfMoney = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const num = (v) => nf.format(Number(v || 0));
const money = (v) => `$${nfMoney.format(Number(v || 0))}`;

async function safeJson(res) {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function WarehousesPage() {
  // ✅ Paginación historial (30 en 30)
  const [historyPage, setHistoryPage] = useState(1);
  const [historyCount, setHistoryCount] = useState(0);
  const [historyNext, setHistoryNext] = useState(null);
  const [historyPrev, setHistoryPrev] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [selectedBodega, setSelectedBodega] = useState(null);
  const [details, setDetails] = useState({ insumos: [], productos: [] });

  const [bodegas, setBodegas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ codigo: "", nombre: "", descripcion: "", ubicacion: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ✅ MODAL: STOCK POR TALLAS
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [stockSku, setStockSku] = useState(null);
  const [stockHeader, setStockHeader] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState("");

  // ✅ TRASLADOS
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [transferOk, setTransferOk] = useState("");
  const [terceros, setTerceros] = useState([]);
  const [tallas, setTallas] = useState([]);
  const [transferForm, setTransferForm] = useState({
    producto_id: "",
    producto_nombre: "",
    bodega_origen_id: "",
    bodega_destino_id: "",
    tercero_id: "",
    talla_id: "", // "" => null
    cantidad: "",
  });

  // ✅ HISTORIAL
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyRows, setHistoryRows] = useState([]);

  // =========================
  // Cargar bodegas
  // =========================
  useEffect(() => {
  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE}/bodegas/`);
      if (!res.ok) throw new Error("No se pudieron cargar las bodegas.");

      const data = await res.json();

      // ✅ soporta lista normal o respuesta paginada {results: []}
      const rows = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setBodegas(rows);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar bodegas.");
    } finally {
      setLoading(false);
    }
  };
  load();
}, []);

  const bodegasFiltradas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return bodegas;
    return bodegas.filter((b) => {
      const codigo = (b.codigo || "").toLowerCase();
      const nombre = (b.nombre || "").toLowerCase();
      const ubic = (b.ubicacion || "").toLowerCase();
      return codigo.includes(term) || nombre.includes(term) || ubic.includes(term);
    });
  }, [search, bodegas]);

  // =========================
  // CRUD bodegas
  // =========================
  const openCreate = () => {
    setEditingId(null);
    setForm({ codigo: "", nombre: "", descripcion: "", ubicacion: "" });
    setSaveError("");
    setIsModalOpen(true);
  };

  const openEdit = (b) => {
    setEditingId(b.id);
    setForm({
      codigo: b.codigo || "",
      nombre: b.nombre || "",
      descripcion: b.descripcion || "",
      ubicacion: b.ubicacion || "",
    });
    setSaveError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `${API_BASE}/bodegas/${editingId}/` : `${API_BASE}/bodegas/`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("No se pudo guardar la bodega.");

      const saved = await res.json();

      if (editingId) {
        setBodegas((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
      } else {
        setBodegas((prev) => [saved, ...prev]);
      }

      setIsModalOpen(false);
    } catch (err) {
      setSaveError(err.message || "Error al guardar la bodega.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bodega) => {
    const ok = window.confirm(`¿Eliminar la bodega "${bodega.nombre}"? Esta acción no se puede deshacer.`);
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/bodegas/${bodega.id}/`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("No se pudo eliminar la bodega.");
      setBodegas((prev) => prev.filter((b) => b.id !== bodega.id));
    } catch (err) {
      alert(err.message || "Error eliminando la bodega.");
    }
  };

  // =========================
  // Contenido bodega
  // =========================
  const openDetails = async (bodega) => {
    setSelectedBodega(bodega);
    setIsDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError("");
    setDetails({ insumos: [], productos: [] });

    try {
      const res = await fetch(`${API_BASE}/bodegas/${bodega.id}/contenido/`);
      if (!res.ok) throw new Error("Error al cargar el contenido de la bodega.");
      const data = await res.json();

      setDetails({
        insumos: data.insumos || [],
        productos: data.productos || [],
      });
    } catch (err) {
      console.error(err);
      setDetailsError(err.message || "Error al cargar el contenido.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    if (detailsLoading) return;
    setIsDetailsOpen(false);
    setSelectedBodega(null);
    setDetails({ insumos: [], productos: [] });
    setDetailsError("");
  };

  // =========================
  // Stock por tallas
  // =========================
  async function openStockPorTallas(sku) {
    try {
      setIsStockOpen(true);
      setStockSku(sku);
      setStockHeader(null);
      setStockItems([]);
      setStockError("");
      setStockLoading(true);

      const bodegaId = selectedBodega?.id;
      const url = bodegaId
        ? `${API_BASE}/productos/${encodeURIComponent(sku)}/stock-por-talla/?bodega_id=${bodegaId}`
        : `${API_BASE}/productos/${encodeURIComponent(sku)}/stock-por-talla/`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("No se pudo cargar el stock por tallas.");
      const data = await res.json();

      setStockHeader(data?.producto || { codigo: sku, nombre: "—" });
      setStockItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      setStockError(e.message || "Error cargando stock por tallas.");
    } finally {
      setStockLoading(false);
    }
  }

  function closeStockModal() {
    setIsStockOpen(false);
    setStockSku(null);
    setStockHeader(null);
    setStockItems([]);
    setStockError("");
    setStockLoading(false);
  }

  // =========================
  // TRASLADOS
  // =========================
  async function ensureTransferListsLoaded() {
  if (terceros.length === 0) {
    const r = await fetch(`${API_BASE}/terceros/`);
    if (r.ok) {
      const data = await r.json();
      const rows = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setTerceros(rows);
    }
  }

  if (tallas.length === 0) {
    const r = await fetch(`${API_BASE}/tallas/`);
    if (r.ok) {
      const data = await r.json();
      const rows = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setTallas(rows);
    }
  }
}


  async function openTransferModal(productoCodigo, productoNombre) {
    if (!selectedBodega) return;

    setTransferError("");
    setTransferOk("");
    setIsTransferOpen(true);

    try {
      await ensureTransferListsLoaded();
    } catch (e) {
      console.error(e);
    }

    setTransferForm({
      producto_id: productoCodigo,
      producto_nombre: productoNombre || "",
      bodega_origen_id: selectedBodega.id,
      bodega_destino_id: "",
      tercero_id: "",
      talla_id: "",
      cantidad: "",
    });
  }

  function closeTransferModal() {
    if (transferLoading) return;
    setIsTransferOpen(false);
    setTransferLoading(false);
    setTransferError("");
    setTransferOk("");
    setTransferForm({
      producto_id: "",
      producto_nombre: "",
      bodega_origen_id: "",
      bodega_destino_id: "",
      tercero_id: "",
      talla_id: "",
      cantidad: "",
    });
  }

  function onTransferChange(e) {
    const { name, value } = e.target;
    setTransferForm((p) => ({ ...p, [name]: value }));
  }

  async function submitTransfer(e) {
    e.preventDefault();
    if (!selectedBodega) return;

    setTransferLoading(true);
    setTransferError("");
    setTransferOk("");

    try {
      const payload = {
        tercero_id: Number(transferForm.tercero_id),
        bodega_origen_id: Number(transferForm.bodega_origen_id),
        bodega_destino_id: Number(transferForm.bodega_destino_id),
        producto_id: transferForm.producto_id,
        cantidad: String(transferForm.cantidad || "").trim(),
        talla_id: transferForm.talla_id ? Number(transferForm.talla_id) : null,
      };

      if (!payload.tercero_id) throw new Error("Selecciona el tercero.");
      if (!payload.bodega_destino_id) throw new Error("Selecciona la bodega destino.");
      if (!payload.cantidad) throw new Error("Ingresa la cantidad a trasladar.");

      const res = await fetch(`${API_BASE}/traslados-producto/ejecutar/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await safeJson(res);
        const msg =
          data?.detail ||
          (data?.stock_insuficiente ? "Stock insuficiente en la bodega origen." : "No se pudo ejecutar el traslado.");
        throw new Error(msg);
      }

      setTransferOk("Traslado realizado.");

      // ✅ refrescar contenido UNA sola vez
      await openDetails(selectedBodega);

      // ✅ si el modal de stock está abierto y corresponde al producto, refrescarlo
      if (isStockOpen && stockSku && stockSku === transferForm.producto_id) {
        await openStockPorTallas(stockSku);
      }
    } catch (err) {
      setTransferError(err.message || "Error al realizar el traslado.");
    } finally {
      setTransferLoading(false);
    }
  }

  // =========================
  // HISTORIAL: PAGINACIÓN 30 en 30
  // =========================
  async function loadHistory(page = 1) {
    if (!selectedBodega) return;

    setHistoryLoading(true);
    setHistoryError("");

    try {
      const res = await fetch(
        `${API_BASE}/traslados-producto/?bodega_id=${selectedBodega.id}&page=${page}&page_size=30`
      );
      if (!res.ok) throw new Error("No se pudo cargar el historial.");

      const data = await res.json();

      setHistoryRows(Array.isArray(data?.results) ? data.results : []);
      setHistoryCount(Number(data?.count || 0));
      setHistoryNext(data?.next || null);
      setHistoryPrev(data?.previous || null);
      setHistoryPage(page);
    } catch (e) {
      console.error(e);
      setHistoryError(e.message || "Error cargando historial.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openHistoryModal() {
  if (!selectedBodega) return;

  setIsHistoryOpen(true);
  setHistoryRows([]);
  setHistoryCount(0);
  setHistoryNext(null);
  setHistoryPrev(null);
  setHistoryPage(1);

  await loadHistory(1);
}


  function closeHistoryModal() {
    if (historyLoading) return;
    setIsHistoryOpen(false);
    setHistoryLoading(false);
    setHistoryError("");
    setHistoryRows([]);

    // reset paginación
    setHistoryPage(1);
    setHistoryCount(0);
    setHistoryNext(null);
    setHistoryPrev(null);
  }

  return (
    <div className="flex-1 p-6 lg:p-8 bg-slate-50 overflow-auto">
      <section className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Bodegas</h1>
            <p className="text-xs text-slate-500 mt-1">Administra las bodegas donde se almacenan insumos y productos.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
              <span className="text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, nombre o ubicación..."
                className="bg-transparent outline-none text-xs text-slate-700 placeholder:text-slate-400 w-56 md:w-72"
              />
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium shadow-sm hover:bg-indigo-700"
            >
              <span className="mr-1">＋</span>
              Agregar bodega
            </button>
          </div>
        </div>

        <section className="bg-white rounded-xl shadow-sm border border-slate-200">
          {loading && <div className="p-6 text-sm text-slate-500">Cargando bodegas...</div>}
          {error && !loading && <div className="p-6 text-sm text-red-600">{error}</div>}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Código</th>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Ubicación</th>
                    <th className="px-4 py-3 text-right">Insumos</th>
                    <th className="px-4 py-3 text-right">Productos</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {bodegasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-sm text-slate-500">
                        No se encontraron bodegas.
                      </td>
                    </tr>
                  )}

                  {bodegasFiltradas.map((b) => (
                    <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{b.codigo}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">{b.nombre}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{b.ubicacion || "—"}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{b.insumos_count ?? 0}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{b.productos_count ?? 0}</td>
                      <td className="px-4 py-3 text-xs text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDetails(b)}
                            className="px-2 py-1 rounded border border-slate-200 text-[11px] hover:bg-slate-50"
                          >
                            Ver contenido
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(b)}
                            className="px-2 py-1 rounded border border-slate-200 text-[11px] hover:bg-slate-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(b)}
                            className="px-2 py-1 rounded border border-red-100 text-[11px] text-red-600 hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      {/* Modal crear/editar bodega */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 mb-2">
                {editingId ? "Editar bodega" : "Nueva bodega"}
              </h2>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">Código</label>
                <input
                  type="text"
                  name="codigo"
                  value={form.codigo}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">Ubicación</label>
                <input
                  type="text"
                  name="ubicacion"
                  value={form.ubicacion}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">Descripción</label>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                />
              </div>

              {saveError && <p className="text-xs text-red-600">{saveError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal contenido bodega */}
      {isDetailsOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Contenido de bodega</h2>
                <p className="text-xs text-slate-500">
                  {selectedBodega ? `${selectedBodega.codigo} — ${selectedBodega.nombre}` : ""}
                </p>
                {detailsError && <p className="text-xs text-red-600 mt-1">{detailsError}</p>}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openHistoryModal}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] bg-white hover:bg-slate-50"
                >
                  Historial traslados
                </button>

                <button type="button" onClick={closeDetails} className="text-slate-400 hover:text-slate-600 text-xl">
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-auto">
              {/* Insumos */}
              <div className="flex flex-col">
                <div className="px-5 py-3 bg-white border-b border-slate-100">
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Insumos ({details.insumos.length})
                  </h3>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  {detailsLoading ? (
                    <p className="text-xs text-slate-500">Cargando insumos...</p>
                  ) : details.insumos.length === 0 ? (
                    <p className="text-xs text-slate-400">No hay insumos en esta bodega.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="text-[10px] text-slate-500 uppercase border-b border-slate-100">
                        <tr>
                          <th className="py-2 pr-2 text-left">Código</th>
                          <th className="py-2 pr-2 text-left">Nombre</th>
                          <th className="py-2 pr-2 text-right">Stock</th>
                          <th className="py-2 pr-2 text-right">C/U</th>
                          <th className="py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.insumos.map((i) => (
                          <tr key={i.codigo} className="border-b border-slate-100 hover:bg-slate-50/60">
                            <td className="py-2 pr-2 text-slate-800">{i.codigo}</td>
                            <td className="py-2 pr-2 text-slate-800">{i.nombre}</td>
                            <td className="py-2 pr-2 text-right tabular-nums">{num(i.stock_actual)}</td>
                            <td className="py-2 pr-2 text-right tabular-nums">{money(i.costo_unitario)}</td>
                            <td className="py-2 text-right tabular-nums font-medium">{money(i.valor_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Productos */}
              <div className="flex flex-col">
                <div className="px-5 py-3 bg-white border-b border-slate-100">
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Productos ({details.productos.length})
                  </h3>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  {detailsLoading ? (
                    <p className="text-xs text-slate-500">Cargando productos...</p>
                  ) : details.productos.length === 0 ? (
                    <p className="text-xs text-slate-400">No hay productos producidos en esta bodega.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="text-[10px] text-slate-500 uppercase border-b border-slate-100">
                        <tr>
                          <th className="py-2 pr-2 text-left">Código</th>
                          <th className="py-2 pr-2 text-left">Nombre</th>
                          <th className="py-2 pr-2 text-right">Cantidad</th>
                          <th className="py-2 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.productos.map((p, idx) => (
                          <tr key={`${p.codigo}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/60">
                            <td className="py-2 pr-2 text-slate-800">{p.codigo}</td>
                            <td className="py-2 pr-2 text-slate-800">{p.nombre}</td>
                            <td className="py-2 pr-2 text-right tabular-nums font-medium">{num(p.total_producido)} u</td>
                            <td className="py-2 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openStockPorTallas(p.codigo)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                  title="Ver por tallas"
                                >
                                  …
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openTransferModal(p.codigo, p.nombre)}
                                  className="inline-flex items-center justify-center px-3 h-8 rounded-md bg-indigo-600 text-white text-[11px] font-medium shadow-sm hover:bg-indigo-700"
                                  title="Trasladar"
                                >
                                  Trasladar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="px-4 pb-4" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal stock por tallas */}
      {isStockOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Stock por tallas</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  SKU: <b>{stockHeader?.codigo || stockSku || "—"}</b> • {stockHeader?.nombre || "—"}
                </p>
              </div>
              <button className="text-slate-400 hover:text-slate-600" onClick={closeStockModal}>
                ✕
              </button>
            </div>

            <div className="px-6 py-4">
              {stockLoading && <div className="text-xs text-slate-500">Cargando...</div>}

              {stockError && !stockLoading && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                  {stockError}
                </div>
              )}

              {!stockLoading && !stockError && (
                <>
                  {stockItems.length === 0 ? (
                    <div className="text-xs text-slate-500">No hay tallas registradas para este producto.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 border border-slate-200">
                          <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <th className="px-3 py-2 text-left">Código</th>
                            <th className="px-3 py-2 text-left">Nombre</th>
                            <th className="px-3 py-2 text-left">Talla</th>
                            <th className="px-3 py-2 text-right">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockItems.map((it, idx) => (
                            <tr key={`${it.codigo}-${it.talla}-${idx}`} className="border-b border-slate-100">
                              <td className="px-3 py-2 text-slate-800">{it.codigo}</td>
                              <td className="px-3 py-2 text-slate-800">{it.nombre}</td>
                              <td className="px-3 py-2 text-slate-700">{it.talla}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-slate-900 font-medium">
                                {it.cantidad}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={closeStockModal}
                      className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ Modal Traslado */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Trasladar producto</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {transferForm.producto_id ? (
                    <>
                      SKU: <b>{transferForm.producto_id}</b> • {transferForm.producto_nombre || "—"}
                    </>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <button className="text-slate-400 hover:text-slate-600" onClick={closeTransferModal}>
                ✕
              </button>
            </div>

            <form onSubmit={submitTransfer} className="p-6 space-y-4">
              {transferError && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                  {transferError}
                </div>
              )}
              {transferOk && (
                <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-700">
                  {transferOk}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Bodega origen</label>
                  <input
                    value={selectedBodega ? `${selectedBodega.codigo} - ${selectedBodega.nombre}` : "—"}
                    readOnly
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Bodega destino</label>
                  <select
                    name="bodega_destino_id"
                    value={transferForm.bodega_destino_id}
                    onChange={onTransferChange}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white"
                    required
                  >
                    <option value="">Selecciona…</option>
                    {bodegas
                      .filter((b) => !selectedBodega || b.id !== selectedBodega.id)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.codigo} — {b.nombre}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Tercero (quién traslada)</label>
                  <select
                    name="tercero_id"
                    value={transferForm.tercero_id}
                    onChange={onTransferChange}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white"
                    required
                  >
                    <option value="">Selecciona…</option>
                    {terceros.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.codigo} — {t.nombre}
                      </option>
                    ))}
                  </select>
                  {terceros.length === 0 && (
                    <p className="text-[11px] text-slate-400">No hay terceros cargados (o no se pudieron cargar).</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Talla (opcional)</label>
                  <select
                    name="talla_id"
                    value={transferForm.talla_id}
                    onChange={onTransferChange}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white"
                  >
                    <option value="">Sin talla</option>
                    {tallas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">Cantidad a trasladar</label>
                <input
                  name="cantidad"
                  value={transferForm.cantidad}
                  onChange={onTransferChange}
                  placeholder="Ej: 2 o 2.5"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeTransferModal}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  disabled={transferLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60"
                  disabled={transferLoading}
                >
                  {transferLoading ? "Trasladando..." : "Confirmar traslado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Modal Historial */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Historial de traslados</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedBodega ? `${selectedBodega.codigo} — ${selectedBodega.nombre}` : ""}
                </p>
                {historyError && <p className="text-xs text-red-600 mt-1">{historyError}</p>}
              </div>
              <button className="text-slate-400 hover:text-slate-600" onClick={closeHistoryModal}>
                ✕
              </button>
            </div>

            <div className="p-6 overflow-auto flex-1">
              {/* ✅ Barra paginación */}
              <div className="flex items-center justify-between gap-3 pb-3">
                <div className="text-xs text-slate-500">
                  Total: <b>{historyCount}</b> • Página <b>{historyPage}</b>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!historyPrev || historyLoading}
                    onClick={() => loadHistory(Math.max(1, historyPage - 1))}
                    className="px-3 py-1.5 rounded-md border border-slate-200 text-xs disabled:opacity-50 hover:bg-slate-50"
                  >
                    ← Anterior
                  </button>

                  <button
                    type="button"
                    disabled={!historyNext || historyLoading}
                    onClick={() => loadHistory(historyPage + 1)}
                    className="px-3 py-1.5 rounded-md border border-slate-200 text-xs disabled:opacity-50 hover:bg-slate-50"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>

              {historyLoading ? (
                <div className="text-xs text-slate-500">Cargando historial...</div>
              ) : historyRows.length === 0 ? (
                <div className="text-xs text-slate-500">No hay traslados para esta bodega.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 border border-slate-200">
                      <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="px-3 py-2 text-left">Fecha</th>
                        <th className="px-3 py-2 text-left">Tercero</th>
                        <th className="px-3 py-2 text-left">Origen</th>
                        <th className="px-3 py-2 text-left">Destino</th>
                        <th className="px-3 py-2 text-left">Producto</th>
                        <th className="px-3 py-2 text-left">Talla</th>
                        <th className="px-3 py-2 text-right">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.map((r) => (
                        <tr key={r.id} className="border-b border-slate-100">
                          <td className="px-3 py-2 text-slate-700">
                            {r.creado_en ? new Date(r.creado_en).toLocaleString("es-CO") : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-800">
                            {r.tercero ? `${r.tercero.codigo} — ${r.tercero.nombre}` : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {r.bodega_origen ? `${r.bodega_origen.codigo} — ${r.bodega_origen.nombre}` : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {r.bodega_destino ? `${r.bodega_destino.codigo} — ${r.bodega_destino.nombre}` : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-800">
                            {r.producto ? `${r.producto.codigo_sku} — ${r.producto.nombre}` : r.producto_id || "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{r.talla?.nombre || "Sin talla"}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900">
                            {num(r.cantidad)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={closeHistoryModal}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
