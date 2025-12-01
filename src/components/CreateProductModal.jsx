// src/components/CreateProductModal.jsx
import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

export default function CreateProductModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    tela: "",
    color: "",
    talla: "",
    marca: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Cuando se abre el modal, limpiamos el formulario
  useEffect(() => {
    if (!isOpen) return;

    setForm({
      codigo: "",
      nombre: "",
      descripcion: "",
      tela: "",
      color: "",
      talla: "",
      marca: "",
    });
    setError("");
  }, [isOpen]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.codigo || !form.nombre) {
      setError("El código y el nombre del producto son obligatorios.");
      return;
    }

    const payload = {
      codigo: form.codigo,
      nombre: form.nombre,
      descripcion: form.descripcion,
      tela: form.tela,
      color: form.color,
      talla: form.talla,
      marca: form.marca,
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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        {/* Header modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-slate-900">
            Nuevo producto
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

          {/* Información básica */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="text-blue-500 text-lg">ℹ</span>
              <h2 className="text-sm font-semibold text-slate-900">
                Información básica
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
                  placeholder="Ej: CAM-001"
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

          {/* Atributos del producto */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="text-indigo-500 text-lg">🎨</span>
              <h2 className="text-sm font-semibold text-slate-900">
                Atributos del producto
              </h2>
            </div>

            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Tela
                </label>
                <input
                  type="text"
                  name="tela"
                  value={form.tela}
                  onChange={handleChange}
                  placeholder="Ej: Algodón"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Color
                </label>
                <input
                  type="text"
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  placeholder="Ej: Blanco"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Talla
                </label>
                <input
                  type="text"
                  name="talla"
                  value={form.talla}
                  onChange={handleChange}
                  placeholder="Ej: S, M, L"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Marca
                </label>
                <input
                  type="text"
                  name="marca"
                  value={form.marca}
                  onChange={handleChange}
                  placeholder="Ej: García"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
