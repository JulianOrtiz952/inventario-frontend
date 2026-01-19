import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchAllPages } from "../utils/api";
import { API_BASE } from "../config/api";

const InventoryContext = createContext();

export function useInventory() {
    const ctx = useContext(InventoryContext);
    if (!ctx) {
        throw new Error("useInventory must be used within an InventoryProvider");
    }
    return ctx;
}

export function InventoryProvider({ children }) {
    // --- Estado de Catálogos ---
    const [catalogs, setCatalogs] = useState({
        bodegas: [],
        terceros: [],
        proveedores: [],
    });

    const [catalogsLoaded, setCatalogsLoaded] = useState(false);
    const [loadingCatalogs, setLoadingCatalogs] = useState(false);
    const [errorCatalogs, setErrorCatalogs] = useState("");

    // Función para cargar los catálogos
    const loadCatalogs = useCallback(async (force = false) => {
        // Si ya están cargados y no se fuerza, no hacer nada
        if (catalogsLoaded && !force) return;

        try {
            setLoadingCatalogs(true);
            setErrorCatalogs("");

            // Cargar todo en paralelo usando fetchAllPages para asegurar que traemos todas
            // aunque paginemos la API.
            const [provAll, bodAll, terAll] = await Promise.all([
                fetchAllPages(`${API_BASE}/proveedores/?page_size=200`),
                fetchAllPages(`${API_BASE}/bodegas/?page_size=200`),
                fetchAllPages(`${API_BASE}/terceros/?page_size=200`),
            ]);

            setCatalogs({
                proveedores: provAll.filter((x) => x.es_activo !== false),
                bodegas: bodAll.filter((x) => x.es_activo !== false),
                terceros: terAll.filter((x) => x.es_activo !== false),
            });

            setCatalogsLoaded(true);
        } catch (err) {
            console.error("Error loading catalogs in context:", err);
            setErrorCatalogs(err.message || "Error cargando catálogos del sistema.");
        } finally {
            setLoadingCatalogs(false);
        }
    }, [catalogsLoaded]);

    // Efecto para cargar automáticamente al montar el provider (app start)
    useEffect(() => {
        loadCatalogs();
    }, [loadCatalogs]);

    // Función para forzar recarga (ej. después de crear una bodega nueva)
    const refreshCatalogs = useCallback(() => {
        return loadCatalogs(true);
    }, [loadCatalogs]);

    const value = {
        // Estado
        catalogs,
        loadingCatalogs,
        errorCatalogs,
        catalogsLoaded,

        // Acciones
        refreshCatalogs,

        // Listas directas helpers
        bodegas: catalogs.bodegas,
        terceros: catalogs.terceros,
        proveedores: catalogs.proveedores,
    };

    return (
        <InventoryContext.Provider value={value}>
            {children}
        </InventoryContext.Provider>
    );
}
