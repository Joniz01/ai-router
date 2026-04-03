// app/api/save-latest/route.ts
import { NextRequest } from 'next/server';

let latestAnalysis = {
  timestamp: "",
  precioActual: "",
  tendencia: "",
  horarioNY: "",
  notas: "",
  resultadoPrincipal: "",
  conclusionColor: "red", // "red" o "green"
  entrada: "",
  stopLoss: "",
  target: "",
  rr: "",
  fullAnalysis: ""
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    latestAnalysis = {
      timestamp: new Date().toLocaleTimeString('es-ES'),
      precioActual: body.precioActual || "",
      tendencia: body.tendencia || "",
      horarioNY: body.horarioNY || "",
      notas: body.notas || "",
      resultadoPrincipal: body.resultadoPrincipal || "",
      conclusionColor: body.conclusionColor || "red",
      entrada: body.entrada || "",
      stopLoss: body.stopLoss || "",
      target: body.target || "",
      rr: body.rr || "",
      fullAnalysis: body.fullAnalysis || ""
    };

    return new Response(JSON.stringify({ success: true, message: "Análisis guardado correctamente" }), { 
      status: 200 
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: "Error al guardar" }), { 
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
