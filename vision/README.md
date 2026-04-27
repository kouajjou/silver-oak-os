# Silver Oak Vision Pipeline

## Pour Karim (simple)

Ta vision vit ici : **`vision.yml`**

Pour regénérer le PowerPoint :

```bash
cd /app/produits-saas/factory/silver-oak-os/vision/
npm run build:pptx
```

Le deck sort dans : `dist/SilverOakOS_Vision.pptx`

## Changer ta vision

1. Ouvre `vision.yml`
2. Change ce que tu veux (titre, chiffres, agents, textes...)
3. Lance `npm run build:pptx`
4. Le deck est à jour — même structure, nouvelles données

## Structure

```
vision/
├── vision.yml              ← SINGLE SOURCE OF TRUTH
├── package.json            ← scripts + deps
├── README.md               ← ce fichier
├── generators/
│   └── build_pptx.js       ← générateur PPTX (lit vision.yml)
├── dist/
│   └── SilverOakOS_Vision.pptx  ← output
└── history/                ← archive des anciennes versions
```

## Ce que vision.yml contrôle

| Section | Contenu |
|---------|---------|
| `company` | Nom, legal, location, tagline |
| `hero` | Titre, sous-titre, badge 12 mois |
| `founder` | Nom, rôle |
| `vision` | Exit value M€, mois |
| `pillars` | Claudette + Silver Oak OS cards |
| `agents` | Les 6 agents (nom, rôle, detail) |
| `capabilities` | Les 8 capacités |
| `stack_pillars` | Les 4 piliers tech |
| `trajectory` | Courbe M0→M12, 3 milestones |
| `thesis` | Citation principale |
| `roadmap` | Live today + phase 2 |
| `phases` | 3 phases produit |
| `closing` | Slide finale |
| `theme` | Palette couleurs + fonts |

## Versioning

Chaque modif committée → historique Git = journal de ta vision.

```bash
git log --oneline vision/vision.yml
```

## À venir (P2, P3)

- `build:html` → landing page silveroak_vision.html
- `build:viz` → visualisation interactive 7 nodes
- `build:pdf`, `build:onepager`, `build:social`
- Mode trilingue FR / ES / EN
- Pipeline auto via Telegram voice

## RÈGLE VERSIONING (garde-fou)

**Toute modification de vision.yml DOIT bumper meta.version + ajouter changelog_v1_X. Pas de drift toléré.**

Voir docs/adr/ADR-001-factory-decoupling.md pour contexte.
