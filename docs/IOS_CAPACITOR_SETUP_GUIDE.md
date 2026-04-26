# iOS Capacitor Setup Guide — Silver Oak OS

**Date**: 2026-04-26
**Capacitor version**: 8.3.1
**Target**: TestFlight → App Store (avant WWDC juin 2026)

---

## Ce qui est déjà fait (serveur Linux, 2026-04-26)

```
✅ @capacitor/core 8.3.1 installé
✅ @capacitor/cli 8.3.1 installé
✅ @capacitor/ios 8.3.1 installé
✅ capacitor.config.ts créé (hybrid mode → https://os.silveroak.one)
✅ ios/ project folder généré (npx cap add ios)
```

---

## Étapes manuelles requises (besoin Mac + Xcode)

### Prérequis Mac
```
- macOS 13+ (Ventura ou Sonoma)
- Xcode 15+ (App Store)
- Compte Apple Developer (99$/an) → developer.apple.com
- CocoaPods : sudo gem install cocoapods
```

### Étape 1 — Cloner le repo sur Mac

```bash
git clone https://github.com/kouajjou/silver-oak-os.git
cd silver-oak-os
npm install
```

### Étape 2 — Sync Capacitor

```bash
# Option A — Mode hybride (live URL, recommandé pour début)
# capacitor.config.ts pointe vers https://os.silveroak.one
# App charge le site en live → zéro redéploiement App Store pour mises à jour contenu

npx cap sync ios

# Option B — Mode natif complet (build Next.js statique)
# Dans next.config.js : ajouter output: 'export'
# Dans capacitor.config.ts : commenter server {}, décommenter webDir: 'frontend/out'
# Puis :
cd frontend && npm run build
cd ..
npx cap sync ios
```

### Étape 3 — Ouvrir dans Xcode

```bash
npx cap open ios
# → Xcode s'ouvre automatiquement avec ios/App/App.xcworkspace
```

### Étape 4 — Configurer Xcode

Dans Xcode (Project Navigator → App → Signing & Capabilities) :
1. **Team** : sélectionner votre compte Apple Developer
2. **Bundle ID** : one.silveroak.os
3. **Associated Domains** : ajouter applinks:os.silveroak.one (pour deep links)
4. **Status Bar Style** : Dark Content (déjà configuré)

### Étape 5 — Plugins natifs (optionnels, installer avant sync)

```bash
# Splash Screen + Status Bar (déjà configurés dans capacitor.config.ts)
npm install @capacitor/splash-screen @capacitor/status-bar

# Microphone (pour Web Speech API en natif)
# → iOS demande automatiquement via WKWebView

# Push Notifications (futur)
npm install @capacitor/push-notifications
```

### Étape 6 — TestFlight

1. Dans Xcode : Product → Archive
2. Xcode Organizer → Distribute App → App Store Connect
3. App Store Connect → TestFlight → inviter Karim (karim@silveroak.one)
4. Sur iPhone : installer TestFlight → accepter invitation → Silver Oak OS

---

## Configuration actuelle (capacitor.config.ts)

```typescript
appId: 'one.silveroak.os'
appName: 'Silver Oak OS'
server.url: 'https://os.silveroak.one'   // Mode hybride live
ios.backgroundColor: '#071529'           // so-bg
ios.contentInset: 'automatic'            // safe area iOS
```

---

## Architecture hybride vs native — Décision

| Mode | Avantages | Inconvénients |
|------|-----------|---------------|
| **Hybride (live URL)** ✅ | Mises à jour sans re-submit App Store | Requiert connexion internet |
| Natif (static export) | Fonctionne offline | Re-submit App Store à chaque update |

**Recommandation MVP** : Hybride. Karim verra toujours la dernière version de https://os.silveroak.one sans rien faire.

---

## Structure ios/ générée

```
ios/
├── App/
│   ├── App/
│   │   ├── AppDelegate.swift
│   │   ├── Info.plist          ← modifier NSMicrophoneUsageDescription
│   │   └── public/             ← web assets (hybrid: ignoré)
│   ├── App.xcodeproj/
│   └── App.xcworkspace/        ← TOUJOURS ouvrir ce fichier
└── debug.xcconfig
```

### Info.plist — Permissions requises

Ajouter dans Xcode (Info tab) :
```xml
<key>NSMicrophoneUsageDescription</key>
<string>Silver Oak OS utilise le micro pour les commandes vocales Hey Alex, Hey Marco…</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>Silver Oak OS utilise la reconnaissance vocale pour interagir avec vos agents.</string>
```

---

**Timeline** : Setup complet ~2h sur Mac avec Xcode. TestFlight possible le même jour.
