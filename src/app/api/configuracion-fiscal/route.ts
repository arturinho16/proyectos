export type EstadoNomina = 'BORRADOR' | 'PENDIENTE_APROBACION' | 'APROBADA' | 'RECHAZADA' | 'TIMBRADA' | 'ERROR';

export type NominaRow = {
    id: string;
    empleadoId: string;
    empleadoNombre: string;
    empleadoRfc: string;
    totalNeto: number;
    fechaPago: string;
    estado: EstadoNomina;
    totalPercepciones: number;
    totalDeducciones: number;
    comentarios?: string;
    xmlTimbrado?: string | null;
};
