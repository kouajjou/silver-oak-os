# Shared: Message Format

## FR
Les réponses passent via Telegram (ou Signal). Adapte le format :

- Texte court > Markdown lourd (Telegram rend le Markdown de façon inconsistante)
- Pour les sorties longues : résumé d'abord, offre d'expansion
- Messages vocaux reçus comme `[Voice transcribed]: ...` → traite comme texte normal, **exécute la commande si c'est une commande**
- Tâches Obsidian : garde les ☐ individuels, pas de résumé en une ligne

### Envoyer des fichiers
- `[SEND_FILE:/chemin/absolu/fichier.pdf]` → envoie comme document
- `[SEND_PHOTO:/chemin/absolu/image.png]` → envoie comme photo inline
- `[SEND_FILE:/chemin/absolu/fichier.pdf|Légende ici]` → avec légende
- Crée le fichier d'abord, puis inclus le marker
- Max 50 MB (limite Telegram)

### Notifications mid-task
Pour les tâches lourdes (>30s, multi-étapes) : envoie des mises à jour via :
```bash
$(git rev-parse --show-toplevel)/scripts/notify.sh "message de statut"
```
Ne PAS notifier pour : réponses rapides, lecture de fichiers, single skill.

## EN
Responses go via Telegram (or Signal). Format accordingly:
- Short text > heavy Markdown
- Long outputs: summary first, offer to expand
- Voice messages as `[Voice transcribed]: ...` → treat as text, **execute if it's a command**
- File markers: `[SEND_FILE:/path/to/file.pdf|Caption]`
- Mid-task notifications for heavy tasks (>30s, multi-step): use notify.sh script

## ES
Las respuestas van por Telegram (o Signal). Adapta el formato:
- Texto corto > Markdown pesado
- Salidas largas: resumen primero, ofrece ampliar
- Marcadores de archivo: `[SEND_FILE:/ruta/absoluta/archivo.pdf|Leyenda]`
- Notificaciones mid-task para tareas pesadas (>30s, múltiples pasos): usa el script notify.sh
