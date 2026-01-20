import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";
import { RotateCcw, Trash2, Pencil, Search, Plus, X } from "lucide-react";
import ConfirmActionModal from "../components/ConfirmActionModal";
import { asRows, buildQueryParams } from "../utils/api";

const PAGE_SIZE = 30;

export default function OperadoresPage() {
    const [operadores, setOperadores] = useState([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [nextUrl, setNextUrl] = useState(null);
    const [prevUrl, setPrevUrl] = useState(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");

    // Modal estado
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null); // operador o null
    const [form, setForm] = useState({ codigo: "", nombre: "" });

    // ACCIONES (Activar/Desactivar)
    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [itemToAction, setItemToAction] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState("");

    async function loadOperadores(targetPage = 1) {
        setError("");
        try {
            setLoading(true);
            const query = buildQueryParams({
                page: targetPage,
                page_size: PAGE_SIZE,
                search,
            });

            const res = await fetch(`${API_BASE}/operadores/${query}`);
            if (!res.ok) throw new Error("Error cargando operadores.");

            const data = await res.json();

            setOperadores(asRows(data));
            setCount(Number(data?.count || 0));
            setNextUrl(data?.next || null);
            setPrevUrl(data?.previous || null);
            setPage(targetPage);
        } catch (e) {
            console.error(e);
            setError(e.message || "Error cargando operadores.");
            setOperadores([]);
            setCount(0);
            setNextUrl(null);
            setPrevUrl(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!search) loadOperadores(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => {
            loadOperadores(1);
        }, 400);
        return () => clearTimeout(t);
    }, [search]);

    function openCreate() {
        setEditing(null);
        setForm({ codigo: "", nombre: "" });
        setError("");
        setIsModalOpen(true);
    }

    function openEdit(o) {
        setEditing(o);
        setForm({ codigo: o.codigo || "", nombre: o.nombre || "" });
        setError("");
        setIsModalOpen(true);
    }

    function closeModal() {
        if (saving) return;
        setIsModalOpen(false);
        setEditing(null);
    }

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!form.codigo || !form.nombre) {
            setError("Código y nombre son obligatorios.");
            return;
        }

        try {
            setSaving(true);

            const isEdit = !!editing?.id;
            const url = isEdit
                ? `${API_BASE}/operadores/${editing.id}/`
                : `${API_BASE}/operadores/`;
            const method = isEdit ? "PATCH" : "POST";
            const payload = { codigo: form.codigo, nombre: form.nombre };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                console.error("Error guardando operador:", data);
                throw new Error(data?.detail || "No se pudo guardar el operador.");
            }

            await loadOperadores(1);
            closeModal();
        } catch (e2) {
            console.error(e2);
            setError(e2.message || "Error guardando operador.");
        } finally {
            setSaving(false);
        }
    }

    const openActionModal = (operador) => {
        setItemToAction(operador);
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
                res = await fetch(`${API_BASE}/operadores/${item.id}/`, { method: "DELETE" });
            } else {
                // Reactivar (Patch)
                res = await fetch(`${API_BASE}/operadores/${item.id}/`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ es_activo: true }),
                });
            }

            if (!res.ok && res.status !== 204) throw new Error(`No se pudo ${action.toLowerCase()} el operador.`);

            closeActionModal();
            await loadOperadores(page);
        } catch (err) {
            setActionError(err.message || `Error al ${action.toLowerCase()} operador.`);
        } finally {
            setActionLoading(false);
        }
    };

    const goPrev = async () => {
        if (!prevUrl || loading) return;
        await loadOperadores(Math.max(1, page - 1));
    };

    const goNext = async () => {
        if (!nextUrl || loading) return;
        await loadOperadores(page + 1);
    };

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 italic tracking-tight">
                        Operadores <span className="text-blue-600 dark:text-blue-400 not-italic">Terceros</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Talleres externos y satélites de confección.
                    </p>
                </div>

                <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                >
                    <Plus size={18} />
                    Nuevo Operador
                </button>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="flex-1 relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <Search size={18} />
                    </span>
                    <input
                        className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 pl-11 pr-4 py-3 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        placeholder="Buscar por código o nombre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <button
                    onClick={() => loadOperadores(page)}
                    className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                    disabled={loading}
                >
                    {loading ? "..." : "Recargar"}
                </button>
            </div>

            {/* Pagination Bar */}
            <div className="flex items-center justify-between gap-3 mb-4 px-1">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Total: <b className="text-slate-900 dark:text-slate-100">{count}</b>
                    <span className="mx-1">•</span>
                    Página <b className="text-slate-900 dark:text-slate-100">{page}</b>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={!prevUrl || loading}
                        onClick={goPrev}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-white dark:hover:bg-slate-900 hover:border-blue-500 transition-all shadow-sm disabled:cursor-not-allowed"
                    >
                        ←
                    </button>
                    <button
                        type="button"
                        disabled={!nextUrl || loading}
                        onClick={goNext}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-white dark:hover:bg-slate-900 hover:border-blue-500 transition-all shadow-sm disabled:cursor-not-allowed"
                    >
                        →
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 px-4 py-3 text-sm text-red-700 dark:text-red-400 mb-6 flex items-center gap-3">
                    <span className="bg-red-100 dark:bg-red-900/50 p-1.5 rounded-lg">⚠️</span>
                    {error}
                </div>
            )}

            {/* Table Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Código</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Nombre</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Estado</th>
                                <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading && operadores.length === 0 && (
                                <tr>
                                    <td className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500" colSpan={4}>
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="animate-pulse">Cargando operadores...</span>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!loading && operadores.length === 0 && (
                                <tr>
                                    <td className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500" colSpan={4}>
                                        No se encontraron operadores registrados.
                                    </td>
                                </tr>
                            )}

                            {operadores.map((o) => {
                                const isActive = o.es_activo !== false;
                                return (
                                    <tr
                                        key={o.id}
                                        className={`group transition-colors duration-200 ${!isActive ? "bg-slate-50/40 dark:bg-slate-800/10" : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"}`}
                                    >
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700">
                                                {o.codigo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className={`text-sm font-semibold ${!isActive ? "text-slate-400 dark:text-slate-600 line-through decoration-slate-300" : "text-slate-700 dark:text-slate-200"}`}>
                                                {o.nombre}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {isActive ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 text-xs font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                    Inactivo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEdit(o)}
                                                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-900 transition-all shadow-sm"
                                                    title="Editar"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => openActionModal(o)}
                                                    className={`p-2 rounded-xl border transition-all shadow-sm bg-white dark:bg-slate-800 ${isActive
                                                        ? "border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                        : "border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                                        }`}
                                                    title={isActive ? "Desactivar" : "Reactivar"}
                                                >
                                                    {isActive ? <Trash2 size={16} /> : <RotateCcw size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Crear/Editar */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>

                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/10">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    {editing ? "Editar Operador" : "Nuevo Operador"}
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Completa la información del taller.</p>
                            </div>
                            <button
                                className="p-2 rounded-xl text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                                onClick={closeModal}
                                disabled={saving}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            {error && (
                                <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs font-medium flex items-center gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-sm">⚠️</span>
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Código del Operador</label>
                                    <input
                                        type="text"
                                        name="codigo"
                                        value={form.codigo}
                                        onChange={handleChange}
                                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                        placeholder="Ej. OP-001"
                                        required
                                        autoFocus={!editing}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Nombre Completo / Razón Social</label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={form.nombre}
                                        onChange={handleChange}
                                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                        placeholder="Ej. Taller Confecciones Calle 10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={saving}
                                    className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-8 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold shadow-xl shadow-blue-500/25 hover:bg-blue-700 disabled:opacity-70 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            Guardando...
                                        </>
                                    ) : (
                                        "Guardar Operador"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmActionModal
                isOpen={actionModalOpen}
                onClose={closeActionModal}
                onConfirm={handleToggleActiveConfirm}
                loading={actionLoading}
                error={actionError}
                title={itemToAction?.es_activo !== false ? "Desactivar Operador" : "Reactivar Operador"}
                message={
                    itemToAction?.es_activo !== false
                        ? <span>¿Estás seguro de que deseas desactivar al operador <strong className="text-slate-900 dark:text-slate-100">{itemToAction?.nombre}</strong>?</span>
                        : <span>¿Deseas reactivar al operador <strong className="text-slate-900 dark:text-slate-100">{itemToAction?.nombre}</strong>?</span>
                }
                description={
                    itemToAction?.es_activo !== false
                        ? "El operador dejará de estar disponible para nuevos registros de producción, pero su historial se mantendrá intacto."
                        : "El operador volverá a estar disponible para ser asignado en el sistema."
                }
                confirmText={itemToAction?.es_activo !== false ? "Desactivar" : "Reactivar"}
                isDestructive={itemToAction?.es_activo !== false}
            />
        </div>
    );
}
