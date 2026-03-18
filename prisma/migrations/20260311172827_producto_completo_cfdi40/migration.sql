/*
  Warnings:

  - You are about to alter the column `precio` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `Decimal(15,6)`.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "cuentaPredial" TEXT,
ADD COLUMN     "iepsTasa" DECIMAL(5,4) NOT NULL DEFAULT 0.00,
ADD COLUMN     "impuestoLocal" DECIMAL(5,4),
ADD COLUMN     "numeroInterno" TEXT,
ADD COLUMN     "numeroPedimento" TEXT,
ALTER COLUMN "precio" SET DATA TYPE DECIMAL(15,6);
