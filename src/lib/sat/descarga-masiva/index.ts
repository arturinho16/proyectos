import {
    Fiel,
    HttpsWebClient,
    FielRequestBuilder,
    Service,
    QueryParameters,
    DateTimePeriod,
    DownloadType,
    RequestType
} from '@nodecfdi/sat-ws-descarga-masiva';

export type EstadoSolicitudInterno =
    | 'PENDIENTE'
    | 'EN_PROCESO'
    | 'COMPLETADA'
    | 'SIN_RESULTADOS'
    | 'DUPLICADA'
    | 'RECHAZADA'
    | 'ERROR'
    | 'VENCIDA'
    | 'RESPALDO_REQUERIDO';

export type ResultadoVerificacionSAT = {
    estado: EstadoSolicitudInterno;
    mensajeSat: string;
    packageIds: string[];
    estadoSolicitudSAT: string;
};

function normalizarTexto(texto: string): string {
    return (texto || '').toLowerCase();
}

export class DescargaMasivaSAT {
    private fiel: any;
    private service: any;

    constructor(cerString: string, keyString: string, password: string) {
        this.fiel = Fiel.create(cerString, keyString, password);

        if (!this.fiel.isValid()) {
            throw new Error('La e.firma/FIEL proporcionada no es válida, no corresponde con la llave o está caducada.');
        }

        const requestBuilder = new FielRequestBuilder(this.fiel);
        const webClient = new HttpsWebClient();
        this.service = new Service(requestBuilder, webClient);
    }

    async solicitarFacturasRecibidas(fechaInicioStr: string, fechaFinStr: string): Promise<string> {
        try {
            const periodo = DateTimePeriod.createFromValues(fechaInicioStr, fechaFinStr);

            const query = QueryParameters.create(
                periodo,
                DownloadType.received,
                RequestType.cfdi
            );

            const solicitud = await this.service.query(query);

            if (!solicitud.getStatus().isAccepted()) {
                throw new Error(`El SAT rechazó la solicitud: ${solicitud.getStatus().getMessage()}`);
            }

            return solicitud.getRequestId();
        } catch (error: any) {
            console.error('Error en solicitarFacturasRecibidas:', error);
            throw error;
        }
    }

    async verificarSolicitud(requestId: string): Promise<ResultadoVerificacionSAT> {
        try {
            const verificacion = await this.service.verify(requestId);

            const status = verificacion.getStatus();
            const statusRequest = verificacion.getStatusRequest();
            const packageIds: string[] = verificacion.getPackageIds?.() ?? [];

            const mensajeComunicacion = status.getMessage?.() || 'Sin mensaje del SAT';
            const valorSolicitud = String(statusRequest?.getValue?.() ?? '');

            const mensajeBase = [
                mensajeComunicacion,
                valorSolicitud ? `EstadoSolicitud=${valorSolicitud}` : '',
            ]
                .filter(Boolean)
                .join(' | ');

            if (!status.isAccepted()) {
                return {
                    estado: 'ERROR',
                    mensajeSat: `Error de comunicación con el SAT: ${mensajeComunicacion}`,
                    packageIds: [],
                    estadoSolicitudSAT: valorSolicitud || 'WS_ERROR',
                };
            }

            if (valorSolicitud === '1' || statusRequest.isTypeOf?.('Accepted')) {
                return {
                    estado: 'PENDIENTE',
                    mensajeSat: mensajeBase || 'Solicitud aceptada por el SAT.',
                    packageIds: [],
                    estadoSolicitudSAT: valorSolicitud || '1',
                };
            }

            if (
                valorSolicitud === '2' ||
                statusRequest.isTypeOf?.('InProcess') ||
                statusRequest.isTypeOf?.('InProgress')
            ) {
                return {
                    estado: 'EN_PROCESO',
                    mensajeSat: mensajeBase || 'El SAT sigue procesando la solicitud.',
                    packageIds: [],
                    estadoSolicitudSAT: valorSolicitud || '2',
                };
            }

            if (valorSolicitud === '3' || statusRequest.isTypeOf?.('Finished')) {
                if (packageIds.length > 0) {
                    return {
                        estado: 'COMPLETADA',
                        mensajeSat: mensajeBase || 'El SAT terminó y devolvió paquetes.',
                        packageIds,
                        estadoSolicitudSAT: valorSolicitud || '3',
                    };
                }

                return {
                    estado: 'SIN_RESULTADOS',
                    mensajeSat: mensajeBase || 'El SAT terminó, pero no devolvió paquetes.',
                    packageIds: [],
                    estadoSolicitudSAT: valorSolicitud || '3',
                };
            }

            if (valorSolicitud === '4' || statusRequest.isTypeOf?.('Failure')) {
                return {
                    estado: 'ERROR',
                    mensajeSat: mensajeBase || 'La solicitud falló en el SAT.',
                    packageIds: [],
                    estadoSolicitudSAT: valorSolicitud || '4',
                };
            }

            if (valorSolicitud === '5' || statusRequest.isTypeOf?.('Rejected')) {
                const texto = normalizarTexto(mensajeComunicacion);
                const estado = /duplicad|5005/.test(texto) ? 'DUPLICADA' : 'RECHAZADA';

                return {
                    estado,
                    mensajeSat: mensajeBase || 'La solicitud fue rechazada por el SAT.',
                    packageIds: [],
                    estadoSolicitudSAT: valorSolicitud || '5',
                };
            }

            if (valorSolicitud === '6' || statusRequest.isTypeOf?.('Expired')) {
                return {
                    estado: 'VENCIDA',
                    mensajeSat: mensajeBase || 'La solicitud venció en el SAT.',
                    packageIds: [],
                    estadoSolicitudSAT: valorSolicitud || '6',
                };
            }

            return {
                estado: 'EN_PROCESO',
                mensajeSat: mensajeBase || 'El SAT sigue procesando la solicitud.',
                packageIds: [],
                estadoSolicitudSAT: valorSolicitud || 'DESCONOCIDO',
            };
        } catch (error: any) {
            console.error('Error en verificarSolicitud:', error);
            throw error;
        }
    }

    async descargarPaquete(packageId: string): Promise<string> {
        try {
            const descarga = await this.service.download(packageId);
            return descarga.getPackageContent();
        } catch (error: any) {
            console.error('Error en descargarPaquete:', error);
            throw error;
        }
    }
}