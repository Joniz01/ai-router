// app/api/save-latest/route.ts
import { NextRequest } from 'next/server';

let latestAnalysis = {
  timestamp: "",
  precioActual: "--",
  tendencia: "--",
  horarioNY: "--",
  notas: "Sin notas adicionales.",
  resultadoPrincipal: "Sin análisis disponible",
  conclusionColor: "red",
  entrada: "--",
  stopLoss: "--",
  target: "--",
  rr: "--",
  fullAnalysis: "No hay análisis detallado disponible."
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    latestAnalysis = {
      timestamp: new Date().toLocaleString('es-ES'),
      precioActual: body.precioActual || "--",
      tendencia: body.tendencia || "--",
      horarioNY: body.horarioNY || "--",
      notas: body.notas || "Sin notas adicionales.",
      resultadoPrincipal: body.resultadoPrincipal || "Sin análisis disponible",
      conclusionColor: body.conclusionColor || "red",
      entrada: body.entrada || "--",
      stopLoss: body.stopLoss || "--",
      target: body.target || "--",
      rr: body.rr || "--",
      fullAnalysis: body.fullAnalysis || "No hay análisis detallado disponible."
    };

    return new Response(JSON.stringify({ success: true, message: "Análisis guardado correctamente" }), { 
      status: 200 
    });
  } catch (error: any) {
    console.error("Error guardando análisis:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 500 
    });
  }
}

export async function GET() {
  return new Response(JSON.stringify(latestAnalysis), {
    headers: { "Content-Type": "application/json" },
    status: 200
  });
}
