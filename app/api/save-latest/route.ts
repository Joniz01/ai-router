// app/api/save-latest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_FILE = path.join('/tmp', 'latest-analysis.json');

const DEFAULT_STATE = {
  precioActual:        "--",
  tendencia:           "--",
  notasAdicionales:    "Sin resumen disponible.",
  analisisOrderFlow:   "",
  analisisGex:         "",
  resultadoPrincipal:  "Sin análisis disponible",
  tipoOperacion:       "--",
  confluencia:         "--",
  entrada:             "--",
  stopLoss:            "--",
  target:              "--",
  tp2:                 "--",
  consideraciones:     "",
  riesgosClave:        "No se detectaron riesgos clave.",
  analisisDetallado:   "No hay análisis detallado disponible.",
  ultimaActualizacion: new Date().toLocaleString('es-PE')
};

async function readState() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function writeState(data: object) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data), 'utf-8');
}

export async function GET() {
  const state = await readState();
  return NextResponse.json(state);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newState = {
      precioActual:        body.precioActual        || "--",
      tendencia:           body.tendencia           || "--",
      notasAdicionales:    body.notasAdicionales    || "Sin resumen disponible.",
      analisisOrderFlow:   body.analisisOrderFlow   || "",
      analisisGex:         body.analisisGex         || "",
      resultadoPrincipal:  body.resultadoPrincipal  || "Sin análisis disponible",
      tipoOperacion:       body.tipoOperacion       || "--",
      confluencia:         body.confluencia         || "--",
      entrada:             body.entrada             || "--",
      stopLoss:            body.stopLoss            || "--",
      target:              body.target              || "--",
      tp2:                 body.tp2                 || "--",
      consideraciones:     body.consideraciones     || "",
      riesgosClave:        body.riesgosClave        || "No se detectaron riesgos clave.",
      analisisDetallado:   body.analisisDetallado   || "No hay análisis detallado disponible.",
      ultimaActualizacion: new Date().toLocaleString('es-PE')
    };

    await writeState(newState);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[save-latest] Error:', error);
    return NextResponse.json(
      { success: false, error: "Error al guardar el análisis" },
      { status: 500 }
    );
  }
}
