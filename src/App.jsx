// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

import TopBar from "./components/TopBar";
import SideNav from "./components/SideNav";

// Tus páginas
import InventoryPage from "./pages/InventoryPage";
import ProductsPage from "./pages/ProductsPage";
import RecipesPage from "./pages/RecipesPage";
import WarehousesPage from "./pages/WarehousesPage";
import ProductionSimulationPage from "./pages/ProductionSimulationPage"; // si la usas

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
              <Route path="/recetas" element={<RecipesPage />} />
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
