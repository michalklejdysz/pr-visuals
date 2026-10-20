#!/bin/sh
# Shoots the README hero's stills from the demo repo (a clone of the fork, dev server running):
#   hero/capture.sh <demo repo> <PR url>
# Output: <demo repo>/.pr-visuals/out/hero/{app-after,app-before,github}.png and stills.json.
# Then copy the PR's demo.webm there and run render.sh.
set -eu
DEMO=$(cd "$1" && pwd); PR_URL=$2
HERE=$(cd "$(dirname "$0")" && pwd)
APP=http://localhost:5173/
FILE=src/features/dashboard/index.tsx
OUT=$DEMO/.pr-visuals/out/hero
mkdir -p "$OUT"

git -C "$DEMO" diff --quiet HEAD -- "$FILE" || { echo "$FILE has uncommitted changes" >&2; exit 1; }
git -C "$DEMO" fetch -q origin main
# On any exit: close the browser and put the swapped file back.
trap 'P close >/dev/null 2>&1; git -C "$DEMO" checkout -- "$FILE"' EXIT

# run-code reads files only from under the folder the session was opened in.
cd "$DEMO"
P() { PLAYWRIGHT_MCP_OUTPUT_DIR="$OUT/.cli" playwright-cli -s=hero "$@"; }
shoot() {
  sed -e "s#__OUT__#$OUT#" -e "s#__MODE__#$1#" -e "s#__URL__#$2#" "$HERE/capture.js" > "$OUT/capture.js"
  P run-code --filename .pr-visuals/out/hero/capture.js > "$OUT/capture-$1.log" 2>&1 || true
  grep -A1 "### Result" "$OUT/capture-$1.log" | tail -1 | grep . || { cat "$OUT/capture-$1.log" >&2; return 1; }
}
printf %s '{"browser":{"contextOptions":{"deviceScaleFactor":2}}}' > "$OUT/capture.json"
P open --config="$OUT/capture.json" about:blank >/dev/null
after=$(shoot after "$APP")
git -C "$DEMO" show "origin/main:$FILE" > "$DEMO/$FILE"
before=$(shoot before "$APP")
git -C "$DEMO" checkout -- "$FILE"
github=$(shoot github "$PR_URL")
# run-code prints each result as a JSON string.
jq -n --argjson a "$after" --argjson b "$before" --argjson g "$github" \
  '{after: ($a | fromjson), before: ($b | fromjson), github: ($g | fromjson)}' > "$OUT/stills.json"
git -C "$DEMO" status --short
cat "$OUT/stills.json"
