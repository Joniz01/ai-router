// === NORMALIZACIÓN INTELIGENTE DE IMÁGENES (mejorada) ===
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
