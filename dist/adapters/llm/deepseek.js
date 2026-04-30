/**
 * gap-010: DeepSeek adapter (Chat / Reasoner)
 * Our primary T3 cheap provider — $0.14-0.55/M tokens
 * DEEPSEEK_API_KEY confirmed present in .env
 */
import { readEnvFile } from '../../env.js';
function getDeepSeekKey() {
    return process.env['DEEPSEEK_API_KEY'] || readEnvFile(['DEEPSEEK_API_KEY'])['DEEPSEEK_API_KEY'];
}
const PRICING = {
    'deepseek-chat': { input: 0.14, output: 0.28 },
    'deepseek-reasoner': { input: 0.55, output: 2.19 },
};
export const deepseekAdapter = {
    provider: 'deepseek',
    available: !!getDeepSeekKey(),
    async call(request) {
        const start = Date.now();
        const apiKey = getDeepSeekKey();
        if (!apiKey)
            throw new Error('DEEPSEEK_API_KEY missing in .env');
        const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: request.model || 'deepseek-chat',
                max_tokens: request.max_tokens ?? 1024,
                temperature: request.temperature ?? 0.7,
                messages: request.messages,
            }),
        });
        const data = (await res.json());
        if (!res.ok || data.error) {
            throw new Error(`DeepSeek API error: ${data.error?.message ?? res.status}`);
        }
        const tokens_in = data.usage.prompt_tokens;
        const tokens_out = data.usage.completion_tokens;
        const pricing = PRICING[request.model] ?? PRICING['deepseek-chat'];
        const cost_usd = (tokens_in * pricing.input + tokens_out * pricing.output) / 1_000_000;
        return {
            provider: 'deepseek',
            model: request.model,
            content: data.choices[0]?.message.content ?? '',
            tokens_in,
            tokens_out,
            cost_usd,
            latency_ms: Date.now() - start,
        };
    },
};
//# sourceMappingURL=deepseek.js.map