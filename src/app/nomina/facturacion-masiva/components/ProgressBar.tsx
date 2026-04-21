type Props = {
  total: number;
  processed: number;
  failed: number;
};

export default function ProgressBar({ total, processed, failed }: Props) {
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span>Progreso timbrado</span>
        <span className="font-bold">{percent}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-[#4F46E5]" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">Procesadas: {processed}/{total} · Errores: {failed}</p>
    </div>
  );
}
