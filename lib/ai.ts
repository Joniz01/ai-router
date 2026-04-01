// lib/ai.ts
export type Provider = "gemini" | "groq" | "xai";

interface StreamOptions {
  provider: Provider;
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  onChunk: (chunk: string) => void;
  temperature?: number;
  maxTokens?: number;
}

export async function streamAI({
  provider,
  apiKey,
  model,
  systemPrompt,
  messages,
  onChunk,
  temperature = 0.7,
  maxTokens = 4000,
}: StreamOptions): Promise<string> {
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
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6).trim();
        if (data === "[DONE]" || data === "") continue;

        try {
          const parsed = JSON.parse(data);
          const content = extractFn(parsed);
          if (content) {
            fullResponse += content;
            onChunk(content);
          }
        } catch (e) {
          // Ignorar líneas no válidas
        }
      }
    }
  };

  let url: string;
  let body: any;
  let headers: HeadersInit = { "Content-Type": "application/json" };

  if (provider === "gemini") {
    const geminiModel = model || "gemini-2.0-flash";
    url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    body = {
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents,
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    };
  } else {
    // Groq y xAI (formato OpenAI compatible)
    const isXai = provider === "xai";
    url = isXai 
      ? "https://api.x.ai/v1/chat/completions" 
      : "https://api.groq.com/openai/v1/chat/completions";

    const openaiMessages = [...messages];
    if (systemPrompt) {
      openaiMessages.unshift({ role: "system", content: systemPrompt });
    }

    headers = {
      ...headers,
      Authorization: `Bearer ${apiKey}`,
    };

    body = {
      model: model || (isXai ? "grok-beta" : "llama-3.3-70b-versatile"),
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
      const errData = await res.json();
      errorMsg = errData.error?.message || errorMsg;
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
