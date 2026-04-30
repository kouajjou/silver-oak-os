/**
 * gap-010 Phase 2: Mistral adapter (OpenAI-compatible)
 * MISTRAL_API_KEY may be absent from .env
 */
const PRICING = {
    'mistral-small-latest': { input: 0.20, output: 0.60 },
    'mistral-medium-latest': { input: 0.60, output: 1.80 },
    'mistral-large-latest': { input: 2.00, output: 6.00 },
    'codestral-latest': { input: 0.20, output: 0.60 },
};
export const mistralAdapter = {
    provider: 'mistral',
    available: !!process.env['MISTRAL_API_KEY'],
    async call(request) {
        const start = Date.now();
        const apiKey = process.env['MISTRAL_API_KEY'];
        if (!apiKey)
            throw new Error('MISTRAL_API_KEY missing in .env');
        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: request.model || 'mistral-small-latest',
                max_tokens: request.max_tokens ?? 1024,
                temperature: request.temperature ?? 0.7,
                messages: request.messages,
            }),
        });
        const data = (await res.json());
        if (!res.ok || data.error) {
            throw new Error(`Mistral API error: ${data.error?.message ?? res.status}`);
        }
        const tokens_in = data.usage.prompt_tokens;
        const tokens_out = data.usage.completion_tokens;
        const pricing = PRICING[request.model] ?? PRICING['mistral-small-latest'];
        const cost_usd = (tokens_in * pricing.input + tokens_out * pricing.output) / 1_000_000;
        return {
            provider: 'mistral',
            model: request.model,
            content: data.choices[0]?.message.content ?? '',
            tokens_in,
            tokens_out,
            cost_usd,
            latency_ms: Date.now() - start,
        };
    },
};
//# sourceMappingURL=mistral.js.map