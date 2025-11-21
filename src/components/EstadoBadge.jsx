export default function EstadoBadge({ estado, stockActual, stockMinimo }) {
  const esOk = estado === "OK" || stockActual >= stockMinimo;

  if (esOk) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        OK
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
      <span className="w-2 h-2 rounded-full border border-red-500" />
      Bajo mínimo
    </span>
  );
}
