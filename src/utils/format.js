export function formatCurrency(value) {
    if (value === null || value === undefined || value === "") return "";

    // Convertir a número para limpiar caracteres extraños
    const num = parseFloat(String(value).replace(/[\'$,]/g, ""));
    if (isNaN(num)) return value; // Retornar tal cual si no es número

    // Separar parte entera y decimal, siempre con 2 decimales
    const parts = num.toFixed(2).split(".");
    let integerPart = parts[0];
    const decimalPart = parts[1];

    // Aplicar formato personalizado:
    // User requested: "'" for thousands, "." for decimals, exactly 2 decimal places.

    // Reverse string
    const reversed = integerPart.split("").reverse();

    let formatted = "";
    for (let i = 0; i < reversed.length; i++) {
        if (i > 0 && i % 3 === 0) {
            // Usar ' para miles y millones
            formatted += "'";
        }
        formatted += reversed[i];
    }

    integerPart = formatted.split("").reverse().join("");

    // Siempre retornar con 2 decimales
    return integerPart + "." + decimalPart;
}

export function parseCurrency(value) {
    if (!value) return "";
    // Remover todo lo que no sea dígito o punto
    return String(value).replace(/[^\d.]/g, "");
}
