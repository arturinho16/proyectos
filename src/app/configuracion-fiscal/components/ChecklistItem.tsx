import { CheckCircle2, Circle } from 'lucide-react';

type Props = {
  label: string;
  complete: boolean;
  description?: string;
};

export default function ChecklistItem({ label, complete, description }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
      {complete ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <Circle className="mt-0.5 h-5 w-5 text-slate-400" />}
      <div>
        <p className="font-bold text-slate-800">{label}</p>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}
