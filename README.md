// funcion consolidado de facturas mensuales, ver para que no colapse el navegador
🟢 Zona Segura y Fluida: 500 a 1,000 facturas
En este rango, cualquier computadora de oficina promedio (con 4GB u 8GB de RAM) hará el trabajo en unos pocos minutos sin problema. El navegador utilizará entre 200MB y 500MB de memoria temporal. El usuario verá la barra de progreso avanzar rápidamente y descargará un PDF de unos 5MB a 15MB y un ZIP de unos 2MB a 5MB.

🟡 Límite de Tensión (El navegador se congela intermitentemente): 2,000 a 5,000 facturas
Aquí empezamos a jugar con fuego. Al procesar este volumen:

El Recolector de Basura (Garbage Collector) de JavaScript se satura: Aunque programamos el sistema para desechar los PDFs individuales después de pegarlos al PDF maestro, JS no libera la memoria inmediatamente.

pdf-lib retiene todo en RAM: Para que pdf-lib pueda exportar el PDF final (mergedPdf.save()), tiene que mantener el árbol de objetos de las 5,000 páginas vivas en la memoria RAM.

Resultado: Chrome consumirá entre 1.5GB y 2.5GB de RAM solo en esa pestaña. La computadora del cliente puede encender los ventiladores al máximo y el navegador podría mostrar el mensaje "Esta página no responde, ¿deseas esperar?". Si el usuario le da "Esperar", eventualmente terminará.

🔴 Límite de Colapso (Crash seguro / "Out of Memory"): 10,000+ facturas
Si intentas procesar 10,000, 20,000 o 30,000 facturas en el navegador, el sistema va a colapsar al 100% de seguridad.
Chrome y Edge tienen un límite por defecto de aproximadamente 2GB a 4GB de RAM máxima por pestaña (dependiendo del sistema operativo). Construir un PDF de 30,000 páginas en memoria con fuentes e imágenes embebidas, sumado a 30,000 strings de XML en un buffer de ZIP, excederá ese límite. La pestaña se pondrá en blanco y mostrará el error de "Aw, Snap!" (¡Oh, no!) o Out of Memory.

-------------------------------------------------
🟢 modulo de facturas Rcibidas

Perfecto! Vamos a hacerlo como los profesionales.

Analizando el repositorio de Python que me compartiste, el autor separó inteligentemente la lógica en módulos específicos. Nosotros vamos a replicar esa misma arquitectura limpia y escalable en tu proyecto Next.js, usando TypeScript.

El repositorio de Python se divide conceptualmente así:

Manejo de FIEL: Cargar el .cer, .key y la contraseña.

Autenticación: Firmar un XML para obtener el Token.

Solicitud: Pedir el rango de fechas.

Verificación: Preguntar si ya están listos los paquetes.

Descarga: Bajar el ZIP y extraer los XML.
-------------------------------------------------



This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
