/** Proxy Groq para producción (key solo en Netlify env GROQ_API_KEY) */
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "POST only" }) };
  }
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: "GROQ_API_KEY not configured on server" }) };
  }
  try {
    const body = JSON.parse(event.body || "{}");
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    return { statusCode: r.status, headers, body: text };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message || "Groq proxy error" }) };
  }
};
