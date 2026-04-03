// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { provider: requestedProvider, model, systemPrompt, messages, temperature = 0.7, maxTokens = 4000 } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "El campo 'messages' es requerido y no puede estar vacío" }), { status: 400 });
    }

    // Cargar configuración desde Upstash
    const geminiKeys = await kv.get<string[]>('config:gemini:keys') || [];
    const groqKeys = await kv.get<string[]>('config:groq:keys') || [];
    let priority = await kv.get<string[]>('config:priority') || ['gemini', 'groq'];

    if (geminiKeys.length === 0 && groqKeys.length === 0) {
      return new Response(
        JSON.stringify({ error: "No hay API Keys configuradas. Ve a /admin para agregar keys." }), 
        { status: 400 }
      );
    }

    let currentProvider: 'gemini' | 'groq' = (requestedProvider as 'gemini' | 'groq') || priority[0] as 'gemini' | 'groq';
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      const currentIndex = await kv.get<number>(`fallback:${currentProvider}:current`) ?? 0;
      const keys = currentProvider === 'gemini' ? geminiKeys : groqKeys;
      
      if (keys.length === 0) {
        // Cambiar al siguiente proveedor
        const nextIndex = (priority.indexOf(currentProvider) + 1) % priority.length;
        currentProvider = priority[nextIndex] as 'gemini' | 'groq';
        attempts++;
        continue;
      }

      const apiKey = keys[currentIndex % keys.length];

      try {
        // Llamada real según proveedor
        let url: string;
        let headers: any = { "Content-Type": "application/json" };
        let bodyData: any;

        if (currentProvider === 'gemini') {
          const geminiModel = model || "gemini-2.5-flash";
          url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${apiKey}`;
          
          const contents = messages.map((msg: any) => ({
            role: "user",
            parts: msg.image 
              ? [{ text: msg.content || msg.text || "" }, { inline_data: { mime_type: "image/jpeg", data: msg.image.split(',')[1] } }]
              : [{ text: msg.content || msg.text || "" }]
          }));

          bodyData = {
            systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
            contents,
            generationConfig: { temperature, maxOutputTokens: maxTokens }
          };
        } else {
          // Groq
          url = "https://api.groq.com/openai/v1/chat/completions";
          headers.Authorization = `Bearer ${apiKey}`;

          const openaiMessages = [...messages];
          if (systemPrompt) openaiMessages.unshift({ role: "system", content: systemPrompt });

          bodyData = {
            model: model || "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: openaiMessages,
            temperature,
            max_tokens: maxTokens,
            stream: true
          };
        }

        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(bodyData)
        });

        if (!res.ok) {
          const errorText = await res.text();
          const isQuotaError = errorText.toLowerCase().includes('quota') || 
                              errorText.toLowerCase().includes('rate') || 
                              res.status === 429;

          if (isQuotaError) {
            // Rotar key
            await kv.set(`fallback:${currentProvider}:current`, (currentIndex + 1) % keys.length);
            
            const nextKeyNum = ((currentIndex + 1) % keys.length) + 1;
            console.log(`Quota agotada en ${currentProvider} Key #${currentIndex + 1}. Probando Key #${nextKeyNum}`);
            
            attempts++;
            continue;
          }
          throw new Error(errorText || `Error ${res.status}`);
        }

        // Éxito - actualizar índice
        await kv.set(`fallback:${currentProvider}:current`, (currentIndex + 1) % keys.length);

        // Retornar el stream
        return new Response(res.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });

      } catch (error: any) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        error: "Se agotaron todas las claves disponibles de Gemini y Groq. Inténtalo más tarde." 
      }), 
      { status: 429 }
    );

  } catch (error: any) {
    console.error("Error en /api/chat:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno del servidor" }),
      { status: 500 }
    );
  }
}
