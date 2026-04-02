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

    if (!provider || !apiKey || !messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos: provider, apiKey y messages" }),
        { status: 400 }
      );
    }

    if (!["gemini", "groq", "xai", "qwen", "deepseek"].includes(provider)) {  // Agrega qwen/deepseek después si quieres
      return new Response(
  JSON.stringify({ error: "Proveedor no soportado. Usa: gemini, groq, xai, qwen o deepseek" }),
  { status: 400 }
);
    }

    // === NORMALIZACIÓN INTELIGENTE DE IMÁGENES ===
const normalizedMessages = messages.map((msg: any) => {
  if (!msg.image || typeof msg.image !== 'string' || !msg.image.startsWith('data:image')) {
    return msg; // texto normal
  }

  const base64Data = msg.image.includes(',') ? msg.image.split(',')[1] : msg.image;
  const mimeType = msg.image.includes('image/png') ? 'image/png' 
                  : msg.image.includes('image/jpeg') ? 'image/jpeg' 
                  : 'image/png';

  if (provider === "gemini") {
    const parts = [];
    if (msg.content || msg.text) parts.push({ text: msg.content || msg.text });
    parts.push({
      inline_data: { mime_type: mimeType, data: base64Data }
    });

    return { role: "user", parts };
  } else {
    // Groq / xAI
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
          console.error(`Error con ${provider}:`, error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: error.message || "Error al comunicarse con la IA" })}\n\n`)
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
