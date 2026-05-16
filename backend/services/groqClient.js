const https = require("https");

const GROQ_API_URL  = "api.groq.com";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const TIMEOUT_MS    = 30_000;

/**
 * Minimal Groq chat completion — no SDK dependency.
 * Returns the first choice's message content string.
 */
async function groqChat(messages, { model = DEFAULT_MODEL, temperature = 0.4, maxTokens = 1024 } = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const body = JSON.stringify({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: GROQ_API_URL,
        path:     "/openai/v1/chat/completions",
        method:   "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) return reject(new Error(parsed.error.message || "Groq API error"));
            const content = parsed?.choices?.[0]?.message?.content;
            if (!content) return reject(new Error("Empty Groq response"));
            resolve(content);
          } catch (e) {
            reject(new Error(`Groq response parse error: ${e.message}`));
          }
        });
      }
    );

    req.on("timeout", () => { req.destroy(); reject(new Error("Groq request timed out")); });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

module.exports = { groqChat };
