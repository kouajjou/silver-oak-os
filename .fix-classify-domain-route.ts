function classifyDomainRoute(message: string): { intent: DomainIntent; agentId: string } | null {
  // PhD fix 2026-04-30: replaces first-match-wins with score-based selection.
  // Old bug: "Rédige un post LinkedIn" matched comms FIRST (rédige) before testing content (linkedin).
  // New: score each route by total keyword matches, return highest score.
  let bestRoute: { intent: DomainIntent; agentId: string; score: number } | null = null;

  for (const entry of DOMAIN_ROUTES) {
    let score = 0;
    for (const pattern of entry.patterns) {
      // Use global flag to count all matches (not just first)
      const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
      const matches = message.match(globalPattern);
      if (matches) score += matches.length;
    }
    if (score > 0 && (!bestRoute || score > bestRoute.score)) {
      bestRoute = { intent: entry.intent, agentId: entry.agentId, score };
    }
  }

  return bestRoute ? { intent: bestRoute.intent, agentId: bestRoute.agentId } : null;
}
