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
    // User requested: "'" for millions, "," for thousands, "." for decimals, exactly 2 decimal places.
    // Example: 1'234,567.89

    // Reverse string
    const reversed = integerPart.split("").reverse();

    let formatted = "";
    for (let i = 0; i < reversed.length; i++) {
        if (i > 0 && i % 3 === 0) {
            if (i === 6 || i === 12 || i === 18) {
                // Millones, Billones, etc. use "'"
                formatted += "'";
            } else {
                // Miles use ","
                formatted += ",";
            }
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
