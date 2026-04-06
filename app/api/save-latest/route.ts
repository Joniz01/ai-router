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

function parseAnalysis(text: string) {
  const result: any = { ...latestAnalysis };
  result.fullAnalysis = text;

  // Extraer secciones principales
  const syncMatch = text.match(/1\.\s*\*?\*?Sincronización de Timestamps\*?\*?([\s\S]*?)(?=2\.|$)/i);
  const resumenMatch = text.match(/2\.\s*\*?\*?Resumen General del Mercado\*?\*?([\s\S]*?)(?=3\.|$)/i);
  const gexbotMatch = text.match(/3\.\s*\*?\*?Análisis GEXBOT.*?([\s\S]*?)(?=4\.|$)/i);
  const orderFlowMatch = text.match(/4\.\s*\*?\*?Análisis Order Flow\*?\*?([\s\S]*?)(?=5\.|$)/i);
  const setupMatch = text.match(/5\.\s*\*?\*?Setup Recomendado\*?\*?([\s\S]*?)(?=6\.|$)/i);
  const riesgosMatch = text.match(/6\.\s*\*?\*?Riesgos Clave\*?\*?([\s\S]*?)(?=$)/i);

  if (syncMatch) result.sincronizacion = syncMatch[1].trim();
  if (resumenMatch) result.resumenGeneral = resumenMatch[1].trim();
  if (gexbotMatch) result.gexbot = gexbotMatch[1].trim();
  if (orderFlowMatch) result.orderFlow = orderFlowMatch[1].trim();
  if (riesgosMatch) result.riesgos = riesgosMatch[1].trim();

  // Parseo del Setup
  if (setupMatch) {
    const setupText = setupMatch[1];
    const entradaM = setupText.match(/Entrada[:\s-]*(.+?)(?=\n|$)/i);
    const slM = setupText.match(/Stop Loss[:\s-]*(.+?)(?=\n|$)/i);
    const t1M = setupText.match(/Target 1[:\s-]*(.+?)(?=\n|$)/i) || setupText.match(/TP1[:\s-]*(.+?)(?=\n|$)/i);
    const t2M = setupText.match(/Target 2[:\s-]*(.+?)(?=\n|$)/i) || setupText.match(/TP2[:\s-]*(.+?)(?=\n|$)/i);
    const probM = setupText.match(/Probabilidad[:\s-]*(\d+%?)/i);

    result.entrada = entradaM ? entradaM[1].trim() : "--";
    result.stopLoss = slM ? slM[1].trim() : "--";
    result.target1 = t1M ? t1M[1].trim() : "--";
    result.target2 = t2M ? t2M[1].trim() : "--";
    result.probabilidad = probM ? probM[1].trim() : "--";
  }

  // Determinar color
  const lower = text.toLowerCase();
  if (lower.includes("long") || lower.includes("alcista") || lower.includes("compra")) {
    result.conclusionColor = "green";
  } else if (lower.includes("short") || lower.includes("bajista") || lower.includes("venta")) {
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
    const rawText = body.fullAnalysis || body.analysis || body.text || "";

    if (rawText && typeof rawText === 'string') {
      const parsed = parseAnalysis(rawText);
      latestAnalysis = parsed;
    } else {
      latestAnalysis.fullAnalysis = rawText || "Sin análisis recibido";
    }

    latestAnalysis.ultimaActualizacion = new Date().toLocaleString('es-PE');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al guardar" }, { status: 500 });
  }
}
