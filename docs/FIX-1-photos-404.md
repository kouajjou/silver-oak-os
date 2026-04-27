# FIX-1 — Photos 404 (2026-04-26)

## Root cause

Agent photos (/agents/*.jpg, /agents/*.webp) were proxied through Next.js
(silver-oak-os-frontend on port 3010). The PM2 process had 10 restarts,
causing transient 404s during startup windows when the Next.js server
was not yet accepting connections.

## Fix applied

Caddy now serves /agents/* directly from disk:
  /etc/caddy/Caddyfile — added handle /agents/* { file_server }

This bypasses Next.js entirely for static agent photos.

## Benefits

- Photos independent of Next.js health (PM2 restarts)
- Immutable cache headers (max-age=31536000) — 1yr browser cache
- Lower latency (no proxy hop through Node.js)
- Consistent 200 even during Next.js hot reload

## Verified

curl -I https://os.silveroak.one/agents/alex.jpg  → 200 immutable
curl -I https://os.silveroak.one/agents/leo.jpg   → 200 immutable
curl -I https://os.silveroak.one/agents/marco.jpg → 200 immutable
curl -I https://os.silveroak.one/agents/nina.jpg  → 200 immutable
curl -I https://os.silveroak.one/agents/sara.jpg  → 200 immutable
curl -I https://os.silveroak.one/agents/maestro.jpg → 200 immutable
