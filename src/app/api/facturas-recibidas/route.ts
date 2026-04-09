export async function POST(req: NextRequest) {
  try {
    // 1. Nombres EXACTOS de tus archivos FIEL
    const cerPath = path.join(process.cwd(), 'src/lib/sat/certificados/FIEL/como891216cm1.cer');
    const keyPath = path.join(process.cwd(), 'src/lib/sat/certificados/FIEL/Claveprivada_FIEL_COMO891216CM1_20260219_140155.key');

    // ⚠️ PON TU CONTRASEÑA REAL AQUÍ OTRA VEZ
    const passwordFiel = 'MONROY1612';

    if (!fs.existsSync(cerPath) || !fs.existsSync(keyPath)) {
      return NextResponse.json({
        error: `No se encontraron los archivos. Verifica que los nombres sean exactos en la carpeta FIEL.`
      }, { status: 400 });
    }

    const cerString = fs.readFileSync(cerPath, 'binary');
    const keyString = fs.readFileSync(keyPath, 'binary');

    const satService = new DescargaMasivaSAT(cerString, keyString, passwordFiel);

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 5);

    const formatToSAT = (date: Date) => date.toISOString().replace('T', ' ').substring(0, 19);

    const strInicio = formatToSAT(start);
    const strFin = formatToSAT(end);

    const requestId = await satService.solicitarFacturasRecibidas(strInicio, strFin);

    return NextResponse.json({
      ok: true,
      mensaje: `Conexión establecida con el SAT. ID de Solicitud: ${requestId}`
    });

  } catch (error: any) {
    console.error("Error en sincronización SAT:", error);
    return NextResponse.json({ error: error.message || 'Error al contactar al SAT' }, { status: 500 });
  }
}