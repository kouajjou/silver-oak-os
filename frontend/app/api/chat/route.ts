import { NextRequest, NextResponse } from 'next/server';

interface HistoryItem {
  role: 'user' | 'agent';
  content: string;
}

interface ChatRequest {
  agentId: string;
  message: string;
  history?: HistoryItem[];
}

// MVP hardcoded responses per agent — replace with real backend when ready
const MVP_RESPONSES: Record<string, string[]> = {
  alex: [
    "J'ai bien noté votre demande. Je vais coordonner les équipes pour y répondre dans les plus brefs délais.",
    "Excellent point. Voici ce que je recommande : nous devrions commencer par analyser les priorités, puis allouer les ressources en conséquence.",
    "Je prends en charge ce sujet. Vous aurez un retour avant la fin de journée.",
    "D'accord. Je synchronise les directeurs sur ce point et vous envoie un récapitulatif sous 30 minutes.",
  ],
  sara: [
    "Message reçu. Je prépare un plan de communication adapté à ce contexte.",
    "Votre message va être optimisé pour le canal approprié. Souhaitez-vous un ton formel ou décontracté ?",
    "J'ai rédigé 3 variantes de ce message. Laquelle préférez-vous ? Formelle, directe ou narrative ?",
    "Communication programmée. Je supervise les retours et vous informe des réactions.",
  ],
  leo: [
    "Super idée de contenu ! Je vais développer ça en 5 formats : article, thread, vidéo courte, newsletter et post LinkedIn.",
    "J'analyse les tendances du moment sur ce sujet. Le potentiel viral est fort — je prépare le calendrier.",
    "Voici mon concept : commencer par un hook fort, développer avec 3 points clés, finir avec un CTA percutant.",
    "Le contenu est en cours de production. ETA : 2 heures pour le premier draft.",
  ],
  marco: [
    "Process identifié. Je vais cartographier les étapes, identifier les goulots d'étranglement et proposer une optimisation.",
    "J'ai analysé le workflow. 3 améliorations immédiates sont possibles sans restructuration majeure.",
    "Opération planifiée. Voici le plan d'exécution en 5 étapes avec les responsabilités clairement définies.",
    "Automatisation possible sur 2 des 4 étapes identifiées. Économie estimée : 3h/semaine.",
  ],
  nina: [
    "Recherche lancée. Je consolide les données de 12 sources vérifiées sur ce sujet.",
    "Voici les 5 points clés issus de mon analyse : les données convergent vers une tendance claire.",
    "J'ai trouvé 3 études récentes très pertinentes. Je vous prépare une synthèse avec les insights actionnables.",
    "Analyse concurrentielle terminée. Vos principaux concurrents ont ces forces et ces faiblesses...",
  ],
  maestro: [
    "Architecture analysée. Voici le diagnostic technique et les actions prioritaires.",
    "Code review complétée. 3 points d'attention identifiés, aucun critique. Corrections applicables immédiatement.",
    "Infrastructure stable. Latence p95 : 180ms. Pas d'anomalie détectée. Budget CPU : 42%.",
    "Pipeline de déploiement prêt. Tests passés : 362/362. Voulez-vous lancer le merge ?",
  ],
};

const DEFAULT_RESPONSES = [
  "Je comprends votre demande. Je travaille dessus.",
  "Bien reçu. Je reviens vers vous rapidement.",
  "Noted. Je traite votre requête.",
];

function getRandomResponse(agentId: string): string {
  const responses = MVP_RESPONSES[agentId] ?? DEFAULT_RESPONSES;
  return responses[Math.floor(Math.random() * responses.length)];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ChatRequest;
    const { agentId, message } = body;

    if (!agentId || !message?.trim()) {
      return NextResponse.json({ error: 'agentId and message are required' }, { status: 400 });
    }

    // Try to proxy to Silver Oak OS backend on port 3000
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3000';
    try {
      const upstream = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });

      if (upstream.ok) {
        const data = await upstream.json() as { reply?: string };
        return NextResponse.json({ reply: data.reply ?? getRandomResponse(agentId) });
      }
    } catch {
      // Backend unavailable — fall through to MVP mode
    }

    // MVP mode: hardcoded intelligent responses per agent
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 800)); // natural delay
    const reply = getRandomResponse(agentId);
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
