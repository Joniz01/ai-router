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

    // Validaciones básicas
    if (!provider || !apiKey || !messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos: provider, apiKey, messages" }),
        { status: 400 }
      );
    }

    if (!["gemini", "groq", "xai"].includes(provider)) {
      return new Response(
        JSON.stringify({ error: "Proveedor no soportado. Usa: gemini, groq o xai" }),
        { status: 400 }
      );
    }

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "El array messages no puede estar vacío" }),
        { status: 400 }
      );
    }

    // Preparar respuesta en streaming
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
            messages,
            temperature,
            maxTokens,
            onChunk: (chunk: string) => {
              fullResponse += chunk;
              // Enviar chunk al cliente
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)
              );
            },
          });

          // Enviar señal de finalización
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`)
          );
          controller.close();
        } catch (error: any) {
          console.error("Error en streamAI:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ 
                error: error.message || "Error desconocido en la IA",
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
      JSON.stringify({ 
        error: error.message || "Error interno del servidor" 
      }),
      { status: 500 }
    );
  }
}
