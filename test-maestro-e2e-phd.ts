/**
 * test-maestro-e2e-phd.ts — PhD load env BEFORE imports
 */

// Load env FIRST, before any module imports
import fs from 'fs';
import path from 'path';
const envFile = path.join(process.cwd(), '.env');
const content = fs.readFileSync(envFile, 'utf-8');
for (const line of content.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq < 0) continue;
  const k = t.slice(0, eq).trim();
  const v = t.slice(eq + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}
console.log('ENV loaded — MCP_BRIDGE_URL=' + process.env['MCP_BRIDGE_URL']);

// Now safe to import (modules read process.env at top-level)
const { dispatchToMaestro } = await import('./src/agents/maestro_dispatcher.js');
const { getAvailableProviders, getProvidersStatus } = await import('./src/adapters/llm/index.js');

async function main() {
  console.log('═══ TEST E2E PhD — dispatchToMaestro() ═══\n');

  const status = getProvidersStatus();
  console.log('═ Providers:');
  for (const s of status) console.log(`  ${s.available ? '✅' : '❌'} ${s.provider}`);
  console.log(`  → Available: ${getAvailableProviders().join(', ')}\n`);

  // ═══ TEST 1 — Mode 2 short task ═══
  console.log('═ TEST 1 — Mode 2 (Gemini)');
  const t1 = Date.now();
  const r1 = await dispatchToMaestro({
    task_description: 'Réponds "ls -la liste les fichiers" en 1 phrase.',
    user_id: 'test-phd-1',
    preferred_provider: 'google',
    max_tokens: 50,
  });
  console.log(`  Mode: ${r1.mode_used} | Provider: ${r1.provider_used} | Cost: $${r1.cost_usd?.toFixed(6) ?? 0} | Latency: ${r1.latency_ms}ms`);
  console.log(`  Success: ${r1.success}`);
  console.log(`  Result: ${(r1.result || r1.error || '').slice(0, 150)}\n`);

  // ═══ TEST 2 — Mode 1 forced ═══
  console.log('═ TEST 2 — Mode 1 forced (Pro Max claude-backend)');
  // shorter polling for the test
  const t2 = Date.now();
  const r2 = await dispatchToMaestro({
    task_description: 'Test PhD Mode 1. Réponds en 1 ligne "PONG mode 1 reel" et termine par TASK_DONE_phd_test_2.',
    user_id: 'test-phd-2',
    mode: 'mode_1_tmux',
  });
  console.log(`  Mode: ${r2.mode_used} | Provider: ${r2.provider_used} | Cost: $${r2.cost_usd} | Latency: ${r2.latency_ms}ms`);
  console.log(`  Success: ${r2.success}`);
  console.log(`  Result: ${(r2.result || r2.error || '').slice(0, 300)}\n`);

  console.log('═══ VERDICT ═══');
  const ok = r1.success && r2.success;
  console.log(ok ? '✅ TOUT OK — Mode 1 + Mode 2 OPÉRATIONNELS' : '❌ ÉCHEC');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
