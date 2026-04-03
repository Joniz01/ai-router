// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { kv } from '@vercel/kv';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function getConfig() {
  const geminiKeys = await kv.get<string[]>('config:gemini:keys') || [];
  const groqKeys = await kv.get<string[]>('config:groq:keys') || [];
  const priority = await kv.get<string[]>('config:priority') || ['gemini', 'groq'];
  
  return { geminiKeys, groqKeys, priority };
}

async function getCurrentIndex(provider: string): Promise<number> {
  const index = await kv.get<number>(`fallback:${provider}:current`);
  return index ?? 0;
}

async function setCurrentIndex(provider: string, index: number) {
  await kv.set(`fallback:${provider}:current`, index);
}

function getKey(provider: string, index: number): string | null {
  if (provider === 'gemini') {
    const keys = (process.env.GEMINI_KEYS || '').split(',').filter(Boolean);
    return keys[index % keys.length] || null;
  } else {
    const keys = (process.env.GROQ_KEYS || '').split(',').filter(Boolean);
    return keys[index % keys.length] || null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider: requestedProvider, model, systemPrompt, messages, temperature = 0.7, maxTokens = 4000 } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "El campo 'messages' es requerido" }), { status: 400 });
    }

    const { geminiKeys, groqKeys, priority } = await getConfig();

    if (geminiKeys.length === 0 && groqKeys.length === 0) {
      return new Response(JSON.stringify({ error: "No hay API Keys configuradas. Agrega keys en el Dashboard /admin" }), { status: 400 });
    }

    let currentProvider = requestedProvider || priority[0];
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      const currentIndex = await getCurrentIndex(currentProvider);
      let apiKey = getKey(currentProvider, currentIndex);

      // Si no hay key en este proveedor, saltar al siguiente
      if (!apiKey) {
        const nextIndex = (priority.indexOf(currentProvider) + 1) % priority.length;
        currentProvider = priority[nextIndex];
        attempts++;
        continue;
      }

      try {
        // Aquí llamamos al streamAI (necesitamos crearlo)
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {  // Placeholder - se actualizará
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || (currentProvider === 'groq' ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'gemini-2.5-flash'),
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: true
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (errorText.toLowerCase().includes('quota') || 
              errorText.toLowerCase().includes('rate') || 
              response.status === 429) {
            
            // Rotar key
            await setCurrentIndex(currentProvider, currentIndex + 1);
            attempts++;
            continue;
          }
          throw new Error(errorText);
        }

        // Éxito
        await setCurrentIndex(currentProvider, currentIndex + 1);
        
        return new Response(response.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        });

      } catch (error: any) {
        const msg = error.message.toLowerCase();
        if (msg.includes('quota') || msg.includes('rate') || msg.includes('limit') || error.status === 429) {
          await setCurrentIndex(currentProvider, currentIndex + 1);
          attempts++;
          continue;
        }
        throw error;
      }
    }

    return new Response(
      JSON.stringify({ 
        error: "Se agotaron todas las keys disponibles de Gemini y Groq. Inténtalo más tarde." 
      }), 
      { status: 429 }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Error interno del servidor" }),
      { status: 500 }
    );
  }
}
