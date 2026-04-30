/**
 * gap-010 Phase 2: MiniMax adapter (OpenAI-compatible, requires GroupId)
 * MINIMAX_API_KEY present (LEN=126), MINIMAX_GROUP_ID may be absent
 */
const PRICING = {
    'abab6.5g-chat': { input: 0.20, output: 0.60 },
    'abab6.5-chat': { input: 1.00, output: 3.00 },
    'abab6.5s-chat': { input: 0.10, output: 0.10 },
};
export const minimaxAdapter = {
    provider: 'minimax',
    available: !!(process.env['MINIMAX_API_KEY'] && process.env['MINIMAX_GROUP_ID']),
    async call(request) {
        const start = Date.now();
        const apiKey = process.env['MINIMAX_API_KEY'];
        const groupId = process.env['MINIMAX_GROUP_ID'];
        if (!apiKey)
            throw new Error('MINIMAX_API_KEY missing in .env');
        if (!groupId)
            throw new Error('MINIMAX_GROUP_ID missing in .env — required for MiniMax API');
        const url = `https://api.minimax.chat/v1/chat/completions?GroupId=${groupId}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: request.model || 'abab6.5g-chat',
                max_tokens: request.max_tokens ?? 1024,
                temperature: request.temperature ?? 0.7,
                messages: request.messages,
            }),
        });
        const data = (await res.json());
        if (!res.ok || data.error) {
            throw new Error(`MiniMax API error: ${data.error?.message ?? res.status}`);
        }
        const tokens_in = data.usage?.prompt_tokens ?? 0;
        const tokens_out = data.usage?.completion_tokens ?? 0;
        const pricing = PRICING[request.model] ?? PRICING['abab6.5g-chat'];
        const cost_usd = (tokens_in * pricing.input + tokens_out * pricing.output) / 1_000_000;
        return {
            provider: 'minimax',
            model: request.model,
            content: data.choices[0]?.message.content ?? '',
            tokens_in,
            tokens_out,
            cost_usd,
            latency_ms: Date.now() - start,
        };
    },
};
//# sourceMappingURL=minimax.js.map