// src/components/CreateProductModal.jsx
import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

export default function CreateProductModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    receta_id: "",
  });

  const [recetas, setRecetas] = useState([]);
  const [search, setSearch] = useState("");

  const [loadingRecetas, setLoadingRecetas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Cuando se abre el modal, limpiamos y cargamos recetas
  useEffect(() => {
    if (!isOpen) return;

    setForm({
      codigo: "",
      nombre: "",
      descripcion: "",
      receta_id: "",
    });
    setSearch("");
    setError("");

    async function loadRecetas() {
      try {
        setLoadingRecetas(true);
        const res = await fetch(`${API_BASE}/recetas/`);
        if (!res.ok) throw new Error("Error al cargar las recetas.");
        const data = await res.json();
        setRecetas(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error cargando recetas.");
      } finally {
        setLoadingRecetas(false);
      }
    }

    loadRecetas();
  }, [isOpen]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const recetasFiltradas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return recetas;
    return recetas.filter((r) => {
      const codigo = (r.codigo || "").toLowerCase();
      const nombre = (r.nombre || "").toLowerCase();
      return codigo.includes(term) || nombre.includes(term);
    });
  }, [recetas, search]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.codigo || !form.nombre) {
      setError("El código y el nombre del producto son obligatorios.");
      return;
    }
    if (!form.receta_id) {
      setError("Debes seleccionar una receta base.");
      return;
    }

    const payload = {
      codigo: form.codigo,
      nombre: form.nombre,
      descripcion: form.descripcion,
      receta_id: form.receta_id,
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/productos/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Error creando producto:", data);
        throw new Error("No se pudo crear el producto.");
      }

      const created = await res.json();
      if (onCreated) onCreated(created);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al crear el producto.");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const recetaSeleccionada =
    recetas.find((r) => String(r.id) === String(form.receta_id)) || null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-5xl max-h-[95vh] overflow-y-auto">
        {/* Header modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-slate-900">
            Nuevo Producto (basado en receta)
          </h1>
          <div className="flex gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="product-modal-form"
              disabled={saving}
              className="px-5 py-2 rounded-md bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-700 disabled:opacity-70"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>

        <form
          id="product-modal-form"
          onSubmit={handleSubmit}
          className="px-6 py-4 space-y-6"
        >
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Info básica */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="text-blue-500 text-lg">ℹ</span>
              <h2 className="text-sm font-semibold text-slate-900">
                Información Básica
              </h2>
            </div>

            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-1">
                <label className="text-xs font-medium text-slate-700">
                  Nombre del producto
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Camisa básica manga larga"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Código / ID
                </label>
                <input
                  type="text"
                  name="codigo"
                  value={form.codigo}
                  onChange={handleChange}
                  placeholder="Ej: PROD-CAM-001"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1 md:col-span-1">
                <label className="text-xs font-medium text-slate-700">
                  Descripción
                </label>
                <input
                  type="text"
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  placeholder="Descripción del producto"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Selección de receta base */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="text-indigo-500 text-lg">📋</span>
              <h2 className="text-sm font-semibold text-slate-900">
                Receta base
              </h2>
            </div>

            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Buscador */}
              <div className="space-y-1 md:col-span-1">
                <label className="text-xs font-medium text-slate-700">
                  Buscar receta (ID o nombre)
                </label>
                <div className="flex items-center bg-white rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <span className="mr-2 text-slate-400 text-sm">🔍</span>
                  <input
                    type="text"
                    className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                    placeholder="Ej: REC-CAM-001 o Camisa básica"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Lista scrollable de recetas */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-700">
                  Seleccionar receta
                </label>
                <div className="border border-slate-200 rounded-md bg-slate-50 max-h-52 overflow-y-auto">
                  {loadingRecetas && (
                    <div className="px-3 py-2 text-xs text-slate-500">
                      Cargando recetas...
                    </div>
                  )}

                  {!loadingRecetas && recetasFiltradas.length === 0 && (
                    <div className="px-3 py-2 text-xs text-slate-500">
                      No se encontraron recetas con ese filtro.
                    </div>
                  )}

                  {!loadingRecetas &&
                    recetasFiltradas.map((r) => {
                      const selected =
                        String(r.id) === String(form.receta_id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              receta_id: r.id,
                            }))
                          }
                          className={`w-full text-left px-3 py-2 text-xs border-b border-slate-100 last:border-b-0 transition-colors ${
                            selected
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="flex justify-between gap-2">
                            <span className="truncate">
                              {r.codigo} — {r.nombre}
                            </span>
                            {selected && <span>✓</span>}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Tela: {r.tela || "—"} · Color: {r.color || "—"} ·
                            Talla: {r.talla || "—"} · Marca: {r.marca || "—"}
                          </p>
                        </button>
                      );
                    })}
                </div>

                {recetaSeleccionada && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Receta seleccionada:{" "}
                    <span className="font-semibold">
                      {recetaSeleccionada.codigo} —{" "}
                      {recetaSeleccionada.nombre}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
