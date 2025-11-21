// src/layout/AppLayout.jsx
import TopBar from "../components/TopBar";
import SideNav from "../components/SideNav";

export default function AppLayout({ currentPage, onNavigate, children }) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <TopBar />

      <div className="flex flex-1">
        <SideNav currentPage={currentPage} onNavigate={onNavigate} />

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 overflow-y-auto">
          {/* En móvil, un pequeño selector de sección */}
          <div className="md:hidden mb-4">
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              value={currentPage}
              onChange={(e) => onNavigate(e.target.value)}
            >
              <option value="inventario">Inventario de insumos</option>
              <option value="productos">Productos / Recetas</option>
            </select>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
