#!/bin/bash
# Live smoke test against a running server (default http://localhost:3000).
# Needs ANTHROPIC_API_KEY on the server. Usage: scripts/smoke.sh [base-url]
set -e
B=${1:-http://localhost:3000}
J=$(mktemp)
pyget() { python3 -I -c "import json,sys;d=json.load(sys.stdin);print($1)"; }

code=$(curl -s -X POST "$B/api/auth/send-otp" -H 'Content-Type: application/json' -d '{"email":"smoke@test.local"}' | pyget 'd.get("demoCode","")')
[ -z "$code" ] && { echo "email provider is configured - log in manually"; exit 1; }
curl -s -c "$J" -X POST "$B/api/auth/verify-otp" -H 'Content-Type: application/json' -d "{\"email\":\"smoke@test.local\",\"code\":\"$code\"}" >/dev/null

say() {
  echo; echo "▶ $1"
  out=$(curl -s -b "$J" -X POST "$B/api/chat" -H 'Content-Type: application/json' -d "{\"text\":\"$1\"}" --max-time 600)
  echo "$out" | pyget 'd.get("reply") or d'
  echo "$out" | grep -q '"error"' && ERRORS=$((ERRORS+1)) || true
}
ERRORS=0

say "יש לי סטודיו לפילאטיס בשם Fit and Fun בתל אביב, לנשים בגילאי 30-55. הטון חם ומקצועי."
say "תכין קרוסלה של 5 שקפים על טעויות נפוצות של מתחילות בפילאטיס"
say "תבנה דף נחיתה לשיעור ניסיון חינם"
say "תכין קמפיין Meta ללידים ב-120 שח ליום ברדיוס 10 קמ מהסטודיו, עם דף הנחיתה שבנית"

echo; echo "── checks"
curl -s -b "$J" "$B/api/messages" | ERRORS=$ERRORS python3 -I -c '
import json,sys,os
d=json.load(sys.stdin); m=d["messages"]
agents=[x["text"] for x in m if x["kind"]=="agent"]
types=sorted({a["type"] for a in d["assets"]})
demo=any("מצב הדגמה" in x["text"] for x in m)
print("specialists used:", len(agents)); [print("  ",a) for a in agents]
print("assets:", types)
print("approval cards:", sum(1 for x in m if x["kind"]=="approval"))
errors=int(os.environ.get("ERRORS","0"))
print("RESULT:", f"FAIL - {errors} request(s) returned an error" if errors else "FAIL - still in demo mode" if demo else "OK - live Claude")
'
rm -f "$J"
