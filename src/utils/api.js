import { API_BASE } from "../config/api";

/**
 * Normaliza la respuesta de la API para devolver siempre un array.
 */
export function asRows(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    return [];
}

/**
 * Intento seguro de parsear JSON, evitando errores si la respuesta está vacía.
 */
export async function safeJson(res) {
    const text = await res.text().catch(() => "");
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return { raw: text };
    }
}

/**
 * Helper para traer todas las páginas de un endpoint (útil para catálogos pequeños).
 */
export async function fetchAllPages(url, { maxPages = 20 } = {}) {
    const all = [];
    let next = url;
    let pages = 0;

    while (next && pages < maxPages) {
        const res = await fetch(next);
        if (!res.ok) break;

        const data = await res.json();
        const rows = asRows(data);
        all.push(...rows);

        next = data?.next || null;
        pages += 1;
    }
    return all;
}

/**
 * Formatea parámetros de URL de forma limpia.
 */
export function buildQueryParams(params) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "" && val !== "todos") {
            q.append(key, val);
        }
    });
    const str = q.toString();
    return str ? `?${str}` : "";
}
