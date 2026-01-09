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

    useEffect(() => {
        // Cuando el valor externo cambia (y no es lo que ya estamos mostrando parseado), actualizar
        if (value !== undefined && value !== null) {
            setDisplayValue(formatCurrency(value));
        } else {
            setDisplayValue("");
        }
    }, [value]);

    const handleChange = (e) => {
        const inputValue = e.target.value;

        // Permitir borrar todo
        if (inputValue === "") {
            setDisplayValue("");
            onChange({ target: { name, value: "" } });
            return;
        }

        // Validar solo caracteres permitidos: digitos, puntos, comas, comillas (para permitir edición)
        // Pero para simplificar, extraemos solo números y punto
        const rawValue = inputValue.replace(/[^\d.]/g, "");

        // Evitar múltiples puntos decimales
        const parts = rawValue.split('.');
        if (parts.length > 2) return;

        // Guardamos el valor crudo en el estado padre
        onChange({ target: { name, value: rawValue } });

        // No formateamos INMEDIATAMENTE mientras escribe para no volver loco el cursor, 
        // pero si lo hacemos, debemos gestionar el cursor. 
        // Para simplificar: formateamos "onBlur" o aceptamos un comportamiento híbrido.
        // El usuario pidió "incluso cuando esté escribiendo".
        // Intentemos formatear en tiempo real pero cuidando de no bloquear la escritura de decimales.

        // CASO ESPECIAL: Si el usuario escribe un punto, no lo borramos
        if (inputValue.endsWith(".")) {
            setDisplayValue(formatCurrency(rawValue) + ".");
        } else if (inputValue.endsWith(".0")) {
            setDisplayValue(formatCurrency(rawValue) + ".0");
        } else {
            setDisplayValue(formatCurrency(rawValue));
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
            autoComplete="off"
        />
    );
}
