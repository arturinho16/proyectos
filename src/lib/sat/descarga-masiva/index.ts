import {
    Fiel,
    HttpsWebClient,
    FielRequestBuilder,
    Service,
    QueryParameters,
    DateTimePeriod,
    DownloadType,
    RequestType,
} from '@nodecfdi/sat-ws-descarga-masiva';

export type EstadoSolicitudInterno =
    | 'PENDIENTE'
    | 'EN_PROCESO'
    | 'COMPLETADA'
    | 'ERROR'
    | 'RECHAZADA'
    | 'VENCIDA'
    | 'DESCONOCIDO';

export type VerificacionSolicitudResult = {
    requestId: string;
    estadoSolicitudCodigo: number | null;
    estadoSolicitud: EstadoSolicitudInterno;
    paqueteIds: string[];
    mensaje: string;
};

export class DescargaMasivaSAT {
    private fiel: any;
    private service: any;

    constructor(cerString: string, keyString: string, password: string) {
        this.fiel = Fiel.create(cerString, keyString, password);

        if (!this.fiel?.isValid?.()) {
            throw new Error(
                'La e.firma proporcionada no es válida, está vencida o la contraseña es incorrecta.'
            );
        }

        const requestBuilder = new FielRequestBuilder(this.fiel);
        const webClient = new HttpsWebClient();

        this.service = new Service(requestBuilder, webClient);
    }

    private mapEstadoSolicitud(codigo: number | null): EstadoSolicitudInterno {
        switch (codigo) {
            case 1:
                return 'PENDIENTE';
            case 2:
                return 'EN_PROCESO';
            case 3:
                return 'COMPLETADA';
            case 4:
                return 'ERROR';
            case 5:
                return 'RECHAZADA';
            case 6:
                return 'VENCIDA';
            default:
                return 'DESCONOCIDO';
        }
    }

    private resolverCodigoEstado(statusRequest: any): number | null {
        const rawValue = statusRequest?.getValue?.();
        const numericValue = Number(rawValue);

        if (Number.isFinite(numericValue)) {
            return numericValue;
        }

        if (statusRequest?.isTypeOf?.('Accepted')) return 1;
        if (statusRequest?.isTypeOf?.('InProgress')) return 2;
        if (statusRequest?.isTypeOf?.('InProcess')) return 2;
        if (statusRequest?.isTypeOf?.('Finished')) return 3;
        if (statusRequest?.isTypeOf?.('Failure')) return 4;
        if (statusRequest?.isTypeOf?.('Rejected')) return 5;
        if (statusRequest?.isTypeOf?.('Expired')) return 6;

        return null;
    }
    async solicitarFacturasRecibidas(
        fechaInicioStr: string,
        fechaFinStr: string,
        tipoSolicitud: 'CFDI' | 'METADATA' = 'CFDI'
    ): Promise<{ requestId: string; mensaje: string; tipoSolicitud: 'CFDI' | 'METADATA' }> {
        try {
            const periodo = DateTimePeriod.createFromValues(fechaInicioStr, fechaFinStr);

            const requestType =
                tipoSolicitud === 'METADATA' ? RequestType.metadata : RequestType.cfdi;

            const query = QueryParameters.create(
                periodo,
                DownloadType.received,
                requestType
            );

            console.log('[SAT] Creando solicitud:', {
                fechaInicioStr,
                fechaFinStr,
                tipoSolicitud,
                requestType,
            });

            const solicitud = await this.service.query(query);
            const status = solicitud.getStatus();
            const statusMessage = status?.getMessage?.() || 'Sin mensaje del SAT';

            if (!status.isAccepted()) {
                throw new Error(`El SAT rechazó la solicitud: ${statusMessage}`);
            }

            const requestId = solicitud.getRequestId();

            return {
                requestId,
                tipoSolicitud,
                mensaje: `Solicitud creada correctamente. Token asignado: ${requestId}. TipoSolicitud=${tipoSolicitud}`,
            };
        } catch (error: any) {
            console.error('Error en solicitarFacturasRecibidas:', error);
            throw error;
        }
    }

    async verificarSolicitud(requestId: string): Promise<VerificacionSolicitudResult> {
        try {
            const verificacion = await this.service.verify(requestId);
            const status = verificacion.getStatus();
            const statusMessage = status?.getMessage?.() || 'Sin mensaje del SAT';

            if (!status.isAccepted()) {
                throw new Error(`Error de comunicación con el SAT: ${statusMessage}`);
            }

            const statusRequest = verificacion.getStatusRequest();
            const estadoSolicitudCodigo = this.resolverCodigoEstado(statusRequest);
            const estadoSolicitud = this.mapEstadoSolicitud(estadoSolicitudCodigo);
            const paqueteIds = verificacion.getPackageIds?.() || [];

            const mensaje = `Solicitud Aceptada | EstadoSolicitud=${estadoSolicitudCodigo ?? 'N/D'
                } | Paquetes descargados: ${paqueteIds.length}`;

            return {
                requestId,
                estadoSolicitudCodigo,
                estadoSolicitud,
                paqueteIds,
                mensaje,
            };
        } catch (error: any) {
            console.error('Error en verificarSolicitud:', error);
            throw error;
        }
    }

    async descargarPaquete(packageId: string): Promise<string> {
        try {
            const descarga = await this.service.download(packageId);
            const status = descarga.getStatus?.();

            if (status && !status.isAccepted()) {
                throw new Error(`El SAT no permitió descargar el paquete: ${status.getMessage?.() || 'Sin detalle'}`);
            }

            return descarga.getPackageContent();
        } catch (error: any) {
            console.error('Error en descargarPaquete:', error);
            throw error;
        }
    }
}