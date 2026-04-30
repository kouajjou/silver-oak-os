#!/usr/bin/env node
/**
 * Non-interactive CLI for creating ClaudeClaw agents.
 * Designed to be called by the Telegram agent or CI scripts.
 *
 * Usage:
 *   node dist/agent-create-cli.js \
 *     --id analytics \
 *     --name "Analytics" \
 *     --description "Data analysis and reporting" \
 *     --model claude-sonnet-4-6 \
 *     --template research \
 *     --token "123456789:ABCdef..." \
 *     --activate
 *
 * Flags:
 *   --id          Agent ID (required, lowercase, no spaces)
 *   --name        Display name (required)
 *   --description What this agent does (required)
 *   --model       Model override (default: claude-sonnet-4-6)
 *   --template    Template to copy from (default: _template)
 *   --token       Telegram bot token from BotFather (required)
 *   --activate    Install launchd/systemd service and start immediately
 *   --validate    Only validate the token, don't create anything
 *   --suggest     Only print suggested bot names for the given --id
 */
export {};
//# sourceMappingURL=agent-create-cli.d.ts.map