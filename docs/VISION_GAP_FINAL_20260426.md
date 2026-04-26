# Vision Gap Final — Silver Oak OS
**Date** : 2026-04-26
**Branche** : feature/b6-vision-gap-doc

---

## Vision Karim — Objectif cible

App iPhone FaceTime virtuel avec 6 chefs IA (Alex/Sara/Léo/Marco/Nina/Maestro) :
- Accès direct par chef sans passer par Alex
- 4 canaux par chef : Voix / FaceTime / Message / Email
- Mode FaceTime : photo immersive + waveform + transitions cinématiques
- Commande vocale "Hey Marco" directe
- Sous-agents travaillent en silence, visibles dans l'app
- Souveraineté EU-RGPD, LLM local possible
- iOS natif via TestFlight avant WWDC juin 2026

---

## Etat actuel — Lot A + Lot B (2026-04-26)

### IMPLEMENTE

| Fonctionnalite | Branche | Detail |
|----------------|---------|--------|
| 6 cartes agents home page | vision-pipeline-p1 | Photo, nom, role, 4 channel buttons |
| Grid responsive 2/3/6 col | b1-home-6-chefs | mobile/tablet/desktop |
| Hover glow + elevation | b1-home-6-chefs | border-gold + shadow + translate-y |
| Chat textuel par agent | vision-pipeline-p1 | Claude Sonnet 4.6 + fallback MVP |
| TTS voix par agent | vision-pipeline-p1 | Gemini/OpenAI TTS, per-agent voice |
| Voice input (Web Speech API) | vision-pipeline-p1 | Push-to-talk FR-FR |
| Channel Switcher 4 onglets | b2-channel-switcher | Voix/FaceTime/Message/Email |
| Mode FaceTime cinematique | b2-channel-switcher | Photo plein ecran, breathing, waveform 15 barres |
| Transition agent slide-up | b2-channel-switcher | Quand delegation_chain change |
| LocalStorage canal prefere | b2-channel-switcher | Par agent, persiste |
| Attribution delegation chain | 3b2-attribution-visible | agent_name + delegation_chain |
| Hey Marco commande vocale | b4-hey-marco-direct | 6 patterns FR, navigation directe |
| DelegationTrace UI | vision-pipeline-p1 | Delegations actives en temps reel |
| ActivityFeed UI | vision-pipeline-p1 | Historique avec pagination |
| PWA manifeste + iOS meta | vision-pipeline-p1 | add-to-homescreen, safe area |
| iOS Capacitor 8.3.1 | b5-ios-capacitor | Hybrid mode, ios/ genere, guide TestFlight |
| SoulPrompts par agent | vision-pipeline-p1 | 6 personas FR, ADHD-friendly |

---

## Pourcentage Vision

| Phase | % | Detail |
|-------|---|--------|
| vision-pipeline-p1 base | 38% | Chat de base, 6 agents statiques |
| Apres Lot A (3b2) | 52% | Attribution, DelegationTrace |
| Apres Lot B (b1-b5) | **72%** | FaceTime, HeyMarco, ChannelSwitcher, iOS |

---

## Gaps P0 — Mandatory pre-beta

| Gap | Description | Cout | Delai |
|-----|-------------|------|-------|
| Pipecat streaming voix | Voix temps reel WebRTC. Sub-500ms vs 2-4s actuel. | ~$50/mo infra | 1 semaine |
| LLM EU-souverain (Mistral) | Remplacer Claude (US) par Mistral API EU. RGPD data residency. | ~$30/mo | 3 jours |
| AgentFactory cable | Delegation reelle Alex->Marco. Actuellement delegated=false toujours. | 0$ (code interne) | 1 semaine |
| /api/delegations/active | API appelee par DelegationTrace mais 404 silencieux. | 2h code | 1 jour |
| Photos reelles agents | Actuellement placeholders jpg. Imagen 4 Ultra (vision.yml pret). | ~$2 | 1h |

---

## Gaps P1 — Nice-to-have pre-beta

| Gap | Description | Impact |
|-----|-------------|--------|
| Video levres bougent | D-ID ou HeyGen API avatar video synchronise. | WOW factor ++++ |
| Side button iOS | Shortcut Action Button iPhone 15 Pro -> Hey Maestro. | Native feel |
| Sub-agents silencieux visibles | ActivityFeed : Leo travaille contenu, Nina fait recherche. | Transparence |
| Multi-langue | ES/EN switch (SoulPrompts FR/ES/EN deja en vision.yml). | Marche international |
| Canal Slack/WhatsApp entrant | Reponses agents visibles dans Silver Oak OS. | Bidirectionnel |

---

## Gaps P2 — Post-beta

- Equipes scalables (agents custom sans dev)
- Multi-tenant (Silver Oak OS pour autres clients)
- Metrics ROI (dashboard "combien ca m'a economise")
- Agenda Google (Marco gere le calendrier)
- Notifications proactives (Alex push au reveil)

---

## Roadmap 4 semaines vers beta

| Semaine | Sprint | Livrables |
|---------|--------|-----------|
| S1 (27 avr - 3 mai) | P0 core | /api/delegations/active + AgentFactory delegation + photos Imagen |
| S2 (4-10 mai) | P0 voix | Pipecat streaming + LLM Mistral EU |
| S3 (11-17 mai) | iOS polish | TestFlight Mac + D-ID video 1 agent pilote |
| S4 (18-25 mai) | Beta prep | Tests Karim + fix P1 + landing page |
| Beta | 26 mai 2026 | Karim seul, invite 5 beta-testeurs |

---

## Couts P0/mois

| Item | Cout |
|------|------|
| Mistral API (1000 calls/j) | ~$30/mo |
| Pipecat hosting (1 user concurrent) | ~$50/mo |
| D-ID video pilote (100 clips) | ~$20 one-time |
| Imagen 4 Ultra (6 agents) | ~$2 one-time |
| **Total mensuel** | **~$82/mo** |

---

## Notes techniques

1. Mode hybride Capacitor recommande : updates sans re-submit App Store.
2. VoiceInput.tsx : 3 erreurs TSC pre-existantes (lib.dom.d.ts SpeechRecognition). Non bloquantes (exit 0). A corriger avant beta.
3. delegated=false toujours en prod : AgentFactory Claudette non cable a /api/chat Silver Oak OS. P0 priorite.

---

*Document genere par claude-frontend Lot B — 2026-04-26*
