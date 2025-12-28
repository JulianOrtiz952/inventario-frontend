// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

import TopBar from "./components/TopBar";
import SideNav from "./components/SideNav";

// Tus páginas
import InventoryPage from "./pages/InventoryPage";
import ProvidersPage from "./pages/ProvidersPage";
import ProductsPage from "./pages/ProductsPage";
import RecipesPage from "./pages/RecipesPage";
import WarehousesPage from "./pages/WarehousesPage";
import ProductionSimulationPage from "./pages/ProductionSimulationPage"; // si la usas
import TercerosPage from "./pages/TercerosPage";
import TallasPage from "./pages/TallasPage";
import NotasEnsamblePage from "./pages/NotasEnsamblePage";
import SalidasProductoPage from "./pages/SalidasProductoPage";
import InsumosHistorialPage from "./pages/InsumosHistorialPage";
import ExcelImportPage from "./pages/ExcelImportPage";
import ReportesPage from "./pages/ReportesPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-100">
        {/* TOP BAR */}
        <TopBar />

        <div className="flex flex-1">
          {/* SIDE NAV */}
          <SideNav />

          {/* MAIN CONTENT */}
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<InventoryPage />} />
              <Route path="/bodegas" element={<WarehousesPage />} /> 
              <Route path="/productos" element={<ProductsPage />} />
              <Route path="/nota_ensamble" element={<NotasEnsamblePage />} />
              <Route path="/terceros" element={<TercerosPage />} />
              <Route path="/tallas" element={<TallasPage />} />
              <Route path="/proveedores" element={<ProvidersPage />} />
              <Route path="/salidas-producto" element={<SalidasProductoPage />} />
              <Route path="/insumos-historial" element={<InsumosHistorialPage />} />
              <Route path="/importar-excel" element={<ExcelImportPage />} />
              <Route path="/reportes" element={<ReportesPage />} />
              <Route
                path="/simulacion"
                element={<ProductionSimulationPage />}
              />

              {/* fallback */}
              <Route path="*" element={<InventoryPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
