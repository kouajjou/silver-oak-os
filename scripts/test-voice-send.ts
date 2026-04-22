// Standalone smoke-test for the Signal voice pipeline.
// Skips Claude entirely — synth a phrase with voice.ts and ship it over
// signal-rpc as an audio attachment.
//
// Run: tsx scripts/test-voice-send.ts "text to speak"
//
// Requires SIGNAL_PHONE_NUMBER and SIGNAL_AUTHORIZED_RECIPIENTS in .env
// and a running signal-cli daemon on SIGNAL_RPC_HOST:SIGNAL_RPC_PORT.

import fs from 'fs';
import os from 'os';
import path from 'path';

import { synthesizeSpeech, voiceCapabilities } from '../src/voice.js';
import { SignalRpcClient } from '../src/signal-rpc.js';
import {
  SIGNAL_AUTHORIZED_RECIPIENTS,
  SIGNAL_PHONE_NUMBER,
  SIGNAL_RPC_HOST,
  SIGNAL_RPC_PORT,
} from '../src/config.js';

async function main(): Promise<void> {
  const text = process.argv[2] || 'Hallo aus dem Mac. Dies ist ein Voice-Test.';
  const recipient = SIGNAL_AUTHORIZED_RECIPIENTS[0] ?? SIGNAL_PHONE_NUMBER;

  console.log('Config:', {
    recipient,
    host: SIGNAL_RPC_HOST,
    port: SIGNAL_RPC_PORT,
    caps: voiceCapabilities(),
  });

  console.log('[1/4] Synthesizing speech...');
  const t0 = Date.now();
  const buf = await synthesizeSpeech(text);
  console.log(`      ok — ${buf.length} bytes in ${Date.now() - t0}ms`);

  const audioPath = path.join(os.tmpdir(), `voice-test-${Date.now()}.mp3`);
  fs.writeFileSync(audioPath, buf);
  console.log(`[2/4] Wrote temp file: ${audioPath}`);

  console.log('[3/4] Connecting to signal-cli daemon...');
  const rpc = new SignalRpcClient({ host: SIGNAL_RPC_HOST, port: SIGNAL_RPC_PORT, callTimeoutMs: 15000 });
  await rpc.connect();
  console.log('      connected');

  console.log(`[4/4] Sending audio attachment to ${recipient}...`);
  try {
    await rpc.sendWithAttachments(recipient, '', [audioPath]);
    console.log('      sent ok — check your phone');
  } catch (err) {
    console.error('      SEND FAILED:', err);
    process.exitCode = 1;
  } finally {
    rpc.stop();
    try { fs.unlinkSync(audioPath); } catch { /* ok */ }
  }
}

main().catch((err) => {
  console.error('test-voice-send failed:', err);
  process.exit(1);
});
