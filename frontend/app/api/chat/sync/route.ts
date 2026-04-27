// /api/chat/sync — alias minimal vers /api/chat
// gap-001 alpha : minimal alias, prod inchangée
// gap-001-bis (séparé) : activer Tier 1 backend Hono via env vars

import { POST as ChatPOST } from "../route"

export const POST = ChatPOST
