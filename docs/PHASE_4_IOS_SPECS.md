# PHASE 4 — iOS Specs (Silver Oak OS)

**Status**: Préparation (décision Karim requise)
**Prérequis**: Apple Developer Account ($99/an)
**Approach**: Capacitor + Next.js existant (réutilise frontend/)

---

## Objectif

Packager Silver Oak OS en application iOS native via TestFlight, puis App Store.
L'app permet d'accéder aux 6 chefs IA depuis iPhone avec :
- Interface native (WebView Capacitor)
- Notifications push
- Intégration voix (ElevenLabs TTS + microphone)
- Bouton côté EU DMA (iOS 17.4+)

---

## Stack proposée

### Approche Capacitor (recommandée)

**Pourquoi Capacitor ?**
- Réutilise 100% du frontend Next.js existant
- Zéro réécriture Swift/React Native
- Time-to-TestFlight estimé : 3-5 jours
- Maintenance = mise à jour Next.js uniquement

```
silver-oak-os/
├── frontend/          # Next.js existant → WebView
├── ios/               # Généré par Capacitor
│   ├── App/
│   └── Podfile
└── capacitor.config.ts
```

**Stack technique**:
- Capacitor 6.x (bridge JS ↔ Native)
- Next.js 15 (frontend inchangé)
- Swift (code natif minimal : notifications, deep links)
- Xcode 15+ requis (Mac nécessaire)

---

## Apple Developer Setup

### Prérequis (HITL Karim)
1. **Compte Apple Developer** : https://developer.apple.com/programs/ ($99/an)
2. **Bundle ID** : `one.silveroak.os` (à enregistrer)
3. **Certificates** : Distribution Certificate + Provisioning Profile (via Xcode)
4. **App Store Connect** : Créer app + TestFlight group

### Setup technique
```bash
# 1. Installer Capacitor
npm install @capacitor/core @capacitor/ios @capacitor/cli

# 2. Init Capacitor (depuis racine silver-oak-os)
npx cap init "Silver Oak OS" one.silveroak.os

# 3. Build Next.js en mode static ou via serveur
cd frontend && npm run build

# 4. Ajouter plateforme iOS
npx cap add ios

# 5. Sync assets
npx cap sync ios

# 6. Ouvrir dans Xcode
npx cap open ios
```

---

## TestFlight Workflow

```
1. Build archive (Xcode → Product → Archive)
2. Upload to App Store Connect (Organizer → Distribute)
3. TestFlight review (24-48h Apple)
4. Invite testeurs via email
5. Feedback → itérations
6. App Store submission (si prêt)
```

**Délai estimé TestFlight** : 3-5 jours (setup) + 1-2 jours (review Apple)

---

## EU DMA — Side Button Reassignment (iOS 17.4+)

La directive EU Digital Markets Act (DMA) oblige Apple à permettre aux apps UE de :
- Utiliser les boutons physiques (Action Button iPhone 15 Pro)
- Intégrer des assistants IA alternatifs

### Faisabilité
- **iOS 17.4+** : `UIApplicationDelegate.application(_:open:options:)` permet d'intercepter certains gestes
- **Action Button** (iPhone 15 Pro) : Peut être configuré via Shortcuts pour ouvrir Silver Oak OS
- **Limitation** : Apple ne donne pas accès direct au side button via API publique
- **Alternative DMA** : Enregistrer Silver Oak OS comme "Browser/Assistant" alternatif (Art. 6(7) DMA)

**Recommandation** : Intégrer un widget Siri/Shortcuts qui ouvre rapidement un chef IA spécifique.

---

## Intégration Voix

### TTS (Text-to-Speech)
- **ElevenLabs** : déjà intégré backend (API key requise)
- **iOS AVSpeechSynthesizer** : fallback offline gratuit
- **Implémentation** : Capacitor plugin custom ou `@capacitor-community/text-to-speech`

### STT (Speech-to-Text)
- **Deepgram** : real-time streaming STT (recommandé, $0.0043/min)
- **Whisper (Groq)** : transcription non-temps-réel (gratuit tier)
- **iOS Speech Framework** : offline, Apple, RGPD-friendly
- **Implémentation** : Capacitor custom plugin wrapping AVFoundation

---

## Notifications Push

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'one.silveroak.os',
  appName: 'Silver Oak OS',
  webDir: 'frontend/out',  // Next.js static export
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};
```

**Backend** : APNS (Apple Push Notification Service) via HTTP/2
**Use cases** : Alerte mission terminée, rapport journalier 8h, HITL Karim

---

## Estimations Effort + Risques

| Phase | Effort | Risque |
|-------|--------|--------|
| Setup Capacitor | 1 jour | Faible |
| Build iOS + Xcode | 1 jour | Moyen (Mac requis) |
| TestFlight submission | 1 jour | Faible |
| Voix (STT+TTS) | 3-5 jours | Moyen |
| Notifications push | 1 jour | Faible |
| Side button DMA | 2-3 jours | Élevé (API limitée) |
| **Total MVP** | **~1 semaine** | Moyen |

**Prérequis bloquants** :
1. Mac avec Xcode 15+ (build iOS)
2. Apple Developer Account ($99/an)
3. Décision Karim sur Bundle ID + compte

---

## Next Steps (HITL Karim)

1. Créer Apple Developer Account
2. Choisir Bundle ID (`one.silveroak.os`)
3. Confirmer approche Capacitor vs React Native
4. Provisioner Mac build server (ou GitHub Actions)
5. GO Phase 4 implementation
