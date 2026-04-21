import { Button } from '@/components/shared/Button';

type Props = {
  reciboId: string;
  onSuccess: () => void;
};

export default function BotonesAprobacion({ reciboId, onSuccess }: Props) {
  const updateEstado = async (estado: 'APROBADA' | 'RECHAZADA') => {
    const ok = confirm(`¿Confirmas ${estado === 'APROBADA' ? 'aprobar' : 'rechazar'} este recibo?`);
    if (!ok) return;

    const res = await fetch('/api/nomina/aprobar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reciboId, estado }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(`Error: ${data?.error ?? 'No se pudo cambiar estado'}`);
      return;
    }

    onSuccess();
  };

  return (
    <div className="flex gap-2">
      <Button variant="success" onClick={() => updateEstado('APROBADA')} className="text-xs px-3 py-2">Aprobar</Button>
      <Button variant="danger" onClick={() => updateEstado('RECHAZADA')} className="text-xs px-3 py-2">Rechazar</Button>
    </div>
  );
}
