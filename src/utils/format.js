export function formatCurrency(value) {
    if (value === null || value === undefined || value === "") return "";

    // Convertir a número para limpiar caracteres extraños
    const num = parseFloat(String(value).replace(/[\'$,]/g, ""));
    if (isNaN(num)) return value; // Retornar tal cual si no es número

    // Separar parte entera y decimal, exactamente 1 decimal
    const parts = num.toFixed(1).split(".");
    let integerPart = parts[0];
    const decimalPart = parts[1];

    // Aplicar formato personalizado:
    // User requested: "'" for millions, "," for thousands, "." for decimal, exactly 1 decimal place.
    // Example: 1'234,567.8

    // Reverse string
    const reversed = integerPart.split("").reverse();

    let formatted = "";
    for (let i = 0; i < reversed.length; i++) {
        if (i > 0 && i % 3 === 0) {
            if (i >= 6 && i % 6 === 0) {
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

    // Retornar con 1 decimal
    return integerPart + "." + decimalPart;
}

export function parseCurrency(value) {
    if (!value) return "";
    // Remover todo lo que no sea dígito o punto
    return String(value).replace(/[^\d.]/g, "");
}

export function formatDateTime(isoString) {
    if (!isoString) return "—";
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${day}/${month}/${year} : ${hours}:${minutes}`;
    } catch (e) {
        return isoString;
    }
}
