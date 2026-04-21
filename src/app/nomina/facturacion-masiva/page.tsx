import TablaAprobacion from './components/TablaAprobacion';
import TimbradoMasivo from './components/TimbradoMasivo';

export default function NominaMasivaPage() {
    return (
        <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
            <h1 className="text-3xl font-bold text-slate-900">Nómina masiva</h1>
            <TablaAprobacion />
            <TimbradoMasivo />
        </div>
    );
}
