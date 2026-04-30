# Audit 5/8 — Diff backup vs prod alex_orchestrator.ts
**Date** : 2026-04-29  
**Fichier prod** : `/app/silver-oak-os/src/agents/alex_orchestrator.ts` (19 783 bytes, 541 lignes)

---

## Backups disponibles

| Fichier | Date | Taille |
|---------|------|--------|
| `alex_orchestrator.ts` | 2026-04-29 10:49 | 19 783 bytes ← **prod actuel** |
| `alex_orchestrator.ts.bak.20260429` | 2026-04-29 10:49 | 19 339 bytes |
| `alex_orchestrator.ts.bak.20260428_230149` | 2026-04-28 23:01 | 16 648 bytes |
| `alex_orchestrator.ts.bak2.20260428_220301` | 2026-04-28 22:03 | 16 648 bytes |
| `alex_orchestrator.ts.bak_pre_bug2` | 2026-04-28 16:21 | 16 563 bytes |

---

## Diff prod vs bak.20260429 (21 lignes de diff)

```diff
25d24
<   let assistantText = '';

31c30
<       maxTurns: 3,
---
>       maxTurns: 1,

39,48d37
<     if (ev['type'] === 'assistant') {
<       const msg = ev['message'] as Record<string, unknown> | null | undefined;
<       if (msg && Array.isArray(msg['content'])) {
<         for (const block of msg['content'] as Record<string, unknown>[]) {
<           if (block['type'] === 'text' && typeof block['text'] === 'string') {
<             assistantText += block['text'];
<           }
<         }
<       }
<     }

50c39
<   return resultText || assistantText;
---
>   return resultText;
```

---

## Analyse du diff

**Seules 2 modifications entre bak.20260429 et prod** :

### 1. maxTurns : 1 → 3
- **Bak** : `maxTurns: 1` — une seule passe, résultat immédiat
- **Prod** : `maxTurns: 3` — 3 tours agentic possibles
- **Impact** : prod permet aux agents d'utiliser des outils sur 3 tours (tool_use → tool_result → réponse finale). Amélioration fonctionnelle.

### 2. Capture `assistantText` ajoutée
- **Bak** : `return resultText` — retourne uniquement le champ `result` de l'event SDK
- **Prod** : `return resultText || assistantText` — fallback sur le texte brut des blocs `assistant` si `result` est vide
- **Impact** : meilleure robustesse — évite les retours vides si le SDK ne remplit pas `result`

---

## Verdict : régression ou amélioration ?

| Question | Réponse |
|----------|---------|
| Le bak utilise-t-il `delegateToAgent` ? | ❌ Non |
| Le bak utilise-t-il `dispatchToEmployee` (hardcoded) ? | ✅ Oui (ligne 119 + 399) |
| Régression du prod par rapport au bak ? | **NON** — prod est légèrement meilleur |
| Le bug `dispatchToEmployee` hardcodé existait-il dans le bak ? | ✅ **OUI** — c'est un bug structurel, pas une régression récente |

**Conclusion** : Le gap `delegateToAgent` absent est un **bug de conception original** (présent dans tous les backups), pas une régression introduite le 29 avril. Le prod actuel apporte juste `maxTurns: 3` et un fallback `assistantText` en plus.

---

## Note sur bak.20260428 (16 648 bytes vs 19 339/19 783)

Les backups du 28 avril sont ~3 100 bytes plus petits — la V3 (Phase 5B.3 `maestroHandle`) a été ajoutée le 29 avril. Le bug `dispatchToEmployee` hardcodé est présent dans TOUTES les versions.

---

## Statut : DONE 5/8 ✅
