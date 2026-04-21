export type ConfiguracionFiscalForm = {
  rfc: string;
  razonSocial: string;
  nombreComercial?: string;
  regimenFiscal: string;
  codigoPostal: string;
  pais: string;
  estado?: string;
  municipio?: string;
  colonia?: string;
  calle?: string;
  numeroExterior?: string;
  numeroInterior?: string;
  telefono?: string;
  email?: string;
  sitioWeb?: string;
  logoUrl?: string;
  representanteLegal?: string;
  registroPatronal?: string;
  csdNoCertificado?: string;
  csdCertificadoBase64?: string;
  csdLlaveBase64?: string;
  csdPasswordEncrypted?: string;
  pacProveedor: string;
  pacUsuario?: string;
  pacPasswordEncrypted?: string;
  pacAmbiente: string;
  pacStampUrl?: string;
  folioNominaSerie: string;
  folioNominaActual: number;
  timbresContratados: number;
  timbresUsados: number;
  timbresDisponibles: number;
};

export type ConfigFormProps = {
  values: ConfiguracionFiscalForm;
  onChange: <K extends keyof ConfiguracionFiscalForm>(key: K, value: ConfiguracionFiscalForm[K]) => void;
};
