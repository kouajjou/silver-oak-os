# Mistral Local LLM — Specs RGPD-Native (Silver Oak OS)

**Status**: Specs (décision architecture requise)
**Objectif**: Traitement données sensibles EU sans API cloud
**Modèle cible**: Mistral Small 4 (quantized)

---

## Pourquoi un LLM Local ?

### Contrainte RGPD (Règlement Général sur la Protection des Données)

Certaines données traitées par Silver Oak OS ne doivent PAS sortir du territoire EU :
- Données personnelles clients (Art. 5 RGPD)
- Données financières sensibles (PCI-DSS adjacent)
- Correspondances confidentielles
- Données RH et contrats

**Problème actuel** : Claude API (Anthropic), DeepSeek, Gemini = servers US/Asia → transfert hors UE → non-conforme pour données sensibles.

**Solution** : Tier T0 "sensitive" → LLM local sur infra Hetzner EU (Nuremberg, Allemagne).

---

## Stack Proposée

### Modèle : Mistral Small 4

| Propriété | Valeur |
|-----------|--------|
| Paramètres | 22B |
| Quantization | Q4_K_M (4-bit) → ~13GB RAM |
| Performance ARM64 | ~8-12 tokens/s (Hetzner CAX41) |
| Licence | Apache 2.0 (commercial OK) |
| Langue | Multilingue (FR/ES/EN natif) |
| RGPD | 100% on-premise, zéro transfert cloud |

**Alternative** : Qwen2.5-7B-Instruct Q8 (~9GB, plus rapide, moins précis)

### Infrastructure

**Option A — Même serveur Factory (178.104.255.59)**
- RAM actuelle : 16GB (CAX31)
- Mistral Small 4 Q4 : 13GB → 3GB restants → INSUFFISANT
- Action requise : Upgrade CAX31 → CAX41 (32GB, ~€22/mois vs €13/mois)

**Option B — Serveur dédié LLM (recommandé)**
- Hetzner CAX41 ARM64 : 16 vCPU, 32GB RAM, €22/mois
- Avantage : isolation, scaling indépendant, pas d'impact Factory
- Localisation : Nuremberg EU (RGPD compliant)

### Serving : Ollama

```bash
# Installation sur serveur dédié
curl -fsSL https://ollama.com/install.sh | sh
ollama pull mistral-small:latest
ollama serve  # port 11434
```

**API compatible OpenAI** :
```bash
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "mistral-small", "messages": [{"role": "user", "content": "Bonjour"}]}'
```

---

## Intégration DynamicMLRouter

### Routing rules actuels (Silver Oak OS)

```typescript
// src/app/api/agent/[id]/route.ts — routing actuel
const model = selectModel(task); // → claude-sonnet-4-6, deepseek, etc.
```

### Nouveau Tier T0 "sensitive"

```typescript
// Nouveau : src/lib/pii-detector.ts
function detectSensitiveData(text: string): boolean {
  const PII_PATTERNS = [
    /\b[A-Z]{2}\d{6}[A-Z]\b/,           // Numéro passeport FR
    /\b\d{13}\b/,                          // NIR (sécu sociale)
    /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}[A-Z0-9]{0,3}\b/, // IBAN
    /salary|salaire|contrat.*rh|données personnelles/i,  // Mots-clés sensibles
  ];
  return PII_PATTERNS.some(p => p.test(text));
}

// src/app/api/agent/[id]/route.ts — routing modifié
const isSensitive = detectSensitiveData(userMessage);
const model = isSensitive
  ? 'http://LOCAL_LLM_HOST:11434/v1' // Mistral local
  : selectModel(task);                // Routing existant
```

---

## Performance Attendue

| Métrique | Valeur estimée |
|---------|---------------|
| Tokens/s (CAX41 ARM64) | 8-12 tok/s |
| Latence première réponse | 500ms - 2s |
| Latence p95 (response complète) | 5-15s |
| Concurrent requests | 2-3 max (RAM limitation) |
| Comparaison Claude API | 3-5x plus lent |

**Acceptabilité** : Pour données sensibles/RGPD, l'utilisateur accepte la latence supplémentaire vs risque de non-conformité.

---

## Coût Infrastructure

| Composant | Coût mensuel |
|-----------|-------------|
| Hetzner CAX41 (Option B) | €22/mois |
| Bande passante | €0 (intra-EU Hetzner) |
| Maintenance | ~2h/mois |
| **Total** | **~€25/mois** |

**Comparaison API cloud** (pour même volume de tokens) :
- Claude Sonnet : ~€50-200/mois selon usage
- → LLM local rentable dès ~€50/mois de tokens cloud

---

## Plan Migration (Strangler Fig)

```
Phase 1 (semaine 1) : Setup serveur + Ollama + test prompts
Phase 2 (semaine 2) : PII detector + routing dual (cloud+local en parallèle)
Phase 3 (semaine 3) : Bascule T0 sensitive → local uniquement
Phase 4 (mois 2)   : Fine-tuning Mistral sur domaine Silver Oak
```

**Zero downtime** : le routing existant (Claude SDK) continue de fonctionner. Mistral local = couche supplémentaire, pas de remplacement.

---

## Décision Requise (Karim)

1. **Architecture** : Option A (même serveur upgrade) ou Option B (serveur dédié) ?
2. **Budget** : +€9-22/mois accepté ?
3. **Priorité** : Phase 6 (après iOS Phase 4) ou avant ?
4. **Modèle** : Mistral Small 4 vs Qwen2.5-7B (plus rapide, moins précis) ?
5. **PII detector** : liste de patterns à valider (données spécifiques Silver Oak)

---

## Références

- Mistral Small 4 : https://mistral.ai/models/mistral-small
- Ollama : https://ollama.com
- Hetzner CAX41 : https://www.hetzner.com/cloud
- RGPD Art. 46 (transferts hors UE) : https://gdpr-info.eu/art-46-gdpr/
- ADR-002 (routing actuel) : docs/ADR-002-native-delegation.md
