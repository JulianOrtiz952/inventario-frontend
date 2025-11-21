export default function ActionIconButton({ label, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700"
      title={label}
    >
      {children}
    </button>
  );
}
