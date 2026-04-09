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
        // 1. Cargar la FIEL
        this.fiel = Fiel.create(cerString, keyString, password);

        if (!this.fiel.isValid()) {
            throw new Error('La FIEL proporcionada no es válida o está caducada.');
        }

        // 2. Inicializar el cliente SOAP
        const requestBuilder = new FielRequestBuilder(this.fiel);
        const webClient = new HttpsWebClient();

        this.service = new Service(requestBuilder, webClient);
    }

    /**
     * PASO 1 y 2: Autenticarse y solicitar la descarga
     */
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
            console.error("Error en solicitarFacturasRecibidas:", error);
            throw error;
        }
    }

    /**
     * PASO 3: Verificar si el SAT ya terminó de procesar la solicitud
     */
    async verificarSolicitud(requestId: string): Promise<string[]> {
        try {
            const verificacion = await this.service.verify(requestId);

            // Validar que el Web Service del SAT respondió sin errores de conexión (Código 5000)
            if (!verificacion.getStatus().isAccepted()) {
                throw new Error(`Error de comunicación con el SAT: ${verificacion.getStatus().getMessage()}`);
            }

            // Obtener el estado interno de la solicitud (El armado del ZIP: 1 al 6)
            const statusRequest = verificacion.getStatusRequest();

            // Si la solicitud falló, fue rechazada o caducó
            if (
                statusRequest.isTypeOf('Rejected') ||
                statusRequest.isTypeOf('Failure') ||
                statusRequest.isTypeOf('Expired')
            ) {
                throw new Error(`Solicitud fallida en el SAT. Estado: ${statusRequest.getValue()}`);
            }

            // Si los paquetes ya están listos (Estado 3: Terminada)
            if (statusRequest.isTypeOf('Finished')) {
                return verificacion.getPackageIds();
            }

            // Si sigue en "Aceptada" o "En Proceso", devolvemos vacío para intentar después
            return [];

        } catch (error: any) {
            console.error("Error en verificarSolicitud:", error);
            throw error;
        }
    }

    /**
     * PASO 4: Descargar el ZIP usando el ID del Paquete
     */
    async descargarPaquete(packageId: string): Promise<string> {
        try {
            const descarga = await this.service.download(packageId);
            return descarga.getPackageContent(); // Devuelve el contenido en Base64
        } catch (error: any) {
            console.error("Error en descargarPaquete:", error);
            throw error;
        }
    }
}