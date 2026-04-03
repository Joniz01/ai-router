// app/api/admin/config/route.ts
import { NextRequest } from 'next/server';
import { kv } from '@vercel/kv';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export async function GET(request: NextRequest) {
  const password = request.headers.get('x-admin-password');

  if (password !== ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Acceso no autorizado' }), { status: 401 });
  }

  try {
    const geminiKeys = await kv.get<string[]>('config:gemini:keys') || [];
    const groqKeys = await kv.get<string[]>('config:groq:keys') || [];
    const priority = await kv.get<string[]>('config:priority') || ['gemini', 'groq'];

    return new Response(JSON.stringify({ 
      geminiKeys, 
      groqKeys, 
      priority 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al leer configuración de Upstash' }), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const password = request.headers.get('x-admin-password');

  if (password !== ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Acceso no autorizado' }), { status: 401 });
  }

  try {
    const { geminiKeys, groqKeys, priority } = await request.json();

    await kv.set('config:gemini:keys', geminiKeys || []);
    await kv.set('config:groq:keys', groqKeys || []);
    await kv.set('config:priority', priority || ['gemini', 'groq']);

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al guardar en Upstash' }), { status: 500 });
  }
}
