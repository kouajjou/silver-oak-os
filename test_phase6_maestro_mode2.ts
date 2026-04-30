// Test E2E Phase 6 -- Maestro Mode 2 simple task
// Teste que maestroHandle fonctionne avec forceMode: mode_2_api (sans Anthropic)
import { maestroHandle } from './src/agents/maestro_orchestrator.js';

async function test() {
  console.log('[TEST-PHASE6] Starting Mode 2 simple task test...');
  const start = Date.now();
  
  const result = await maestroHandle(
    'Write a TypeScript function that adds two numbers and returns the sum',
    { forceMode: 'mode_2_api' }
  );
  
  const elapsed = Date.now() - start;
  console.log('[TEST-PHASE6] Result:', JSON.stringify(result, null, 2));
  console.log('[TEST-PHASE6] Duration:', elapsed, 'ms');
  
  // Validations
  const checks = {
    success: result.success === true,
    notAnthropic: result.provider !== 'anthropic',
    hasResult: typeof result.result === 'string' && result.result.length > 0,
    hasMode: result.mode !== undefined,
  };
  
  console.log('[TEST-PHASE6] Checks:', JSON.stringify(checks, null, 2));
  
  const allPassed = Object.values(checks).every(v => v === true);
  if (allPassed) {
    console.log('[TEST-PHASE6] ✅ ALL CHECKS PASSED');
    process.exit(0);
  } else {
    console.error('[TEST-PHASE6] ❌ SOME CHECKS FAILED');
    process.exit(1);
  }
}

test().catch(e => {
  console.error('[TEST-PHASE6] ❌ UNCAUGHT ERROR:', e.message);
  console.error(e.stack);
  process.exit(2);
});
