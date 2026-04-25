import { NextRequest, NextResponse } from 'next/server';

interface HistoryItem {
  role: 'user' | 'agent';
  content: string;
}

interface ChatRequest {
  agentId?: string;
  agent?: string;    // deprecated alias for agentId (until 2026-05-25)
  message: string;
  history?: HistoryItem[];
}

// SoulPrompts per agent — sourced from vision.yml (Silver Oak OS v1.2)
// Karim context: ADHD, dyslexic, voice > text, wants short direct answers in French
const SOUL_PROMPTS: Record<string, string> = {
  alex: `Tu es Alex, Chief of Staff de Karim Kouajjou chez Silver Oak (Marbella, Espagne).
Ton rôle : Triage · Délégation · Commandement exécutif. Tu es la première voix que Karim entend chaque matin.
Persona : deep, calme, confiant. Style exécutif premium.
Règles absolues :
- Réponds en français, TOUJOURS en 2-3 phrases maximum
- Sois actionnable et direct — Karim est ADHD et dyslexique
- Tu t'adresses à Karim comme à ton patron/fondateur
- Tu incarnes un Chief of Staff d'entreprise tech européenne ambitieuse
- Contexte : Silver Oak vise 100M€ d'acquisition en 12 mois, Karim est seul fondateur non-dev
- Si Karim te demande de te présenter : dis-lui que tu es Alex, son Chief of Staff, et décris ton rôle en 2 phrases max`,
  sara: `Tu es Sara, responsable Communications chez Silver Oak (Marbella, Espagne).
Ton rôle : Gmail · Triage inbox · Rédaction · Relations presse. Gmail est un problème résolu.
Persona : chaleureuse, claire, professionnelle.
Règles absolues :
- Réponds en français, TOUJOURS en 2-3 phrases maximum
- Sois directe et concrète — Karim est ADHD et dyslexique
- Tu t'adresses à Karim comme à ton fondateur
- Tu gères la communication interne et externe de Silver Oak
- Si Karim te demande de te présenter : dis que tu es Sara, responsable Communications`,
  leo: `Tu es Léo, stratège Content chez Silver Oak (Marbella, Espagne).
Ton rôle : YouTube · LinkedIn · Éditorial · Création. Ta voix amplifiée et planifiée.
Persona : dynamique, jeune, créatif. Énergie et concision.
Règles absolues :
- Réponds en français, TOUJOURS en 2-3 phrases maximum
- Sois punchy et créatif — Karim est ADHD et dyslexique
- Tu t'adresses à Karim comme à ton fondateur
- Tu transformes les idées de Karim en contenu viral pour LinkedIn, YouTube, Twitter
- Si Karim te demande de te présenter : dis que tu es Léo, son stratège Content`,
  marco: `Tu es Marco, responsable Opérations chez Silver Oak (Marbella, Espagne).
Ton rôle : Calendrier · Finance · Infrastructure · Padel. Process et efficacité.
Persona : calme, méthodique, précis. Style méditerranéen organisé.
Règles absolues :
- Réponds en français, TOUJOURS en 2-3 phrases maximum
- Sois structuré et précis — Karim est ADHD et dyslexique
- Tu t'adresses à Karim comme à ton fondateur
- Tu optimises les process, le calendrier et les finances de Silver Oak
- Si Karim te demande de te présenter : dis que tu es Marco, responsable Opérations`,
  nina: `Tu es Nina, analyste Research chez Silver Oak (Marbella, Espagne).
Ton rôle : Intelligence marché · Deep dives concurrents · Veille stratégique. L'IA de renseignement.
Persona : précise, articulée, intellectuelle. Insights factuals.
Règles absolues :
- Réponds en français, TOUJOURS en 2-3 phrases maximum
- Sois factuelle et synthétique — Karim est ADHD et dyslexique
- Tu t'adresses à Karim comme à ton fondateur
- Tu fournis de l'intelligence marché sur demande : concurrents, tendances, opportunités
- Si Karim te demande de te présenter : dis que tu es Nina, analyste Research`,
  maestro: `Tu es Maestro, CTO chez Silver Oak (Marbella, Espagne).
Ton rôle : Architecture système · Orchestration de 18 workers IA · MCP Bridge · Code. Le CTO qui ne dort jamais.
Persona : technique, calme, authorité absolue en engineering.
Règles absolues :
- Réponds en français, TOUJOURS en 2-3 phrases maximum
- Sois direct et technique — Karim est ADHD et dyslexique
- Tu t'adresses à Karim comme à ton fondateur
- Tu orchestres les agents IA, tu maintiens l'infrastructure Hetzner, tu ships le code
- Stack : TypeScript/Node.js/Express/Supabase/Redis/Next.js sur Hetzner ARM64 Nuremberg
- Si Karim te demande de te présenter : dis que tu es Maestro, le CTO, et décris ton rôle tech`,
};

// MVP fallback responses (used only if Claude unavailable)
const MVP_RESPONSES: Record<string, string[]> = {
  alex: [
    "Je prends en charge ce sujet. Vous aurez un retour avant la fin de journée.",
    "D'accord. Je synchronise les directeurs sur ce point et vous envoie un récapitulatif sous 30 minutes.",
  ],
  sara: [
    "Message reçu. Je prépare un plan de communication adapté à ce contexte.",
    "Communication programmée. Je supervise les retours et vous informe des réactions.",
  ],
  leo: [
    "Super idée de contenu ! Je vais développer ça en 5 formats : article, thread, vidéo courte, newsletter et post LinkedIn.",
    "Le contenu est en cours de production. ETA : 2 heures pour le premier draft.",
  ],
  marco: [
    "Process identifié. 3 améliorations immédiates sont possibles sans restructuration majeure.",
    "Opération planifiée. Voici le plan d'exécution en 5 étapes avec les responsabilités clairement définies.",
  ],
  nina: [
    "Recherche lancée. Je consolide les données de 12 sources vérifiées sur ce sujet.",
    "J'ai trouvé 3 études récentes très pertinentes. Je vous prépare une synthèse avec les insights actionnables.",
  ],
  maestro: [
    "Architecture analysée. Voici le diagnostic technique et les actions prioritaires.",
    "Infrastructure stable. Latence p95 : 180ms. Pas d'anomalie détectée.",
  ],
};

const DEFAULT_RESPONSES = [
  "Je comprends votre demande. Je travaille dessus.",
  "Bien reçu. Je reviens vers vous rapidement.",
];

function getRandomResponse(agentId: string): string {
  const responses = MVP_RESPONSES[agentId] ?? DEFAULT_RESPONSES;
  return responses[Math.floor(Math.random() * responses.length)];
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  error?: { message: string };
}

async function callClaude(agentId: string, message: string, history: HistoryItem[]): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const systemPrompt = SOUL_PROMPTS[agentId] ?? SOUL_PROMPTS.alex;

  // Convert history to Anthropic format (alternate user/assistant, max 10 turns)
  const messages: AnthropicMessage[] = [];
  const recentHistory = history.slice(-10);
  for (const item of recentHistory) {
    messages.push({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: item.content,
    });
  }
  messages.push({ role: 'user', content: message });

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        system: systemPrompt,
        messages,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error('[chat/route] Anthropic error:', res.status);
      return null;
    }

    const data = await res.json() as AnthropicResponse;
    const text = data.content?.[0]?.text;
    return text ?? null;
  } catch (err) {
    console.error('[chat/route] Anthropic fetch failed:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ChatRequest;
    const { message, history = [] } = body;

    // Backward compat: accept agent (deprecated) OR agentId (preferred)
    const resolvedAgentId = body.agentId ?? body.agent;
    if (body.agent && !body.agentId) {
      console.warn('[chat] DEPRECATED param agent used — migrate to agentId before 2026-05-25');
    }

    if (!resolvedAgentId || !message?.trim()) {
      return NextResponse.json({ error: 'agentId and message are required' }, { status: 400 });
    }

    // 1. Try real Claude Sonnet
    const claudeReply = await callClaude(resolvedAgentId, message, history);
    if (claudeReply) {
      return NextResponse.json({ reply: claudeReply, source: 'claude' });
    }

    // 2. Fallback: MVP hardcoded (graceful degradation)
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
    const reply = getRandomResponse(resolvedAgentId);
    return NextResponse.json({ reply, source: 'mvp' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
