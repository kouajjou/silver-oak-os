/**
 * gap-010 Phase 2: xAI Grok adapter (OpenAI-compatible)
 * XAI_API_KEY present in .env — credit status unknown
 */
const PRICING = {
    "grok-2-mini": { input: 0.30, output: 0.50 },
    "grok-2": { input: 5.00, output: 15.00 },
    "grok-3-mini": { input: 0.30, output: 0.50 },
    "grok-3": { input: 5.00, output: 15.00 },
    "grok-4": { input: 5.00, output: 15.00 },
};
export const xaiAdapter = {
    provider: "xai",
    available: !!process.env["XAI_API_KEY"],
    async call(request) {
        const start = Date.now();
        const apiKey = process.env["XAI_API_KEY"];
        if (!apiKey)
            throw new Error("XAI_API_KEY missing in .env");
        const res = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: request.model || "grok-4",
                max_tokens: request.max_tokens ?? 1024,
                temperature: request.temperature ?? 0.7,
                messages: request.messages,
            }),
        });
        const data = (await res.json());
        if (!res.ok || data.error) {
            const status = res.status;
            const msg = data.error?.message ?? "";
            const code = data.error?.code ?? "";
            // Rate limit (429) or credit exhausted
            if (status === 429 || code.includes("exhausted") || msg.includes("credits") || msg.includes("rate limit")) {
                throw new Error(`xAI Grok API rate limited: ${code || msg || status}`);
            }
            throw new Error(`xAI Grok API error: ${msg || status}`);
        }
        const tokens_in = data.usage.prompt_tokens;
        const tokens_out = data.usage.completion_tokens;
        const pricing = PRICING[request.model] ?? PRICING["grok-4"];
        const cost_usd = (tokens_in * pricing.input + tokens_out * pricing.output) / 1_000_000;
        return {
            provider: "xai",
            model: request.model,
            content: data.choices[0]?.message.content ?? "",
            tokens_in,
            tokens_out,
            cost_usd,
            latency_ms: Date.now() - start,
        };
    },
};
//# sourceMappingURL=xai.js.map