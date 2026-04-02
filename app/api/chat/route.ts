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
        JSON.stringify({ error: "Faltan campos requeridos: provider, apiKey y messages" }),
        { status: 400 }
      );
    }

    if (!["gemini", "groq", "xai", "qwen", "deepseek"].includes(provider)) {
      return new Response(
        JSON.stringify({ 
          error: "Proveedor no soportado. Usa: gemini, groq, xai, qwen o deepseek" 
        }),
        { status: 400 }
      );
    }

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "El array messages no puede estar vacío" }),
        { status: 400 }
      );
    }

    // === NORMALIZACIÓN INTELIGENTE DE IMÁGENES ===
    const normalizedMessages = messages.map((msg: any) => {
      // Si no hay imagen, devolvemos el mensaje tal cual
      if (!msg.image || typeof msg.image !== 'string' || !msg.image.startsWith('data:image')) {
        return msg;
      }

      const base64Data = msg.image.includes(',') 
        ? msg.image.split(',')[1] 
        : msg.image;

      const mimeType = msg.image.includes('image/png') ? 'image/png' 
                      : msg.image.includes('image/jpeg') ? 'image/jpeg' 
                      : 'image/png';

      // Tratamiento especial por proveedor
      if (provider === "gemini") {
        // Formato nativo de Gemini (mejor soporte multimodal)
        const parts = [];
        if (msg.content || msg.text) {
          parts.push({ text: msg.content || msg.text });
        }
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        });

        return {
          role: "user",
          parts: parts
        };
      } 
      else if (provider === "deepseek") {
        // DeepSeek no soporta imágenes correctamente → convertimos a texto
        return {
          role: "user",
          content: (msg.content || msg.text || "") + 
                   "\n\n[Nota: Este modelo no procesa imágenes en este momento. Solo se usó el texto.]"
        };
      } 
      else {
        // Groq, xAI, Qwen → formato OpenAI compatible
        const content = [];
        if (msg.content || msg.text) {
          content.push({ type: "text", text: msg.content || msg.text });
        }
        content.push({
          type: "image_url",
          image_url: { url: msg.image }
        });

        return {
          role: "user",
          content: content
        };
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
            encoder.encode(`data: ${JSON.stringify({ 
              error: error.message || "Error al comunicarse con la IA" 
            })}\n\n`)
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
