/*
  Warnings:

  - Made the column `usoCfdiDefault` on table `Client` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "tipoPersona" TEXT,
ALTER COLUMN "usoCfdiDefault" SET NOT NULL,
ALTER COLUMN "usoCfdiDefault" SET DEFAULT 'G03',
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Factura" (
    "id" TEXT NOT NULL,
    "serie" TEXT NOT NULL DEFAULT 'A',
    "folio" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "lugarExpedicion" TEXT NOT NULL,
    "tipoComprobante" TEXT NOT NULL DEFAULT 'I',
    "formaPago" TEXT NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "tipoCambio" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "condicionesPago" TEXT,
    "clientId" TEXT NOT NULL,
    "usoCFDI" TEXT NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "descuento" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalIVA" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalIEPS" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "retencionIVA" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "retencionISR" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "uuid" TEXT,
    "xmlTimbrado" TEXT,
    "pdfUrl" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptoFactura" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "productId" TEXT,
    "claveProdServ" TEXT NOT NULL,
    "claveUnidad" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(15,6) NOT NULL,
    "precioUnitario" DECIMAL(15,6) NOT NULL,
    "descuento" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "importe" DECIMAL(15,2) NOT NULL,
    "objetoImpuesto" TEXT NOT NULL DEFAULT '02',
    "ivaTasa" DECIMAL(5,4) NOT NULL DEFAULT 0.16,
    "iepsTasa" DECIMAL(5,4) NOT NULL DEFAULT 0.00,
    "ivaImporte" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "iepsImporte" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConceptoFactura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Factura_serie_folio_key" ON "Factura"("serie", "folio");

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptoFactura" ADD CONSTRAINT "ConceptoFactura_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptoFactura" ADD CONSTRAINT "ConceptoFactura_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
