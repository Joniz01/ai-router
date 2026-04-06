// app/api/save-latest/route.ts
import { NextRequest, NextResponse } from 'next/server';

let latestAnalysis = {
  precioActual: "--",
  tendencia: "--",
  notasAdicionales: "Sin notas adicionales.",
  resultadoPrincipal: "Sin análisis disponible",
  entrada: "--",
  stopLoss: "--",
  target: "--",
  analisisDetallado: "No hay análisis detallado disponible.",
  ultimaActualizacion: new Date().toLocaleString('es-PE')
};

export async function GET() {
  return NextResponse.json(latestAnalysis);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    latestAnalysis = {
      precioActual: body.precioActual || "--",
      tendencia: body.tendencia || "--",
      notasAdicionales: body.notasAdicionales || "Sin notas adicionales.",
      resultadoPrincipal: body.resultadoPrincipal || "Sin análisis disponible",
      entrada: body.entrada || "--",
      stopLoss: body.stopLoss || "--",
      target: body.target || "--",
      analisisDetallado: body.analisisDetallado || "No hay análisis detallado disponible.",
      ultimaActualizacion: new Date().toLocaleString('es-PE')
    };

    return NextResponse.json({ success: true, message: "Análisis guardado correctamente" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error al guardar análisis" }, { status: 500 });
  }
}
