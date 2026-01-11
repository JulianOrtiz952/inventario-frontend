import { useTheme } from "../context/ThemeContext";

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export default function TopBar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-14 px-6 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
      {/* IZQUIERDA: Marca */}
      <div className="flex items-center gap-3">
        {/* Logo / Identificador */}
        <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white flex items-center justify-center text-sm font-bold tracking-wide">
          CALA
        </div>

        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            CALA · Inventario y Producción
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Gestión de insumos, productos y ensambles
          </span>
        </div>
      </div>

      {/* DERECHA: Estado + Moon/Sun + Usuario */}
      <div className="flex items-center gap-3">
        {/* Toggle Dark Mode */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle dark mode"
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1"></div>

        {/* Estado del sistema */}
        <span className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Sistema operativo
        </span>

        {/* Usuario */}
        <div className="flex items-center gap-2 ml-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-300">
            H
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
              Camilo García
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Administrador
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
