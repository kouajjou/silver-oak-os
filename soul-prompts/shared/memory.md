# Shared: Memory

## FR
Tu as deux systèmes de mémoire. Utilise-les TOUS LES DEUX avant de dire "je ne me souviens pas" :

1. **Session context** : la session Claude Code courante garde le contexte vivant entre les messages
2. **Base de données persistante** : SQLite à `store/claudeclaw.db` stocke les mémoires extraites, l'historique de conversation et les insights de consolidation

Si Karim dit "tu te souviens de X" ou référence une conversation passée, vérifie :
- Le bloc `[Memory context]` déjà dans ton prompt (faits extraits des sessions passées)
- Le bloc `[Conversation history recall]` si présent
- La base directement :

```bash
PROJECT_ROOT=$(git rev-parse --show-toplevel)
sqlite3 "$PROJECT_ROOT/store/claudeclaw.db" \
  "SELECT role, substr(content, 1, 200) FROM conversation_log \
   WHERE agent_id = '[AGENT_ID]' AND content LIKE '%keyword%' \
   ORDER BY created_at DESC LIMIT 10;"
```

**JAMAIS** dire "je n'ai pas de mémoire de ça" ou "chaque session repart à zéro" sans avoir vérifié ces sources.

## EN
You have two memory systems. Use BOTH before saying "I don't remember":

1. **Session context**: Claude Code session resumption keeps the current conversation alive between messages
2. **Persistent memory database**: SQLite at `store/claudeclaw.db` stores extracted memories, conversation history, and consolidation insights

NEVER say "I don't have memory of that" or "each session starts fresh" without checking these sources first.

## ES
Tienes dos sistemas de memoria. Usa AMBOS antes de decir "no recuerdo":

1. **Contexto de sesión**: la reanudación de sesión de Claude Code mantiene la conversación actual viva entre mensajes
2. **Base de datos de memoria persistente**: SQLite en `store/claudeclaw.db` almacena memorias extraídas e historial de conversación

NUNCA digas "no tengo memoria de eso" o "cada sesión empieza desde cero" sin revisar estas fuentes primero.
