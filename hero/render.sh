#!/bin/sh
# Renders the README hero frame by frame from the stills capture.sh shot:
#   hero/render.sh <hero dir> [from s] [to s]
# <hero dir> holds app-after.png, app-before.png, github.png, stills.json and the PR's demo.webm.
# Output: <hero dir>/hero.mp4 (60 fps). A from/to range renders only that
# part, for checking, into hero-part.mp4.
set -eu
DIR=$(cd "$1" && pwd); FROM=${2:-0}; TO=${3:-9999}; FPS=60
MP4=$DIR/hero-part.mp4
if [ "$FROM" = 0 ] && [ "$TO" = 9999 ]; then MP4=$DIR/hero.mp4; fi
HERE=$(cd "$(dirname "$0")" && pwd)
for f in app-after.png app-before.png github.png stills.json demo.webm; do
  [ -f "$DIR/$f" ] || { echo "missing $DIR/$f" >&2; exit 1; }
done

# Every frame a keyframe: the stage seeks the video once per frame, and a seek in a screencast
# (a keyframe every 5 s) decodes up to 128 frames.
[ -n "$(find "$DIR" -maxdepth 1 -name stage-video.webm -newer "$DIR/demo.webm")" ] ||
  ffmpeg -v error -y -i "$DIR/demo.webm" -c:v libvpx -g 1 -crf 4 -b:v 20M "$DIR/stage-video.webm"
STILLS=$(jq -c . "$DIR/stills.json")
awk -v s="$STILLS" '{ sub(/__STILLS__/, s) } 1' "$HERE/stage.html" > "$DIR/stage.html"
rm -rf "$DIR/frames"; mkdir -p "$DIR/frames"
sed -e "s#__STAGE__#file://$DIR/stage.html#" -e "s#__FRAMES__#$DIR/frames#" \
  -e "s#__FPS__#$FPS#" -e "s#__FROM__#$FROM#" -e "s#__TO__#$TO#" "$HERE/render.js" > "$DIR/render.js"

# run-code reads files only from under the folder the session was opened in.
cd "$DIR"
P() { PLAYWRIGHT_MCP_OUTPUT_DIR="$DIR/.cli" playwright-cli -s=hero-render "$@"; }
P open about:blank >/dev/null
P run-code --filename render.js > render.log 2>&1 || true
P close >/dev/null
grep -A1 "### Result" render.log | tail -1 | grep . || { cat render.log >&2; exit 1; }

START=$(awk -v f="$FROM" -v r=$FPS 'BEGIN { printf "%d", f * r + 0.5 }')
ffmpeg -v error -y -framerate $FPS -start_number "$START" -i "$DIR/frames/%05d.jpg" \
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart "$MP4"
ls -l "$MP4"
