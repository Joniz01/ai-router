// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { streamAI, type Provider } from '../../../lib/ai';

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
      maxTokens = 4000,
    } = body;

    // Validaciones mejoradas
    if (!provider || !apiKey || !messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos: provider, apiKey y messages" }),
        { status: 400 }
      );
    }

    if (!["gemini", "groq", "xai", "qwen", "deepseek"].includes(provider)) {
      return new Response(
        JSON.stringify({ error: "Proveedor no soportado. Usa: gemini, groq, xai, qwen o deepseek" }),
        { status: 400 }
      );
    }

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "El array messages no puede estar vacío" }),
        { status: 400 }
      );
    }

    // Normalizar mensajes con imágenes (para compatibilidad con todos los proveedores)
    const normalizedMessages = messages.map((msg: any) => {
      if (msg.image && typeof msg.image === 'string' && msg.image.startsWith('data:image')) {
        // Convertir formato simple { image: base64 } a formato OpenAI-style
        return {
          role: msg.role || "user",
          content: [
            { type: "text", text: msg.content || "Analiza esta imagen" },
            { type: "image_url", image_url: { url: msg.image } }
          ]
        };
      }

      // Si ya viene en formato array (como el nuevo frontend), lo dejamos tal cual
      if (Array.isArray(msg.content)) {
        return msg;
      }

      // Caso normal (solo texto)
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
            messages: normalizedMessages,   // ← Usamos la versión normalizada
            temperature,
            maxTokens,
            onChunk: (chunk: string) => {
              fullResponse += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)
              );
            },
          });

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`)
          );
          controller.close();
        } catch (error: any) {
          console.error("Error en streamAI:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: error.message || "Error al comunicarse con la IA",
                provider
              })}\n\n`
            )
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
    return new Response(
      JSON.stringify({ error: error.message || "Error interno del servidor" }),
      { status: 500 }
    );
  }
}
