/** Búsqueda web simple para el asistente (DuckDuckGo Instant Answer API) */
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  try {
    const q = event.queryStringParameters?.q?.trim();
    if (!q) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing q" }) };
    }
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&skip_disambig=1`;
    const r = await fetch(url);
    const data = await r.json();
    const snippets = [];
    if (data.AbstractText) {
      snippets.push({ title: data.Heading || q, text: data.AbstractText, url: data.AbstractURL || "" });
    }
    (data.RelatedTopics || []).slice(0, 6).forEach((t) => {
      if (t.Text) snippets.push({ title: t.Text.split(" - ")[0] || q, text: t.Text, url: t.FirstURL || "" });
      else if (t.Topics) {
        t.Topics.slice(0, 3).forEach((sub) => {
          if (sub.Text) snippets.push({ title: sub.Text.split(" - ")[0], text: sub.Text, url: sub.FirstURL || "" });
        });
      }
    });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ query: q, results: snippets.slice(0, 8) }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message || "Search failed" }),
    };
  }
};
