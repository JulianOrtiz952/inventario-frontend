// src/components/SideNav.jsx
import { NavLink } from "react-router-dom";

const navItems = [
  {
    id: "inventario",
    label: "Inventario de insumos",
    icon: "📦",
    path: "/",
  },
  {
    id: "bodegas",            // 👈 NUEVO
    label: "Bodegas",
    icon: "🏬",
    path: "/bodegas",
  },
  {
    id: "productos",
    label: "Productos / Recetas",
    icon: "🧵",
    path: "/productos",
  },
  {
    id: "recetas",
    label: "Nueva receta",
    icon: "📋",
    path: "/recetas",
  },
  {
    id: "simulacion",
    label: "Simulación de creación",
    icon: "🧪",
    path: "/simulacion",
  },
];

export default function SideNav() {
  return (
    <aside className="hidden md:flex md:flex-col w-60 bg-white border-r border-slate-200">
      <nav className="flex-1 py-4">
        <p className="px-4 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          Menú principal
        </p>

        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-2 text-sm rounded-r-full border-l-4 transition-colors ${
                    isActive
                      ? "bg-blue-50 border-blue-600 text-blue-700 font-medium"
                      : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-200 px-4 py-3">
        <p className="text-[10px] text-slate-400">
          © {new Date().getFullYear()} Sistema de Inventario
        </p>
      </div>
    </aside>
  );
}
