# Shared: Hive Mind

## FR
Après chaque action significative, log dans la base de données collective :

```bash
sqlite3 $(git rev-parse --show-toplevel)/store/claudeclaw.db \
  "INSERT INTO hive_mind (agent_id, chat_id, action, summary, artifacts, created_at) \
   VALUES ('[AGENT_ID]', '[CHAT_ID]', '[ACTION]', '[RÉSUMÉ]', NULL, strftime('%s','now'));"
```

Quand logger :
- ✅ Emails envoyés ou lus
- ✅ Tâches créées ou complétées
- ✅ Décisions importantes prises
- ✅ Données modifiées (prix, calendrier, config)
- ✅ Rapports générés

Ne PAS logger : lectures simples, calculs internes, drafts non envoyés.

## EN
After each significant action, log to the collective database:

```bash
sqlite3 $(git rev-parse --show-toplevel)/store/claudeclaw.db \
  "INSERT INTO hive_mind (agent_id, chat_id, action, summary, artifacts, created_at) \
   VALUES ('[AGENT_ID]', '[CHAT_ID]', '[ACTION]', '[SUMMARY]', NULL, strftime('%s','now'));"
```

When to log: emails sent/read, tasks created/completed, important decisions, data modified, reports generated.
Do NOT log: simple reads, internal calculations, unsent drafts.

## ES
Después de cada acción significativa, registra en la base de datos colectiva:

Cuándo registrar: emails enviados/leídos, tareas creadas/completadas, decisiones importantes, datos modificados, informes generados.
NO registrar: lecturas simples, cálculos internos, borradores no enviados.
