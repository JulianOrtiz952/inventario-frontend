import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";
import { RotateCcw, Trash2, Pencil } from "lucide-react";
import ConfirmActionModal from "../components/ConfirmActionModal";

import { formatCurrency } from "../utils/format";

const PAGE_SIZE = 30;

const num = (n) => formatCurrency(n);
const money = (n) => `$${formatCurrency(n)}`;

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
  // ✅ Paginación Bodegas principal
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

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

  // ✅ HISTORIAL
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyRows, setHistoryRows] = useState([]);

  // ✅ TRASLADOS (MASIVO)
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [transferOk, setTransferOk] = useState("");
  const [terceros, setTerceros] = useState([]);
  const [tallas, setTallas] = useState([]);

  // Cabecera del traslado
  const [transferHeader, setTransferHeader] = useState({
    bodega_origen_id: "",
    bodega_destino_id: "",
    tercero_id: "",
  });

  // Items agregados a la lista
  const [transferItems, setTransferItems] = useState([]);

  // Formulario para "Agregar Item"
  const [itemForm, setItemForm] = useState({
    producto_id: "",     // SKU
    producto_nombre: "",
    talla_id: "",        // ID de Talla o ""
    cantidad: "",
  });

  const [itemError, setItemError] = useState("");


  // Stock disponible (para validación visual al agregar)
  const [itemStockInfo, setItemStockInfo] = useState(null); // { disponible: 10, talla_nombre: "M" }
  const [itemStockLoading, setItemStockLoading] = useState(false);

  // Lista de productos disponibles en la bodega origen (para el select)
  const availableProducts = useMemo(() => {
    return details?.productos || [];
  }, [details]);

  // Lista de tallas disponibles para el producto seleccionado (fetched on demand)
  const [availableSizes, setAvailableSizes] = useState([]);

  // ✅ ACCIONES (Activar/Desactivar)
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [itemToAction, setItemToAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // =========================
  // Cargar bodegas
  // =========================
  async function loadBodegas(targetPage = 1) {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.append("page", targetPage);
      params.append("page_size", PAGE_SIZE);
      if (search) params.append("search", search);

      const res = await fetch(`${API_BASE}/bodegas/?${params.toString()}`);
      if (!res.ok) throw new Error("No se pudieron cargar las bodegas.");

      const data = await res.json();

      // ✅ soporta lista normal o respuesta paginada {results: []}
      const rows = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setBodegas(rows);
      setCount(Number(data?.count || 0));
      setNextUrl(data?.next || null);
      setPrevUrl(data?.previous || null);
      setPage(targetPage);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar bodegas.");
      setBodegas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!search) loadBodegas(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      loadBodegas(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // ELIMINADO client-side filtering
  // const bodegasFiltradas = ...

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

      if (!res.ok) {
        const errorData = await safeJson(res);
        if (errorData) {
          // Si es un error de validación {nombre: [...], codigo: [...]}
          const firstKey = Object.keys(errorData)[0];
          const firstMsg = Array.isArray(errorData[firstKey]) ? errorData[firstKey][0] : errorData[firstKey];

          // Mensajes amigables para duplicados
          const strError = JSON.stringify(errorData).toLowerCase();
          if (strError.includes("unique") || strError.includes("ya existe") || strError.includes("with this nombre already exists")) {
            if (errorData.nombre) throw new Error("Ya existe una bodega con este Nombre.");
            if (errorData.codigo) throw new Error("Ya existe una bodega con este Código.");
          }

          // Fallback genérico con el primer mensaje que venga
          if (firstMsg) throw new Error(firstMsg);
        }
        throw new Error("No se pudo guardar la bodega.");
      }

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

  const openActionModal = (bodega) => {
    setItemToAction(bodega);
    setActionError("");
    setActionModalOpen(true);
  };

  const closeActionModal = () => {
    if (actionLoading) return;
    setActionModalOpen(false);
    setItemToAction(null);
  };

  const handleToggleActiveConfirm = async () => {
    if (!itemToAction) return;

    const item = itemToAction;
    const isActive = item.es_activo !== false;
    const action = isActive ? "Desactivar" : "Reactivar";

    try {
      setActionLoading(true);
      let res;
      if (isActive) {
        // Desactivar (Soft Delete)
        res = await fetch(`${API_BASE}/bodegas/${item.id}/`, { method: "DELETE" });
      } else {
        // Reactivar (Patch)
        res = await fetch(`${API_BASE}/bodegas/${item.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ es_activo: true }),
        });
      }

      if (!res.ok && res.status !== 204) throw new Error(`No se pudo ${action.toLowerCase()} la bodega.`);

      closeActionModal();
      await loadBodegas(page);
    } catch (err) {
      setActionError(err.message || `Error al ${action.toLowerCase()} bodega.`);
    } finally {
      setActionLoading(false);
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


  async function openTransferModal(initialSku = null, initialName = null) {
    if (!selectedBodega) return;

    setTransferError("");
    setTransferOk("");
    setIsTransferOpen(true);

    // Resetear formulario
    setTransferHeader({
      bodega_origen_id: selectedBodega.id,
      bodega_destino_id: "",
      tercero_id: "",
    });
    setTransferItems([]);

    // Si viene un producto pre-seleccionado, lo configuramos
    setItemForm({
      producto_id: initialSku || "",
      producto_nombre: initialName || "",
      talla_id: "",
      cantidad: ""
    });

    setAvailableSizes([]);
    setItemStockInfo(null);

    try {
      await ensureTransferListsLoaded();

      // Si hay producto inicial, cargar sus tallas de inmediato
      if (initialSku) {
        setItemStockLoading(true);
        const res = await fetch(`${API_BASE}/productos/${initialSku}/stock-por-talla/?bodega_id=${selectedBodega.id}`);
        if (res.ok) {
          const data = await res.json();
          const sizes = (data.items || [])
            .filter(i => (i.cantidad || 0) > 0)
            .map(i => ({
              id: i.talla_id,
              nombre: i.talla || "Única",
              stock: i.cantidad
            }));
          setAvailableSizes(sizes);
        }
        setItemStockLoading(false);
      }
    } catch (e) {
      console.error(e);
      setItemStockLoading(false);
    }
  }

  function closeTransferModal() {
    if (transferLoading) return;
    setIsTransferOpen(false);
    setTransferLoading(false);
    setTransferError("");
    setTransferOk("");
  }

  // Al seleccionar producto, cargar tallas disponibles (según stock en esta bodega)
  async function handleProductChange(e) {
    const sku = e.target.value;
    const prod = availableProducts.find(p => p.codigo === sku);

    setItemForm({
      producto_id: sku,
      producto_nombre: prod ? prod.nombre : "",
      talla_id: "",
      cantidad: "",
    });
    setAvailableSizes([]);
    setItemStockInfo(null);
    setItemError("");

    if (!sku) return;

    // Cargar stock por talla de este producto en ESTA bodega
    try {
      setItemStockLoading(true);
      const res = await fetch(`${API_BASE}/productos/${sku}/stock-por-talla/?bodega_id=${selectedBodega.id}`);
      if (res.ok) {
        const data = await res.json();
        // data.items = [{ talla__id, talla__nombre, cantidad }]
        // Mapeamos a formato select
        // OJO: data.items trae las tallas que TIENEN stock.
        // Si quieres permitir mover algo que no tiene stock (imposible), no deberías.
        // Así que usar esto como fuente de tallas es correcto.
        const sizes = (data.items || [])
          .filter(i => (i.cantidad || 0) > 0)
          .map(i => ({
            id: i.talla_id,
            nombre: i.talla || "Única",
            stock: i.cantidad
          }));
        setAvailableSizes(sizes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setItemStockLoading(false);
    }
  }

  function handleSizeChange(e) {
    const tid = e.target.value; // ID o ""
    // Buscar stock real en availableSizes
    const s = tid
      ? availableSizes.find(x => String(x.id) === String(tid))
      : availableSizes.find(x => x.id === null);

    let stockReal = s ? Number(s.stock) : 0;
    let tname = s ? s.nombre : (tid ? "-" : "Única");

    // Calcular cuánto ya tenemos "reservado" en la lista de items
    const reserved = transferItems.reduce((acc, item) => {
      // Coincide producto Y talla (considerando nulos)
      const sameProd = item.producto_id === itemForm.producto_id;
      // La comparación de tallas debe ser segura con strings/numbers/nulls
      // itemForm.talla_id es string del select. item.talla_id es lo que guardamos (puede ser number o string).
      // Uniformamos a string para comparar.
      const itemTid = item.talla_id ? String(item.talla_id) : "";
      const currentTid = tid ? String(tid) : "";
      const sameSize = itemTid === currentTid;

      if (sameProd && sameSize) {
        return acc + Number(item.cantidad || 0);
      }
      return acc;
    }, 0);

    const stockDisponible = Math.max(0, stockReal - reserved);
    setItemStockInfo({ disponible: stockDisponible, talla_nombre: tname });

    setItemForm(prev => ({ ...prev, talla_id: tid }));
    setItemError("");
  }

  function addItem(e) {
    e.preventDefault();
    setItemError("");

    if (!itemForm.producto_id) return;
    if (!itemForm.cantidad || Number(itemForm.cantidad) <= 0) {
      setItemError("Cantidad inválida");
      return;
    }

    // Validar stock visual
    if (itemStockInfo) {
      if (Number(itemForm.cantidad) > Number(itemStockInfo.disponible)) {
        setItemError(`No tienes suficiente stock de ${itemStockInfo.talla_nombre}. Disponible real: ${itemStockInfo.disponible}`);
        return;
      }
    }

    // Agregar a lista
    const newItem = {
      ...itemForm,
      tempId: Date.now(), // para key única
      talla_nombre: itemStockInfo ? itemStockInfo.talla_nombre : (itemForm.talla_id ? "..." : "Única")
    };

    setTransferItems(prev => [...prev, newItem]);

    // Limpiar inputs parciales
    setItemForm(prev => ({ ...prev, talla_id: "", cantidad: "" }));
    setItemStockInfo(null);
    // Nota: No limpiamos producto para facilitar agregar otra talla del mismo
  }

  function removeItem(tempId) {
    setTransferItems(prev => prev.filter(i => i.tempId !== tempId));
  }

  async function submitTransfer() {
    if (!selectedBodega) return;

    setTransferLoading(true);
    setTransferError("");
    setTransferOk("");

    try {
      if (!transferHeader.tercero_id) throw new Error("Selecciona el tercero.");
      if (!transferHeader.bodega_destino_id) throw new Error("Selecciona la bodega destino.");
      if (transferItems.length === 0) throw new Error("Agrega al menos un producto para trasladar.");

      const payload = {
        tercero_id: Number(transferHeader.tercero_id),
        bodega_origen_id: Number(transferHeader.bodega_origen_id),
        bodega_destino_id: Number(transferHeader.bodega_destino_id),
        items: transferItems.map(i => ({
          producto_id: i.producto_id,
          talla_id: i.talla_id ? String(i.talla_id) : null,
          cantidad: String(i.cantidad)
        }))
      };

      const res = await fetch(`${API_BASE}/traslados-producto/ejecutar-masivo/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await safeJson(res);
        const msg = data?.detail ||
          (data?.stock_insuficiente ?
            `Stock insuficiente: ${data.stock_insuficiente.producto} (Faltan ${data.stock_insuficiente.faltante})`
            : "No se pudo ejecutar el traslado.");
        throw new Error(msg);
      }

      const respData = await res.json();
      setTransferOk(`Traslado realizado con éxito. Items movidos: ${respData.items_movidos}`);

      setTransferItems([]);
      await openDetails(selectedBodega);

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
    <div className="flex-1 p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 overflow-auto">
      <section className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Bodegas</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Administra las bodegas donde se almacenan insumos y productos.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm">
              <span className="text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, nombre o ubicación..."
                className="bg-transparent outline-none text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 w-56 md:w-72"
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

        {/* Paginación */}
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total: <b className="text-slate-900 dark:text-slate-100">{count}</b> • Página <b className="text-slate-900 dark:text-slate-100">{page}</b>
            <span className="ml-2 text-[11px] text-slate-400 dark:text-slate-500">(mostrando {PAGE_SIZE} por página)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!prevUrl || loading}
              onClick={() => loadBodegas(Math.max(1, page - 1))}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              ← Anterior
            </button>
            <button
              type="button"
              disabled={!nextUrl || loading}
              onClick={() => loadBodegas(page + 1)}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>

        <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
          {loading && <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Cargando bodegas...</div>}
          {error && !loading && <div className="p-6 text-sm text-red-600 dark:text-red-400">{error}</div>}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                  <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Código</th>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Ubicación</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-right">Insumos</th>
                    <th className="px-4 py-3 text-right">Productos</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {bodegas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-6 text-center text-sm text-slate-500">
                        No se encontraron bodegas.
                      </td>
                    </tr>
                  )}

                  {bodegas.map((b) => {
                    const isActive = b.es_activo !== false;
                    return (
                      <tr key={b.id} className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${!isActive ? "bg-slate-50/70 dark:bg-slate-800/20" : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"}`} >
                        <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 font-mono">{b.codigo}</td>
                        <td className={`px-4 py-3 text-sm font-medium ${!isActive ? "text-slate-400 dark:text-slate-600 line-through decoration-slate-300 dark:decoration-slate-700" : "text-slate-700 dark:text-slate-200"}`}>
                          {b.nombre}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 hidden md:table-cell">{b.ubicacion || "—"}</td>
                        <td className="px-4 py-3 text-xs">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-slate-700 dark:text-slate-300">{b.insumos_count ?? 0}</td>
                        <td className="px-4 py-3 text-sm text-right text-slate-700 dark:text-slate-300">{b.productos_count ?? 0}</td>
                        <td className="px-4 py-3 text-xs text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openDetails(b)}
                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors"
                            >
                              Ver
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(b)}
                              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-900"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openActionModal(b)}
                              className={`p-1.5 rounded-md border transition-colors bg-white dark:bg-slate-900 ${isActive
                                ? "border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                : "border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                }`}
                              title={isActive ? "Desactivar" : "Reactivar"}
                            >
                              {isActive ? <Trash2 size={14} /> : <RotateCcw size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal Confirmación Acción Estilizado */}
        <ConfirmActionModal
          isOpen={actionModalOpen}
          onClose={closeActionModal}
          onConfirm={handleToggleActiveConfirm}
          loading={actionLoading}
          error={actionError}
          title={itemToAction?.es_activo !== false ? "Desactivar Bodega" : "Reactivar Bodega"}
          message={
            itemToAction?.es_activo !== false
              ? <span>¿Estás seguro de que deseas desactivar la bodega <strong>{itemToAction?.nombre}</strong>?</span>
              : <span>¿Deseas reactivar la bodega <strong>{itemToAction?.nombre}</strong>?</span>
          }
          description={
            itemToAction?.es_activo !== false
              ? "La bodega dejará de ser visible en nuevos registros."
              : "La bodega volverá a estar activa."
          }
          confirmText={itemToAction?.es_activo !== false ? "Desactivar" : "Reactivar"}
          isDestructive={itemToAction?.es_activo !== false}
        />
      </section>

      {/* Modal crear/editar bodega */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-md border border-slate-200 dark:border-slate-800">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {editingId ? "Editar bodega" : "Nueva bodega"}
              </h2>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Código</label>
                <input
                  type="text"
                  name="codigo"
                  value={form.codigo}
                  onChange={handleChange}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Ubicación</label>
                <input
                  type="text"
                  name="ubicacion"
                  value={form.ubicacion}
                  onChange={handleChange}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Descripción</label>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {saveError && <p className="text-xs text-red-600">{saveError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 dark:bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-6xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Contenido de bodega</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedBodega ? `${selectedBodega.codigo} — ${selectedBodega.nombre}` : ""}
                </p>
                {detailsError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{detailsError}</p>}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openHistoryModal}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Historial traslados
                </button>

                <button type="button" onClick={closeDetails} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-xl">
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 overflow-auto">
              {/* Insumos */}
              <div className="flex flex-col">
                <div className="px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
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
                      <thead className="text-[10px] text-slate-500 dark:text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
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
                          <tr key={i.codigo} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2 pr-2 text-slate-800 dark:text-slate-300">{i.codigo}</td>
                            <td className="py-2 pr-2 text-slate-800 dark:text-slate-300">{i.nombre}</td>
                            <td className="py-2 pr-2 text-right tabular-nums dark:text-slate-300">{num(i.stock_actual)}</td>
                            <td className="py-2 pr-2 text-right tabular-nums dark:text-slate-300">{money(i.costo_unitario)}</td>
                            <td className="py-2 text-right tabular-nums font-medium dark:text-slate-100">{money(i.valor_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Productos */}
              <div className="flex flex-col">
                <div className="px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
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
                      <thead className="text-[10px] text-slate-500 dark:text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="py-2 pr-2 text-left">Código</th>
                          <th className="py-2 pr-2 text-left">Nombre</th>
                          <th className="py-2 pr-2 text-right">Cantidad</th>
                          <th className="py-2 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.productos
                          .filter(p => (Number(p.total_producido) || 0) > 0)
                          .map((p, idx) => (
                            <tr key={`${p.codigo}-${idx}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-2 pr-2 text-slate-800 dark:text-slate-300">{p.codigo}</td>
                              <td className="py-2 pr-2 text-slate-800 dark:text-slate-300">{p.nombre}</td>
                              <td className="py-2 pr-2 text-right tabular-nums font-medium dark:text-slate-100">{num(p.total_producido)} u</td>
                              <td className="py-2 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openStockPorTallas(p.codigo)}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-3xl max-h-[85vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Stock por tallas</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  SKU: <b className="dark:text-slate-200">{stockHeader?.codigo || stockSku || "—"}</b> • {stockHeader?.nombre || "—"}
                </p>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" onClick={closeStockModal}>
                ✕
              </button>
            </div>

            <div className="px-6 py-4">
              {stockLoading && <div className="text-xs text-slate-500 dark:text-slate-400">Cargando...</div>}

              {stockError && !stockLoading && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 px-4 py-3 text-xs text-red-700 dark:text-red-400">
                  {stockError}
                </div>
              )}

              {!stockLoading && !stockError && (
                <>
                  {stockItems.length === 0 ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400">No hay tallas registradas para este producto.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                          <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            <th className="px-3 py-2 text-left">Código</th>
                            <th className="px-3 py-2 text-left">Nombre</th>
                            <th className="px-3 py-2 text-left">Talla</th>
                            <th className="px-3 py-2 text-right">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockItems.map((it, idx) => (
                            <tr key={`${it.codigo}-${it.talla}-${idx}`} className="border-b border-slate-100 dark:border-slate-800">
                              <td className="px-3 py-2 text-slate-800 dark:text-slate-300">{it.codigo}</td>
                              <td className="px-3 py-2 text-slate-800 dark:text-slate-300">{it.nombre}</td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-400">{it.talla}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-slate-900 dark:text-slate-100 font-medium">
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

      {/* ✅ Modal Traslado (MASIVO) */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Traslado de Productos</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Origen: <b className="dark:text-slate-300">{selectedBodega ? selectedBodega.nombre : ""}</b>
                </p>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" onClick={closeTransferModal}>
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Mensajes */}
              {transferError && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 px-4 py-3 text-xs text-red-700 dark:text-red-400">
                  {transferError}
                </div>
              )}
              {transferOk && (
                <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-400">
                  {transferOk}
                </div>
              )}

              {/* 1. Cabecera */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Bodega destino</label>
                  <select
                    value={transferHeader.bodega_destino_id}
                    onChange={e => setTransferHeader({ ...transferHeader, bodega_destino_id: e.target.value })}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Selecciona destino…</option>
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
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Tercero (quién traslada)</label>
                  <select
                    value={transferHeader.tercero_id}
                    onChange={e => setTransferHeader({ ...transferHeader, tercero_id: e.target.value })}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Selecciona tercero…</option>
                    {terceros.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.codigo} — {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />

              {/* 2. Agregar Item */}
              <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">Agregar item al traslado</h4>
                <form onSubmit={addItem} className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1 space-y-1 w-full md:w-auto">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Producto</label>
                    <select
                      value={itemForm.producto_id}
                      onChange={handleProductChange}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Selecciona producto ({availableProducts.length})</option>
                      {availableProducts.map(p => (
                        <option key={p.codigo} value={p.codigo}>
                          {p.codigo} — {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full md:w-48 space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Talla
                      {itemStockLoading && <span className="text-indigo-500 dark:text-indigo-400 ml-1">(Cargando...)</span>}
                    </label>
                    <select
                      value={itemForm.talla_id}
                      onChange={handleSizeChange}
                      disabled={!itemForm.producto_id}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 disabled:text-slate-400"
                    >
                      <option value="">Selecciona talla...</option>
                      {availableSizes.map(s => (
                        <option key={s.id || "null"} value={s.id || ""}>
                          {s.nombre} (Stock: {num(s.stock)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full md:w-32 space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Cantidad</label>
                    <input
                      type="text"
                      placeholder="0"
                      value={itemForm.cantidad}
                      onChange={e => {
                        // Solo números enteros
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setItemForm({ ...itemForm, cantidad: val });
                      }}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!itemForm.producto_id || !itemForm.cantidad}
                    className="w-full md:w-auto px-4 py-2 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Agregar
                  </button>
                </form>

                {/* Feedback de error al agregar */}
                {itemError && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                    ⚠️ {itemError}
                  </div>
                )}

                {/* Feedback de stock */}
                {itemStockInfo && (
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    Stock disponible de <b className="dark:text-slate-200">{itemStockInfo.talla_nombre}</b>: <span className="font-medium text-slate-800 dark:text-slate-200">{num(itemStockInfo.disponible)}</span>
                  </div>
                )}
              </div>

              {/* 3. Lista de Items */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                  Items a trasladar ({transferItems.length})
                </h4>
                {transferItems.length === 0 ? (
                  <div className="text-xs text-slate-400 dark:text-slate-500 italic py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center">
                    No has agregado items todavía.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-3 py-2">Producto</th>
                          <th className="px-3 py-2">Talla</th>
                          <th className="px-3 py-2 text-right">Cantidad</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {transferItems.map(item => (
                          <tr key={item.tempId}>
                            <td className="px-3 py-2">
                              <div className="font-medium text-slate-800 dark:text-slate-200">{item.producto_id}</div>
                              <div className="text-slate-500 dark:text-slate-400 text-[10px]">{item.producto_nombre}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{item.talla_nombre}</td>
                            <td className="px-3 py-2 text-right font-medium text-slate-800 dark:text-slate-100">{num(item.cantidad)}</td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => removeItem(item.tempId)}
                                className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                                title="Quitar"
                              >×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={closeTransferModal}
                className="px-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                disabled={transferLoading}
              >
                Cancelar
              </button>
              <button
                onClick={submitTransfer}
                className="px-4 py-2 text-xs rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60 shadow-sm shadow-indigo-200"
                disabled={transferLoading || transferItems.length === 0}
              >
                {transferLoading ? "Procesando..." : "Confirmar Traslado Masivo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Modal Historial */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Historial de traslados</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedBodega ? <span className="dark:text-slate-300">{selectedBodega.codigo} — {selectedBodega.nombre}</span> : ""}
                </p>
                {historyError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{historyError}</p>}
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" onClick={closeHistoryModal}>
                ✕
              </button>
            </div>

            <div className="p-6 overflow-auto flex-1">
              {/* ✅ Barra paginación */}
              <div className="flex items-center justify-between gap-3 pb-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Total: <b className="dark:text-slate-200">{historyCount}</b> • Página <b className="dark:text-slate-200">{historyPage}</b>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!historyPrev || historyLoading}
                    onClick={() => loadHistory(Math.max(1, historyPage - 1))}
                    className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    ← Anterior
                  </button>

                  <button
                    type="button"
                    disabled={!historyNext || historyLoading}
                    onClick={() => loadHistory(historyPage + 1)}
                    className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
                    <thead className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <tr className="text-xs font-semibold uppercase tracking-wide">
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
                        <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors text-slate-700 dark:text-slate-300">
                          <td className="px-3 py-2 text-xs">
                            {r.creado_en ? new Date(r.creado_en).toLocaleString("es-CO") : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-800 dark:text-slate-200">
                            {r.tercero ? `${r.tercero.codigo} — ${r.tercero.nombre}` : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {r.bodega_origen ? `${r.bodega_origen.codigo} — ${r.bodega_origen.nombre}` : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {r.bodega_destino ? `${r.bodega_destino.codigo} — ${r.bodega_destino.nombre}` : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-800 dark:text-slate-200">
                            {r.producto ? `${r.producto.codigo_sku} — ${r.producto.nombre}` : r.producto_id || "—"}
                          </td>
                          <td className="px-3 py-2">{r.talla?.nombre || "Sin talla"}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900 dark:text-slate-100">
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
