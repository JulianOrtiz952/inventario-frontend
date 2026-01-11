import React, { useState, useEffect } from "react";
import { formatCurrency, parseCurrency } from "../utils/format";

export default function CurrencyInput({
    value,
    onChange,
    className,
    placeholder,
    name,
}) {
    const [displayValue, setDisplayValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        // Solo actualizar desde afuera si NO tiene el foco
        if (!isFocused) {
            if (value !== undefined && value !== null && value !== "") {
                setDisplayValue(formatCurrency(value));
            } else {
                setDisplayValue("");
            }
        }
    }, [value, isFocused]);

    const handleChange = (e) => {
        const inputValue = e.target.value;

        // Permitir borrar todo
        if (inputValue === "") {
            setDisplayValue("");
            onChange({ target: { name, value: "" } });
            return;
        }

        // Extraer solo dígitos, punto, y apóstrofe (para que el usuario pueda escribir o borrar)
        // Pero al pasar al padre lo mandamos limpio (parseado)
        const rawValue = inputValue.replace(/[^\d.]/g, "");
        const parts = rawValue.split('.');
        if (parts.length > 2) return;

        // Actualizamos el estado interno para lo que ve el usuario
        // Aplicamos el formato de miles al vuelo PERO sin forzar decimales si no los hay
        let formatted = "";
        const integerPart = parts[0];
        const decimalPart = parts[1];

        // Reutilizamos la lógica de formateo de miles pero básica
        const reversed = integerPart.split("").reverse();
        let intFormatted = "";
        for (let i = 0; i < reversed.length; i++) {
            if (i > 0 && i % 3 === 0) intFormatted += "'";
            intFormatted += reversed[i];
        }
        formatted = intFormatted.split("").reverse().join("");

        if (decimalPart !== undefined) {
            formatted += "." + decimalPart.slice(0, 2);
        } else if (inputValue.endsWith(".")) {
            formatted += ".";
        }

        setDisplayValue(formatted);

        // El valor real que mandamos al padre es el raw numérico
        onChange({ target: { name, value: rawValue } });
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
        // Al salir, forzamos el formato completo (incluyendo .00 si no los tiene)
        if (value !== undefined && value !== null && value !== "") {
            setDisplayValue(formatCurrency(value));
        }
    };

    return (
        <input
            type="text"
            name={name}
            className={className}
            placeholder={placeholder}
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoComplete="off"
        />
    );
}
