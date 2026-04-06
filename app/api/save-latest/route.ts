// app/api/save-latest/route.ts
import { NextRequest, NextResponse } from 'next/server';

let latestAnalysis: any = {
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
  conclusionColor: "red",
  ultimaActualizacion: new Date().toLocaleString('es-PE')
};

function parseGeminiResponse(text: string) {
  const result: any = { ...latestAnalysis };

  result.fullAnalysis = text;

  // Extraer secciones usando regex aproximado
  const sections = {
    sincronizacion: /1\.\s*\**Sincronización de Timestamps\**([\s\S]*?)(?=2\.|$)/i,
    resumen: /2\.\s*\**Resumen General del Mercado\**([\s\S]*?)(?=3\.|$)/i,
    gexbot: /3\.\s*\**Análisis GEXBOT Nivel 3\**([\s\S]*?)(?=4\.|$)/i,
    orderflow: /4\.\s*\**Análisis Order Flow\**([\s\S]*?)(?=5\.|$)/i,
    setup: /5\.\s*\**Setup Recomendado\**([\s\S]*?)(?=6\.|$)/i,
    riesgos: /6\.\s*\**Riesgos Clave\**([\s\S]*?)(?=$)/i,
  };

  // Sincronización
  const syncMatch = text.match(sections.sincronizacion);
  if (syncMatch) result.sincronizacion = syncMatch[1].trim();

  // Resumen General
  const resumenMatch = text.match(sections.resumen);
  if (resumenMatch) result.resumenGeneral = resumenMatch[1].trim();

  // GEXBOT
  const gexbotMatch = text.match(sections.gexbot);
  if (gexbotMatch) result.gexbot = gexbotMatch[1].trim();

  // Order Flow
  const orderflowMatch = text.match(sections.orderflow);
  if (orderflowMatch) result.orderFlow = orderflowMatch[1].trim();

  // Setup Recomendado
  const setupMatch = text.match(sections.setup);
  if (setupMatch) {
    const setupText = setupMatch[1].trim();

    // Extraer campos del Setup
    const entradaMatch = setupText.match(/Entrada[:\s-]*(.+?)(?=\n|$)/i);
    const slMatch = setupText.match(/Stop Loss[:\s-]*(.+?)(?=\n|$)/i);
    const target1Match = setupText.match(/Target 1[:\s-]*(.+?)(?=\n|$)/i) || setupText.match(/TP1[:\s-]*(.+?)(?=\n|$)/i);
    const target2Match = setupText.match(/Target 2[:\s-]*(.+?)(?=\n|$)/i) || setupText.match(/TP2[:\s-]*(.+?)(?=\n|$)/i);
    const probMatch = setupText.match(/Probabilidad[:\s-]*(\d+%?)/i);

    result.entrada = entradaMatch ? entradaMatch[1].trim() : "--";
    result.stopLoss = slMatch ? slMatch[1].trim() : "--";
    result.target1 = target1Match ? target1Match[1].trim() : "--";
    result.target2 = target2Match ? target2Match[1].trim() : "--";
    result.probabilidad = probMatch ? probMatch[1].trim() : "--";
  }

  // Riesgos
  const riesgosMatch = text.match(sections.riesgos);
  if (riesgosMatch) result.riesgos = riesgosMatch[1].trim();

  // Determinar color (si menciona LONG / ALCISTA / COMPRA)
  const lowerText = text.toLowerCase();
  if (lowerText.includes("long") || lowerText.includes("alcista") || lowerText.includes("compra") || lowerText.includes("target")) {
    result.conclusionColor = "green";
  } else if (lowerText.includes("short") || lowerText.includes("bajista") || lowerText.includes("venta")) {
    result.conclusionColor = "red";
  }

  return result;
}

export async function GET() {
  return NextResponse.json(latestAnalysis);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawText = body.fullAnalysis || body.analysis || "";

    if (rawText) {
      const parsed = parseGeminiResponse(rawText);
      latestAnalysis = { ...parsed };
    } else {
      // Fallback si no hay texto completo
      latestAnalysis = {
        ...latestAnalysis,
        fullAnalysis: body.fullAnalysis || "Sin análisis",
        ultimaActualizacion: new Date().toLocaleString('es-PE')
      };
    }

    console.log("✅ Análisis parseado y guardado");
    return NextResponse.json({ success: true, message: "Análisis guardado y parseado" });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ success: false, error: "Error al procesar análisis" }, { status: 500 });
  }
}
