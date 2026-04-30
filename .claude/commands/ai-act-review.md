Analyse ce diff ou module pour les implications EU AI Act et RGPD.

Vérifie :
- Transparence Art.50 : les utilisateurs sont-ils informés qu'ils interagissent avec une IA ?
- Logging requis : toutes les décisions automatiques sont-elles loggées ?
- Risque haute-risque : le code touche-t-il à des décisions qui impactent des personnes ?
- Suppression données : la suppression RGPD est-elle complète (Supabase + Neo4j + Redis + embeddings) ?
- Secrets exposés : aucun secret hardcodé ?

Retourne :
- Risques identifiés par niveau P0/P1/P2
- Actions requises avant merge
- Urgence (bloquer merge ou avertissement)
