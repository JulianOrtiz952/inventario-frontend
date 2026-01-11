export default function ConfirmActionModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    description,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    isDestructive = false,
    loading = false,
    error = "",
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 border border-white/10 dark:border-slate-800">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>
                    <button
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        onClick={onClose}
                        disabled={loading}
                    >
                        ✕
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
                            <span className="text-lg leading-none">⚠️</span>
                            <span className="mt-0.5">{error}</span>
                        </div>
                    )}

                    <div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                            {message}
                        </p>
                        {description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                {description}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={loading}
                            className={`px-5 py-2 rounded-lg text-white text-xs font-bold shadow-md transition-all active:scale-95 ${isDestructive
                                ? "bg-red-600 hover:bg-red-700 shadow-red-500/20"
                                : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                                } disabled:opacity-70 disabled:active:scale-100`}
                        >
                            {loading ? "Procesando..." : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
