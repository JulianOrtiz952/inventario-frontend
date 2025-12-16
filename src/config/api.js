// src/config/api.js
const raw = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

// normaliza: sin slash final
export const API_BASE = raw.replace(/\/+$/, "");
