import { NavLink } from "react-router-dom";

const IconBox = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M21 8.5l-9 5-9-5M3 8.5l9-5 9 5v10l-9 5-9-5v-10z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const IconHandshake = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M8 12l3-3a3 3 0 014 0l1 1M7 13l2 2a2 2 0 002.8 0l.2-.2M3 12l4-4 5 5M21 12l-4-4-2 2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconWarehouse = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M3 9l9-5 9 5v11H3V9z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M7 20v-7h3v7M14 20v-7h3v7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const IconTag = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M20 13l-7 7-10-10V3h7L20 13z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 7.5h.01"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const IconClipboard = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M9 4h6l1 2h3v16H5V6h3l1-2z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M9 11h10M9 15h10M9 19h10"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconUsers = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M16 11a4 4 0 10-8 0 4 4 0 008 0z"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M4 21a8 8 0 0116 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconTshirt = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M8 5l4 3 4-3 4 3-2 4v12H6V12L4 8l4-3z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

// ✅ Nuevo icono para historial
const IconHistory = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M3 12a9 9 0 101.8-5.4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M3 4v5h5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 7v6l4 2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const navItems = [
  { id: "inventario", label: "Inventario de insumos", icon: IconBox, path: "/" },

  // ✅ NUEVO
  { id: "kardex_insumos", label: "Historial insumos (Kardex)", icon: IconHistory, path: "/insumos-historial" },

  { id: "proveedores", label: "Proveedores", icon: IconHandshake, path: "/proveedores" },
  { id: "bodegas", label: "Bodegas", icon: IconWarehouse, path: "/bodegas" },
  { id: "productos", label: "Productos y recetas", icon: IconTag, path: "/productos" },
  { id: "nota_ensamble", label: "Notas de ensamble", icon: IconClipboard, path: "/nota_ensamble" },
  { id: "terceros", label: "Terceros", icon: IconUsers, path: "/terceros" },
  { id: "tallas", label: "Tallas", icon: IconTshirt, path: "/tallas" },
  { id: "salidas_producto", label: "Notas de salida", icon: IconClipboard, path: "/salidas-producto" },
];

export default function SideNav() {
  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-slate-200">
      <div className="px-4 py-4 border-b border-slate-100">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Menú</p>
      </div>

      <nav className="flex-1 py-3">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `group w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`
                  }
                >
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center border transition-colors
                    border-slate-200 text-slate-500 group-hover:text-slate-700 group-hover:border-slate-300
                    group-[.active]:border-white/20 group-[.active]:text-white"
                  >
                    <Icon />
                  </span>

                  <span className="truncate font-medium">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-200 px-4 py-3">
        <p className="text-[10px] text-slate-400">© {new Date().getFullYear()} CALA</p>
      </div>
    </aside>
  );
}
