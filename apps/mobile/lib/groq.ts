import AsyncStorage from "@react-native-async-storage/async-storage";

export const GROQ_KEY_STORAGE = "pp_groq_key";

export async function getGroqKey(): Promise<string> {
  return (await AsyncStorage.getItem(GROQ_KEY_STORAGE)) || "";
}

export async function saveGroqKey(key: string): Promise<void> {
  if (key.trim()) {
    await AsyncStorage.setItem(GROQ_KEY_STORAGE, key.trim());
  } else {
    await AsyncStorage.removeItem(GROQ_KEY_STORAGE);
  }
}

export async function aiCall(
  prompt: string,
  imgBase64: string | null = null
): Promise<string> {
  const key = await getGroqKey();
  if (!key) throw new Error("No Groq API key. Go to Profile to add one.");

  const model = imgBase64
    ? "meta-llama/llama-4-scout-17b-16e-instruct"
    : "llama-3.3-70b-versatile";

  const content: any = imgBase64
    ? [
        {
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${imgBase64}` },
        },
        { type: "text", text: prompt },
      ]
    : prompt;

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err?.error?.message || "HTTP " + r.status);
  }

  const data = await r.json();
  return data.choices?.[0]?.message?.content || "";
}

export function buildFreeQuestions(text: string): string[] {
  if ((text || "").trim().length < 12) return [];
  return [
    "¿Para quién es esta idea?",
    "¿Qué problema resuelve de forma concreta?",
    "¿Qué materiales, recursos o habilidades tienes ya?",
    "¿Qué la haría diferente a otras opciones?",
    "¿Cuál sería el primer prototipo pequeño que puedes probar?",
  ];
}

export function detectTag(text: string): string {
  const lower = (text || "").toLowerCase();
  if (/app|web|software|plataforma|digital|ia|inteligencia/.test(lower))
    return "App";
  if (/venta|tienda|cliente|negocio|emprend/.test(lower)) return "Negocio";
  if (/producto|fabric|material|objeto|prototipo/.test(lower)) return "Producto";
  return "Proyecto";
}

export function buildVisualPrompt(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^\wáéíóúñü\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 6)
    .join(",");
  return `High quality realistic concept image, prototype visualization, ${words}, clean composition, natural light, detailed, no text, no watermark`;
}

export function pollinationsUrl(prompt: string): string {
  const seed = Math.abs(
    String(prompt)
      .split("")
      .reduce((a, c) => ((a * 31) + c.charCodeAt(0)) | 0, 7)
  );
  const enc = encodeURIComponent(prompt.slice(0, 420));
  return `https://image.pollinations.ai/prompt/${enc}?model=flux&width=800&height=450&nologo=true&enhance=true&seed=${seed}`;
}
