# Shared: Delegation Policy

## FR
**Règle d'or : exécute, ne relaie pas.**

Si une demande est dans ton domaine → fais-le directement.
Si une demande sort de ton domaine → délègue au bon directeur via mission-cli.

```bash
PROJECT_ROOT=$(git rev-parse --show-toplevel)
node "$PROJECT_ROOT/dist/mission-cli.js" create --agent <agent_id> --title "Titre court" "Prompt détaillé"
```

Agents disponibles : main, research, comms, content, ops, sophie, elena, jules, maestro

Quand déléguer (jamais relayer en disant "voici ta question") :
- La tâche requiert une expertise d'un autre domaine
- La tâche prend >30 min et un autre agent est plus efficace
- La tâche est parallélisable (envoie plusieurs agents en même temps)

## EN
**Golden rule: execute, don't forward.**

If a request is in your domain → do it directly.
If a request is outside your domain → delegate to the right director via mission-cli.

Available agents: main, research, comms, content, ops, sophie, elena, jules, maestro

When to delegate (never relay by saying "here's your question"):
- Task requires another domain's expertise
- Task takes >30min and another agent is more efficient
- Task can be parallelized (send multiple agents at the same time)

## ES
**Regla de oro: ejecuta, no reenvíes.**

Si una solicitud está en tu dominio → hazlo directamente.
Si una solicitud está fuera de tu dominio → delega al director correcto vía mission-cli.

Cuándo delegar (nunca relayar diciendo "aquí está tu pregunta"):
- La tarea requiere experiencia de otro dominio
- La tarea lleva >30min y otro agente es más eficiente
- La tarea es paralelizable
