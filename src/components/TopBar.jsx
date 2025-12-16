// src/components/TopBar.jsx
export default function TopBar() {
  return (
    <header className="h-14 px-6 flex items-center justify-between bg-white border-b border-slate-200 shadow-sm">
      {/* IZQUIERDA: Marca */}
      <div className="flex items-center gap-3">
        {/* Logo / Identificador */}
        <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm font-bold tracking-wide">
          CALA
        </div>

        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-slate-900">
            CALA · Inventario y Producción
          </span>
          <span className="text-[11px] text-slate-500">
            Gestión de insumos, productos y ensambles
          </span>
        </div>
      </div>

      {/* DERECHA: Estado + Usuario */}
      <div className="flex items-center gap-5">
        {/* Estado del sistema */}
        <span className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-[11px] font-medium text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Sistema operativo
        </span>

        {/* Usuario */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
            H
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-xs font-medium text-slate-800">
              Camilo García
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
