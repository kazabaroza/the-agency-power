#!/bin/bash
# Free checks for every AI key the app uses. Never prints key values.
# Accepts NAME or AGENCY_NAME, and strips stray characters the way the app does.
pick() { local v="${!1}"; [ -z "$v" ] && { local a="AGENCY_$1"; v="${!a}"; }; printf '%s' "$v" | grep -oE "$2" | head -1; }
code() { curl -s -o /dev/null -m 20 -w '%{http_code}' "$@"; }

k=$(pick ANTHROPIC_API_KEY 'sk-ant-[A-Za-z0-9_-]{20,}')
[ -z "$k" ] && echo "Anthropic: no key" || echo "Anthropic: HTTP $(code https://api.anthropic.com/v1/models -H "x-api-key: $k" -H 'anthropic-version: 2023-06-01')  (200 = OK)"

k=$(pick OPENAI_API_KEY 'sk-[A-Za-z0-9_-]{20,}')
[ -z "$k" ] && echo "OpenAI: no key" || echo "OpenAI (images): HTTP $(code https://api.openai.com/v1/models -H "Authorization: Bearer $k")  (200 = OK)"

k=$(pick FAL_KEY '[A-Za-z0-9_:-]{20,}')
model=${FAL_VIDEO_MODEL:-bytedance/seedance-2.0/text-to-video}
if [ -z "$k" ]; then echo "fal.ai: no key"; else
  # Status of a request id that does not exist: 401/403 = bad key, 404/422 = key accepted. Starts no render.
  echo "fal.ai: HTTP $(code "https://queue.fal.run/$model/requests/00000000-0000-0000-0000-000000000000/status" -H "Authorization: Key $k")  (404/422 = key OK, 401/403 = bad key, 000 = domain blocked)"
fi
