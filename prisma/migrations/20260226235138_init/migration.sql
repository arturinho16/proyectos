-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "nombreRazonSocial" TEXT NOT NULL,
    "rfc" TEXT NOT NULL,
    "regimenFiscal" TEXT NOT NULL,
    "usoCfdiDefault" TEXT,
    "email" TEXT NOT NULL,
    "emailOpcional1" TEXT,
    "emailOpcional2" TEXT,
    "telefono" TEXT,
    "celular" TEXT,
    "calle" TEXT,
    "numExterior" TEXT,
    "numInterior" TEXT,
    "colonia" TEXT,
    "municipio" TEXT,
    "estado" TEXT,
    "pais" TEXT NOT NULL DEFAULT 'MEXICO',
    "cp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precio" DECIMAL(15,2) NOT NULL,
    "codigoInterno" TEXT,
    "claveProdServ" TEXT NOT NULL,
    "claveUnidad" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "objetoImpuesto" TEXT NOT NULL DEFAULT '02',
    "ivaTasa" DECIMAL(5,4) NOT NULL DEFAULT 0.16,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_rfc_key" ON "Client"("rfc");
