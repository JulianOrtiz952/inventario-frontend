// src/config/api.js
const raw =  "http://127.0.0.1:8000/api";
//import.meta.env.VITE_API_BASE ||

// normaliza: sin slash final
export const API_BASE = raw.replace(/\/+$/, "");
