// lib/ai.ts
export type Provider = "gemini" | "groq" | "xai" | "qwen" | "deepseek";

interface StreamOptions {
  provider: Provider;
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  messages: any[];
  onChunk: (chunk: string) => void;
  temperature?: number;
  maxTokens?: number;
}

export async function streamAI(options: StreamOptions): Promise<string> {
  const { provider, apiKey, model, systemPrompt, messages, onChunk, temperature = 0.7, maxTokens = 4000 } = options;
  let fullResponse = "";

  const handleStream = async (res: Response, extractFn: (json: any) => string | null) => {
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No se pudo leer el stream");
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6).trim();
        if (data === "[DONE]" || !data) continue;
        try {
          const parsed = JSON.parse(data);
          const content = extractFn(parsed);
          if (content) {
            fullResponse += content;
            onChunk(content);
          }
        } catch (e) {}
      }
    }
  };

  let url: string;
  let body: any;
  let headers: HeadersInit = { "Content-Type": "application/json" };

  if (provider === "gemini") {
    const geminiModel = model || "gemini-2.0-flash";
    url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

    const contents = messages.map((msg: any) => {
      if (msg.parts) return { role: "user", parts: msg.parts };
      return {
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content || msg.text || "" }]
      };
    });

    body = {
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents,
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    };
  } else {
    // Todos los demás (Groq, xAI, Qwen, DeepSeek) usan formato OpenAI-compatible
    const isXai = provider === "xai";
    const baseUrlMap: Record<string, string> = {
      groq: "https://api.groq.com/openai/v1/chat/completions",
      xai: "https://api.x.ai/v1/chat/completions",
      qwen: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",   // Qwen (Alibaba DashScope)
      deepseek: "https://api.deepseek.com/chat/completions"
    };

    url = baseUrlMap[provider] || "https://api.groq.com/openai/v1/chat/completions";

    const openaiMessages = [...messages];
    if (systemPrompt) openaiMessages.unshift({ role: "system", content: systemPrompt });

    headers = { ...headers, Authorization: `Bearer ${apiKey}` };

    body = {
      model: model || getDefaultModel(provider),
      messages: openaiMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };
  }

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });

  if (!res.ok) {
    let errorMsg = `${provider.toUpperCase()} Error ${res.status}`;
    try {
      const err = await res.json();
      errorMsg = err.error?.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  if (provider === "gemini") {
    await handleStream(res, (json) => json.candidates?.[0]?.content?.parts?.[0]?.text || null);
  } else {
    await handleStream(res, (json) => json.choices?.[0]?.delta?.content || null);
  }

  return fullResponse;
}

function getDefaultModel(provider: string): string {
  const defaults: Record<string, string> = {
    groq: "llama-3.3-70b-versatile",
    xai: "grok-beta",
    qwen: "qwen2.5-vl-72b-instruct",     // o "qwen-vl-plus" si tienes acceso
    deepseek: "deepseek-chat"            // DeepSeek tiene soporte limitado de visión en algunos modelos
  };
  return defaults[provider] || "llama-3.3-70b-versatile";
}
