#!/bin/bash
# Free check of the WhatsApp Cloud API setup. Never prints secrets.
# Usage: scripts/check-whatsapp.sh [public-app-url]
V=${META_GRAPH_VERSION:-v23.0}
[ -z "$WHATSAPP_TOKEN" ] && { echo "WHATSAPP_TOKEN: missing"; exit 1; }
[ -z "$WHATSAPP_PHONE_NUMBER_ID" ] && { echo "WHATSAPP_PHONE_NUMBER_ID: missing"; exit 1; }
echo "Phone number lookup:"
curl -s "https://graph.facebook.com/$V/$WHATSAPP_PHONE_NUMBER_ID?fields=display_phone_number,verified_name,quality_rating" \
  -H "Authorization: Bearer $WHATSAPP_TOKEN" | python3 -I -c 'import json,sys;d=json.load(sys.stdin);print("  ERROR:",d["error"].get("message")) if "error" in d else print("  OK:",d.get("verified_name"),d.get("display_phone_number"),"quality:",d.get("quality_rating"))'
[ -z "$WHATSAPP_VERIFY_TOKEN" ] && echo "WHATSAPP_VERIFY_TOKEN: missing (needed for the webhook)"
[ -z "$WHATSAPP_APP_SECRET" ] && echo "WHATSAPP_APP_SECRET: missing (webhook signatures will not be checked)"
if [ -n "$1" ] && [ -n "$WHATSAPP_VERIFY_TOKEN" ]; then
  r=$(curl -s "$1/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=$WHATSAPP_VERIFY_TOKEN&hub.challenge=ping123")
  [ "$r" = "ping123" ] && echo "Webhook at $1: OK" || echo "Webhook at $1: FAILED (got: ${r:0:80})"
fi
