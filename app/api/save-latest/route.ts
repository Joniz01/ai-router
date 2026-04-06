// app/api/save-latest/route.ts
import { NextRequest, NextResponse } from 'next/server';

let latestAnalysis = {
  precioActual: "--",
  tendencia: "--",
  notasAdicionales: "Sin notas adicionales.",
  sincronizacion: "Sin sincronización disponible",
  resumenGeneral: "Sin resumen general disponible",
  entrada: "--",
  stopLoss: "--",
  target1: "--",
  target2: "--",
  probabilidad: "--",
  orderFlow: "Sin análisis de Order Flow disponible",
  gexbot: "Sin análisis de GEXBOT disponible",
  confluencia: "Sin confluencia disponible",
  riesgos: "Sin riesgos identificados",
  fullAnalysis: "No hay análisis completo disponible",
  conclusionColor: "red",           // 'green' o 'red'
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

      // Nuevos campos estructurados
      sincronizacion: body.sincronizacion || "Sin sincronización disponible",
      resumenGeneral: body.resumenGeneral || "Sin resumen general disponible",

      entrada: body.entrada || "--",
      stopLoss: body.stopLoss || "--",
      target1: body.target1 || "--",
      target2: body.target2 || "--",
      probabilidad: body.probabilidad || "--",

      orderFlow: body.orderFlow || "Sin análisis de Order Flow disponible",
      gexbot: body.gexbot || "Sin análisis de GEXBOT disponible",
      confluencia: body.confluencia || "Sin confluencia disponible",
      riesgos: body.riesgos || "Sin riesgos identificados",

      fullAnalysis: body.fullAnalysis || "No hay análisis completo disponible",
      
      // Color de la conclusión principal (verde = alcista, rojo = bajista)
      conclusionColor: body.conclusionColor || "red",

      ultimaActualizacion: new Date().toLocaleString('es-PE')
    };

    console.log("✅ Análisis guardado correctamente:", new Date().toLocaleTimeString('es-PE'));

    return NextResponse.json({ 
      success: true, 
      message: "Análisis guardado correctamente",
      timestamp: latestAnalysis.ultimaActualizacion 
    });

  } catch (error) {
    console.error("❌ Error al guardar análisis:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error al guardar el análisis" 
    }, { status: 500 });
  }
}
