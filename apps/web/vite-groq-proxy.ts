import type { Plugin } from "vite";

/** En local, emula /.netlify/functions/groq usando GROQ_API_KEY o VITE_GROQ_API_KEY */
export function groqDevProxy(): Plugin {
  return {
    name: "groq-dev-proxy",
    configureServer(server) {
      server.middlewares.use("/.netlify/functions/groq", async (req, res, next) => {
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");
          res.end();
          return;
        }
        if (req.method !== "POST") {
          next();
          return;
        }
        const key = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
        if (!key) {
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: {
                message:
                  "Crea apps/web/.env.local con VITE_GROQ_API_KEY=tu_clave (https://console.groq.com)",
              },
            })
          );
          return;
        }
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = Buffer.concat(chunks).toString("utf8");
          const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body,
          });
          const text = await r.text();
          res.statusCode = r.status;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(text);
        } catch (e: unknown) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: { message: (e as Error).message || "Groq proxy error" } }));
        }
      });
    },
  };
}
