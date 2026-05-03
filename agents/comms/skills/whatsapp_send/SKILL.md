---
name: whatsapp_send
description: Send WhatsApp messages via WhatsApp Business API or Twilio. Requires API credentials.
triggers: [whatsapp, whats app, wa, wapp, whats]
allowed-tools: Bash(curl *)
---

# WhatsApp Send Skill

## Purpose

Send messages via WhatsApp Business API (Meta) or Twilio WhatsApp.

## Prerequisites

Requires in .env:
- `WHATSAPP_PHONE_NUMBER_ID` (Meta Business API)
- `WHATSAPP_ACCESS_TOKEN` (Meta Business API)
- Or `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` (Twilio)

## Commands (Meta API)

```bash
# Send text message
curl -X POST \
  "https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages" \
  -H "Authorization: Bearer ${WHATSAPP_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "+33XXXXXXXXX",
    "type": "text",
    "text": {"body": "Message here"}
  }'
```

## Limitations

- WhatsApp requires business account and Meta approval
- Template messages required for first contact (24h window)
- Not available if WHATSAPP_ACCESS_TOKEN not set in .env
