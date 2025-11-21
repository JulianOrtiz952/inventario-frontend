// src/components/TopBar.jsx
export default function TopBar() {
  return (
    <header className="h-14 px-6 flex items-center justify-between bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
          IN
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-slate-900">
            Inventario & Recetas
          </span>
          <span className="text-[11px] text-slate-500">
            Gestión de insumos y productos
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 text-[11px] font-medium text-slate-600 hover:bg-slate-200">
          <span className="text-xs">●</span>
          Ambiente de prueba
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
            H
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-xs font-medium text-slate-800">
              Usuario demo
            </span>
            <span className="text-[10px] text-slate-500">
              Administrador
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
