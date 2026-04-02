// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { streamAI, type Provider } from '../../../lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let {
      provider,
      apiKey,
      model,
      systemPrompt,
      messages,
      temperature = 0.7,
      maxTokens = 4000,
    } = body;

    if (!provider || !apiKey || !messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos: provider, apiKey y messages" }), { status: 400 });
    }

    if (!["gemini", "groq", "xai", "qwen", "deepseek"].includes(provider)) {
      return new Response(JSON.stringify({ error: "Proveedor no soportado" }), { status: 400 });
    }

    // === NORMALIZACIÓN DE MENSAJES CON IMÁGENES ===
    const normalizedMessages = messages.map((msg: any) => {
      if (!msg.content) return msg;

      // Si content ya es un array (formato OpenAI-style)
      if (Array.isArray(msg.content)) {
        return msg;
      }

      // Si viene con campo "image" (formato simple)
      if (msg.image && typeof msg.image === 'string' && msg.image.startsWith('data:image')) {
        return {
          role: msg.role || "user",
          content: [
            { type: "text", text: msg.content || "Analiza esta imagen detalladamente" },
            { type: "image_url", image_url: { url: msg.image } }
          ]
        };
      }

      // Caso texto normal
      return msg;
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = "";

          await streamAI({
            provider: provider as Provider,
            apiKey: apiKey.trim(),
            model: model || undefined,
            systemPrompt: systemPrompt || undefined,
            messages: normalizedMessages,
            temperature,
            maxTokens,
            onChunk: (chunk: string) => {
              fullResponse += chunk;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
            },
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`));
          controller.close();
        } catch (error: any) {
          console.error(`Error con ${provider}:`, error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: error.message || "Error desconocido", provider })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Error en /api/chat:", error);
    return new Response(JSON.stringify({ error: error.message || "Error interno" }), { status: 500 });
  }
}
