# ADR-001 — Factory Decoupling from Claudette

**Date**: 2026-04-25
**Status**: Accepted
**Deciders**: Karim Kouajjou (founder)

## Context

Initial setup: Silver Oak OS Factory was physically hosted on the Claudette product server (178.104.24.23) at /app/produits-saas/factory/silver-oak-os/.
Sync mechanism: cron rsync from Claudette source to Factory server (178.104.255.59) every 5 minutes.

Issues:
- Architectural confusion: Factory (personal usine for Karim) vs Claudette (B2C product) on same server
- Sync drift: missing commits on Claudette source caused photo_url_webp regression on Factory every 5 min
- Coupling: Factory deployment depended on Claudette server health
- Risk: Factory experiments could impact Claudette production

## Decision

Migrate Factory entirely to its own dedicated server (178.104.255.59).
Factory becomes standalone, autonomous, with vision.yml source of truth on Factory directly.
Decommission Factory presence on Claudette server, archive for 30 days minimum.

## Architecture After

| Server | IP | Role |
|---|---|---|
| Claudette | 178.104.24.23 (CAX41) | B2C product (Claudette) UNIQUEMENT |
| Factory | 178.104.255.59 (CAX21) | Silver Oak OS Factory UNIQUEMENT |

| Aspect | Before | After |
|---|---|---|
| Factory location | /app/produits-saas/factory/silver-oak-os on Claudette | /app/silver-oak-os on Factory server |
| vision.yml source | Claudette (sync to Factory) | Factory directly |
| Coupling | Factory depends on Claudette | Independent |
| Sync mechanism | rsync cron Claudette->Factory every 5min | None (single source) |

## Consequences

### Positive
- Clear separation of concerns
- Factory experiments isolated from Claudette PROD
- No more sync drift bugs
- Factory can be scaled/migrated independently
- Better security posture (Factory creds isolated)

### Negative
- Two servers to maintain (vs one)
- Initial migration cost (~5 hours, ~$1.20)
- Loss of automatic Claudette->Factory sync (now manual edits on Factory)

### Neutral
- Backup tar.gz 53MB kept on Claudette /_archive/ for 30 days minimum (rollback safety net)
- Archive on Claudette: /app/_archive/factory-decommissioned-20260425_1700_DO_NOT_DELETE_BEFORE_20260525/ (904MB, read-only)

## Migration Phases (M1-M7)

| Phase | Date | Outcome |
|---|---|---|
| M1 Audit | 2026-04-25 | 244 files missing on Factory identified |
| M1.5 Git cleanup | 2026-04-25 | Both repos aligned on HEAD c3d4551 |
| M2 Backup | 2026-04-25 | tar.gz 53MB SHA256 verified double redondance |
| M3 Prep Factory | 2026-04-25 | Crons disabled, snapshot 30s rollback ready |
| M4 Rsync | 2026-04-25 | 244 files + 10 .env + 4 SQLite stores transferred |
| M5 Runtime validation | 2026-04-25 | tsc 0 errors, 6/6 agents OK, TTS 154KB |
| M6 DNS/inversion | 2026-04-25 | Factory standalone source of truth |
| Phase G monitoring | 2026-04-25 | 30 min ALL GREEN (6x5min + 3x10min + Caddy + crons) |
| M7 Decommissioning | 2026-04-25 | Factory archived on Claudette, point of no return |

## Rollback Plan (until 2026-05-25)

If critical issue with Factory standalone:
1. Stop PM2 silver-oak-os-frontend on Factory
2. Restore Factory on Claudette: chmod +w /app/_archive/factory-decommissioned-*/ then mv to /app/produits-saas/factory/silver-oak-os/
3. Restore PM2: cd /app/produits-saas/factory/silver-oak-os/ && pm2 start ecosystem.config.cjs && pm2 save
4. Worst case: tar -xzf /app/_archive/factory-pre-migration-20260425_141322.tar.gz

After 2026-05-25, archive can be permanently deleted.

## References

- Migration audit reports: /app/audits/rapports/20260425_*
- Backup MANIFEST: /app/_archive/factory-pre-migration-20260425_141322.MANIFEST.txt
- vision.yml v1.5 (this commit)
