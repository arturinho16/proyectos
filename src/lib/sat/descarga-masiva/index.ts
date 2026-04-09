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

export class DescargaMasivaSAT {
    private fiel: any;
    private service: any;

    constructor(cerString: string, keyString: string, password: string) {
        // 1. Cargar la FIEL usando los binarios en formato string
        this.fiel = Fiel.create(cerString, keyString, password);

        // Verificar que la e.firma sea válida
        if (!this.fiel.isValid()) {
            throw new Error('La FIEL proporcionada no es válida o está caducada.');
        }

        // 2. Inicializar el cliente SOAP oficial de NodeCFDI
        const requestBuilder = new FielRequestBuilder(this.fiel);
        const webClient = new HttpsWebClient();

        this.service = new Service(requestBuilder, webClient);
    }

    async solicitarFacturasRecibidas(fechaInicioStr: string, fechaFinStr: string): Promise<string> {
        try {
            // Formato de fechas requerido: 'YYYY-MM-DD HH:mm:ss'
            const periodo = DateTimePeriod.createFromValues(fechaInicioStr, fechaFinStr);

            const query = QueryParameters.create(
                period,
                DownloadType.received(), // Facturas Recibidas
                RequestType.xml()        // Archivos XML
            );

            // Hacer la petición al SAT
            const solicitud = await this.service.query(query);

            if (!solicitud.getStatus().isAccepted()) {
                throw new Error(`El SAT rechazó la solicitud: ${solicitud.getStatus().getMessage()}`);
            }

            return solicitud.getRequestId();

        } catch (error: any) {
            console.error("Error en solicitarFacturasRecibidas:", error);
            throw error;
        }
    }
}