# Maestro Dispatch Template - SOP V26.1

> Template OBLIGATOIRE pour CHAQUE dispatch worker.
> Activate SuperPowers selon type tache (R41-R50 SOP V26).

## Template structure

Un prompt valide Maestro respecte cette structure :

```
[NOM TASK] - [Effort] - [Cout estime]

OBJECTIF : [1 phrase claire]

SUPERPOWERS A ACTIVER : [selon type, voir matrice ci-dessous]

ACTIONS :

1. Branche dediee + auto-rollback (gap-018) OBLIGATOIRE
2. [Lecture physique fichiers AVANT modif - R52]
3. [Modifications - 1 ou 2 fichiers max]
4. TS compile - npx tsc --noEmit OBLIGATOIRE
5. Tests regression 4 criteres OBLIGATOIRES
6. Si vert -> commit + push branche (PAS MERGE AUTO)
7. Si rouge -> rollback_to_saved_state
8. Telegram avec BON token .env Factory
9. STOP NET apres TASK_DONE

REGLES STRICTES PHD :
- [Liste 3-5 regles applicables]

GO.
```

## Matrice SuperPowers par type tache

| Type tache | SuperPowers OBLIGATOIRES |
|------------|-------------------------|
| Architecture, plan | /ultrathink |
| Multi-etapes complexe | /riper |
| Diagnostic bug | /fix-bug |
| Touche secrets/auth | /security-audit |
| React/Next/UI | @frontend-ui |
| TypeScript backend | @api-backend |
| Postgres/RLS/Supabase | @db-supabase |
| OWASP/secrets | @security-review |

## Tests regression 4 criteres OBLIGATOIRES

```bash
# A: gap-001 API health
TOKEN="e8e6c27f94d32b60875c58715331bb93fa173d88af7d9bd2"
curl -s 'https://os.silveroak.one/api/chat/sync' -X POST -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" -d '{"agentId":"alex","message":"hello"}' | head -c 200

# B: gap-004 Opus banni
grep USINE_OPUS_ALLOWED /app/silver-oak-os/src/bot.ts | head -3

# C: Item 1 max_tokens
grep "max_tokens" /app/silver-oak-os/src/dashboard.ts | head -3

# D: voiceRouter desactive
curl -s -o /dev/null -w "HTTP=%{http_code}\n" http://127.0.0.1:3000/api/voice/agents
```

## Telegram template (bon token)

```bash
BOT_TOKEN=$(grep "^TELEGRAM_BOT_TOKEN" /app/silver-oak-os/.env | cut -d= -f2 | tr -d "'\"")
TG="[Emoji] [Task] CABLE : [resume 5 lignes max]
Tests regression OK.
Branche [name] pushee. Karim valide push merge main."
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" --data-urlencode "chat_id=5566541774" --data-urlencode "text=${TG}" > /dev/null
```

## Boundaries (R76-R78)

R76 : Cowork ZERO dispatch direct. BIST seule autorisee.
R77 : Reconnaitre violations honnetement (Xeme violation).
R78 : Cuisinier 1700eur/h n epluche pas carottes (delegation strict).

## Worker priorite par type

| Type tache | Worker recommande | LLM | Cost |
|------------|-------------------|-----|------|
| Architecture, plan | claude-code | Sonnet T1 | $0 |
| Backend code | claude-backend | Sonnet T1 | $0 |
| Frontend/UI | claude-frontend | Sonnet T1 | $0 |
| Reasoning hard | deepseek-r1-1/2 | DeepSeek-R1 | $0.07-0.11 |
| Audit + bash | aider-deepseek-1/3 | DeepSeek-V3 | $0.14-0.28 |
| Cross-LLM judge | audit-gemini-1/2/3 | Gemini Pro | $1.25-5 |
| GPT-4o | BANNED ($8.70 incident) | - | EVITER |
| Grok | xAI rate limited | - | BANNED |
| Aider-gemini | BANNED | - | BANNED |

## Anti-hallucination (R51-R60)

- Lecture physique fichier avant edit (R52)
- ls -la avant write_file (R53)
- grep avant assertions (R54)
- DoD criteres binaires (R55)
- Sentinelle commit hash avant/apres (R60)

## R79 ABSOLUE — Anti-auto-merge

JAMAIS merge main même branche worker. Workflow :
1. Push branche feature/fix
2. Telegram "Karim valide push merge main"
3. STOP TASK_DONE
4. Worker SÉPARÉ pour merge après validation explicite Karim

Violation = conséquences : reconnaissance log + ajustement dispatch.
