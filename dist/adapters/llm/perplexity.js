/**
 * gap-010 Phase 2: Perplexity adapter (OpenAI-compatible, web-search enhanced)
 * PERPLEXITY_API_KEY confirmed present in .env (LEN=53)
 */
const PRICING = {
    'sonar': { input: 0.20, output: 0.20 },
    'sonar-pro': { input: 1.00, output: 1.00 },
    'sonar-reasoning': { input: 1.00, output: 5.00 },
    'sonar-deep-research': { input: 2.00, output: 8.00 },
};
export const perplexityAdapter = {
    provider: 'perplexity',
    available: !!process.env['PERPLEXITY_API_KEY'],
    async call(request) {
        const start = Date.now();
        const apiKey = process.env['PERPLEXITY_API_KEY'];
        if (!apiKey)
            throw new Error('PERPLEXITY_API_KEY missing in .env');
        const res = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: request.model || 'sonar',
                max_tokens: request.max_tokens ?? 1024,
                temperature: request.temperature ?? 0.7,
                messages: request.messages,
            }),
        });
        const data = (await res.json());
        if (!res.ok || data.error) {
            throw new Error(`Perplexity API error: ${data.error?.message ?? res.status}`);
        }
        const tokens_in = data.usage.prompt_tokens;
        const tokens_out = data.usage.completion_tokens;
        const pricing = PRICING[request.model] ?? PRICING['sonar'];
        const cost_usd = (tokens_in * pricing.input + tokens_out * pricing.output) / 1_000_000;
        return {
            provider: 'perplexity',
            model: request.model,
            content: data.choices[0]?.message.content ?? '',
            tokens_in,
            tokens_out,
            cost_usd,
            latency_ms: Date.now() - start,
        };
    },
};
//# sourceMappingURL=perplexity.js.map