export function formatCurrency(value) {
    if (value === null || value === undefined || value === "") return "";

    // Convertir a número para limpiar caracteres extraños
    const num = parseFloat(String(value).replace(/['$,]/g, ""));
    if (isNaN(num)) return value; // Retornar tal cual si no es número

    // Separar parte entera y decimal
    const parts = num.toFixed(2).split(".");
    let integerPart = parts[0];
    const decimalPart = parts[1];

    // Aplicar formato personalizado:
    // 1. Miles con coma (,)
    // 2. Millones con comilla simple (')

    // Estrategia: invertir, agrupar de 3 en 3, y decidir el separador según la posición

    // Reverse string
    const reversed = integerPart.split("").reverse();

    let formatted = "";
    for (let i = 0; i < reversed.length; i++) {
        if (i > 0 && i % 3 === 0) {
            // Si estamos en 6, 12, 18 ... es millón (6 ceros), billón (12 ceros) -> usar '
            // Si estamos en 3, 9, 15 ... es mil -> usar ,

            const isMillionPosition = (i % 6 === 0);
            formatted += isMillionPosition ? "'" : ",";
        }
        formatted += reversed[i];
    }

    integerPart = formatted.split("").reverse().join("");

    // Eliminar .00 si se desea (o mantenerlo). El usuario pidió ver decimales "si es para miles o millones", asumo estándar monetario.
    // Pero si es input, mejor ser consistentes.
    // Nota: si el usuario escribe 100, quiere ver 100. Si escribe 100.5, quiere ver 100.5
    // Para display, voy a hacer una versión "inteligente" que quite decimales si son 00

    return integerPart + (parseInt(decimalPart) > 0 ? "." + decimalPart : "");
}

export function parseCurrency(value) {
    if (!value) return "";
    // Remover todo lo que no sea dígito o punto
    return String(value).replace(/[^\d.]/g, "");
}
