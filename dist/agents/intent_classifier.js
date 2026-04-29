/**
 * Intent Classifier - Sprint 2 Pipeline V1 + Timeout Optimization
 * Detects if a message is a simple question or a technical task.
 *
 * V2 optimization (2026-04-29):
 * - Regex fast-path for obvious simple greetings (skip LLM entirely)
 * - 5s timeout wrapper with null fallback (was blocking for ~24s)
 * - Message hash cache (TTL 5min) to avoid repeated SDK calls
 *
 * archived: was using callLLM DeepSeek API (PAYANT zero-anthropic Phase F)
 * archived: was using claude-haiku-4-5 via SDK query() without timeout — 24s latency
 */
import { query } from '@anthropic-ai/claude-agent-sdk';
// ── Regex fast-path: detect obvious simple questions without LLM ──────────
const SIMPLE_QUESTION_PATTERNS = [
    /^(bonjour|bonsoir|salut|hello|hi|hey|coucou)[.!?]?\s*$/i,
    /^(comment\s+(tu\s+)?vas|how\s+are\s+you)[.!?]?\s*$/i,
    /^(merci|thanks|ok|d'accord|parfait|super|génial|cool)[.!?]?\s*$/i,
    /^(oui|non|yes|no|peut-être|maybe)[.!?]?\s*$/i,
    /^présente-toi/i,
    /^(qui\s+es-tu|who\s+are\s+you|what\s+are\s+you)[.!?]?\s*$/i,
];
const TECHNICAL_TASK_PATTERNS = [
    /\b(déploie|deploy|refactor|corrige|fix|debug|migre|migrate|installe|install)\b/i,
    /\b(pr|pull\s+request|commit|push|branch|merge)\b/i,
    /\b(bug|erreur|error|crash|broken|failed)\b/i,
    /\b(code|script|function|class|module|api|endpoint)\b/i,
    /\b(pm2|docker|nginx|redis|supabase|database|db)\b/i,
];
function regexClassify(message) {
    const trimmed = message.trim();
    // Short greetings / simple conversational
    for (const pattern of SIMPLE_QUESTION_PATTERNS) {
        if (pattern.test(trimmed)) {
            return { intent: 'simple_question', confidence: 0.95, reasoning: 'regex: greeting pattern', cost_usd: 0 };
        }
    }
    // Clear technical task
    let technicalMatches = 0;
    for (const pattern of TECHNICAL_TASK_PATTERNS) {
        if (pattern.test(trimmed))
            technicalMatches++;
    }
    if (technicalMatches >= 2) {
        return { intent: 'technical_task', confidence: 0.85, reasoning: 'regex: multiple technical keywords', cost_usd: 0 };
    }
    // Short message (< 30 chars) with no technical keywords → simple question
    if (trimmed.length < 30 && technicalMatches === 0) {
        return { intent: 'simple_question', confidence: 0.75, reasoning: 'regex: short non-technical message', cost_usd: 0 };
    }
    return null; // needs LLM
}
const intentCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
function getCached(message) {
    const key = message.slice(0, 200); // use first 200 chars as key
    const entry = intentCache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
        return entry.result;
    }
    if (entry)
        intentCache.delete(key); // expired
    return null;
}
function setCached(message, result) {
    const key = message.slice(0, 200);
    intentCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    // Trim cache to max 100 entries (FIFO)
    if (intentCache.size > 100) {
        const firstKey = intentCache.keys().next().value;
        if (firstKey)
            intentCache.delete(firstKey);
    }
}
// ── LLM fallback via Claude Code SDK (with 5s timeout) ───────────────────
const SYSTEM_PROMPT = `You are an intent classifier for Silver Oak OS.
Classify the user message into exactly one of:
- "simple_question": general question, conversation, information request, status check
- "technical_task": code change, bug fix, deployment, refactor, system action, file modification

Respond ONLY with valid JSON, no markdown:
{"intent": "simple_question", "confidence": 0.95, "reasoning": "brief reason"}`;
async function callProMaxHaiku(prompt) {
    let resultText = '';
    for await (const event of query({
        prompt,
        options: {
            model: 'claude-haiku-4-5',
            allowDangerouslySkipPermissions: true,
            maxTurns: 1,
            settingSources: ['user'],
        },
    })) {
        const ev = event;
        if (ev['type'] === 'result') {
            resultText = ev['result'] ?? '';
        }
    }
    return resultText;
}
async function classifyIntentWithTimeout(message, timeoutMs = 5000) {
    let timeoutHandle = null;
    const timeoutPromise = new Promise((resolve) => {
        timeoutHandle = setTimeout(() => resolve(null), timeoutMs);
    });
    const llmPromise = (async () => {
        try {
            const fullPrompt = SYSTEM_PROMPT + '\n\nUser message to classify: ' + message;
            const content = await callProMaxHaiku(fullPrompt);
            const clean = content.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(clean);
            const intent = (parsed.intent === 'simple_question' || parsed.intent === 'technical_task')
                ? parsed.intent
                : 'unknown';
            return {
                intent: intent,
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
                reasoning: parsed.reasoning ?? '',
                cost_usd: 0,
            };
        }
        catch {
            return null;
        }
    })();
    const result = await Promise.race([llmPromise, timeoutPromise]);
    if (timeoutHandle)
        clearTimeout(timeoutHandle);
    return result;
}
// ── Main export ───────────────────────────────────────────────────────────
export async function classifyIntent(message) {
    // 1. Check cache first
    const cached = getCached(message);
    if (cached) {
        return { ...cached, reasoning: cached.reasoning + ' [cached]' };
    }
    // 2. Regex fast-path (instant, no LLM)
    const regexResult = regexClassify(message);
    if (regexResult) {
        setCached(message, regexResult);
        return regexResult;
    }
    // 3. LLM with 5s timeout — fallback to unknown if timeout/error
    const llmResult = await classifyIntentWithTimeout(message, 5000);
    if (llmResult) {
        setCached(message, llmResult);
        return llmResult;
    }
    // 4. Timeout fallback — treat as simple_question (safer default for conversational messages)
    const fallback = {
        intent: 'simple_question',
        confidence: 0.5,
        reasoning: 'classifier timeout — default to simple_question',
        cost_usd: 0,
    };
    setCached(message, fallback);
    return fallback;
}
export default classifyIntent;
//# sourceMappingURL=intent_classifier.js.map