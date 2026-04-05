// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { streamAI, type Provider } from '../../../lib/ai';

export const maxDuration = 60; // Aumenta el tiempo máximo de ejecución (importante en Vercel)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      provider,
      apiKey,
      model,
      systemPrompt,
      messages,
      temperature = 0.7,
      maxTokens = 8000, // Aumentado para respuestas largas
    } = body;

    // Validaciones (sin cambios)
    if (!provider || !apiKey || !messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos" }), { status: 400 });
    }

    if (!["gemini", "groq"].includes(provider)) {
      return new Response(JSON.stringify({ error: "Proveedor no soportado" }), { status: 400 });
    }

    // Normalización de mensajes (mantengo tu lógica, está bien)
    const normalizedMessages = messages.map((msg: any) => {
      if (!msg.image || typeof msg.image !== 'string' || !msg.image.startsWith('data:image')) {
        return msg;
      }

      const base64Data = msg.image.includes(',') ? msg.image.split(',')[1] : msg.image;
      const mimeType = msg.image.includes('image/png') ? 'image/png' : 'image/jpeg';

      if (provider === "gemini") {
        const parts = [];
        if (msg.content || msg.text) parts.push({ text: msg.content || msg.text });
        parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
        return { role: "user", parts };
      } else {
        const content = [];
        if (msg.content || msg.text) content.push({ type: "text", text: msg.content || msg.text });
        content.push({ type: "image_url", image_url: { url: msg.image } });
        return { role: "user", content };
      }
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamAI({
            provider: provider as Provider,
            apiKey: apiKey.trim(),
            model: model || undefined,
            systemPrompt: systemPrompt || undefined,
            messages: normalizedMessages,
            temperature,
            maxTokens,
            onChunk: (chunk: string) => {
              // Enviar chunk + salto de línea explícito para forzar flush
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)
              );
            },
          });

          // Mensaje de finalización
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        } catch (error: any) {
          console.error(`Error con ${provider}:`, error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: error.message || "Error en la IA" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Importante para Vercel / Nginx
      },
    });
  } catch (error: any) {
    console.error("Error en /api/chat:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno" }),
      { status: 500 }
    );
  }
}
