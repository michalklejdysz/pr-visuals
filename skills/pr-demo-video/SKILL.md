---
name: pr-demo-video
description: Record a short annotated demo video of a UI change in the running web app (chapter cards, numbered callouts with arrows, MP4 output) with playwright-cli, and attach it to the branch's GitHub PR. Use when asked to record a demo, a video, a screencast or a walkthrough of a feature or fix.
---

# PR demo video

A scripted walkthrough recorded with playwright-cli's `page.screencast`, from
[demo-template.js](demo-template.js): chapter cards between scenes and numbered callouts that
point at what changed. Recorded as WebM, delivered as MP4.

Needs `playwright-cli` (`npm i -g @playwright/cli`) and `ffmpeg`. Other browser tools can't
draw the overlays; if the user only wants a quick GIF, use their browser tool's GIF recorder
instead and skip this skill.

## 0. Config

Read `.pr-visuals/config.md` at the repo root for the app URL, demo account, viewport and accent
colour. If it's missing, set it up first from [config-template.md](config-template.md):
detect playwright-cli, the dev server URL and seeded accounts, propose the values in one message,
explain that only a local or seeded demo account may appear in a video that ends up in a PR,
then write `.pr-visuals/config.md` and `.pr-visuals/.gitignore` (containing `out/`).

Everything for this video lives in `.pr-visuals/out/<branch>/`. Run every playwright-cli command
from the repo root: `run-code` only reads files from under the directory the session was opened in.

## 1. Plan

**Start from the ticket when there is one.** Read it (`gh issue view <n>`, the Jira or Linear
tool you have, or the text the user pasted) and take its id, title and acceptance criteria. The
video then proves the ticket, for a reviewer who is already on the PR:

1. `showTicket(ticket, { reveal: component })`: the criteria over the blurred app, then a
   spotlight on the changed component, so "what changed?" is answered before any callout.
   Spotlight a whole card or panel, not a single word. (Without a ticket, `reveal(component)`.)
2. One `callout` per criterion the UI can show, numbered like the criteria. Use `clickPulse` for
   clicks, because the recording shows no cursor.
3. `showTicket(ticket, { done: true })`: every criterion ticked.

Add `showChapter` cards only with more than three criteria or more than one screen. Keep the
video to what the reviewer needs: no intros, terminals or branding. Shorten long criteria to one
line each without changing their meaning, and leave out internal links, names and anything that
shouldn't be in a public PR. A criterion the UI can't show (performance, logging) stays on the
card but gets no scene; say so in the PR text.

Without a ticket, write the story yourself: one scene per thing the viewer should notice, each
one sentence ("open the invoice, the new status badge shows Overdue"), and open on a chapter
card that says what changed.

The change sets the length: a renamed label is one scene and ten seconds, a new multi-step flow
can take a few minutes. Show each step once, at reading speed, and cut anything the change
doesn't touch. Prepare the data the scenes need the normal way, logged in as the demo account,
and note each URL.

## 2. Open, log in, warm up

```bash
# Keeps playwright-cli logs in .pr-visuals/out/ instead of a .playwright-cli/ folder in the repo.
P() { PLAYWRIGHT_MCP_OUTPUT_DIR="$PWD/.pr-visuals/out/.cli" playwright-cli -s=demo "$@"; }
# Chrome slows down a window the user isn't looking at; these flags keep the recording at full speed.
mkdir -p .pr-visuals/out && printf %s '{"browser":{"launchOptions":{"headless":false,"args":["--disable-backgrounding-occluded-windows","--disable-renderer-backgrounding","--disable-background-timer-throttling"]}}}' > .pr-visuals/out/record.json
P open --headed --config=.pr-visuals/out/record.json "<app url>/login"   # headed: headless recordings lose the bottom ~10% to a grey band
P resize 1440 900
P fill "getByLabel('Email')" "demo@example.com"
P fill "getByLabel('Password')" "demo1234" --submit
P goto "<each demo url>"      # once each: a cold dev server can take 20 s, keep that out of the video
P snapshot                    # find locators; prefer getByRole and getByText
```

## 3. Script and record

1. Copy `demo-template.js` to `.pr-visuals/out/<branch>/demo.js`. Set `OUTPUT` to the absolute
   path of `demo.webm` next to it, `START_URL`, `SIZE` from the config viewport and `ACCENT` from
   the config colour.
2. Fill in the scenes: `showChapter` for each scene title, real clicks and typing, and
   `callout(locator, text)` on what changed.
3. Record: `P run-code --filename .pr-visuals/out/<branch>/demo.js`

## 4. Check, then convert

Look at a frame every 4 s before handing anything over. Every ring must sit on the right element
and no card may cover the thing it describes:

```bash
cd .pr-visuals/out/<branch>
ffmpeg -v error -y -i demo.webm -vf fps=1/4,scale=960:-1 frame-%02d.png
```

Fix and re-record until the frames are right, then convert and close the session:

```bash
ffmpeg -v error -y -i demo.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart demo.mp4
cd - >/dev/null && P close
```

## 5. Attach to the PR

GitHub only, `gh` 2.99 or later. `--attach` uploads the MP4 and appends its
`github.com/user-attachments/` URL to the end of the body. It doesn't rewrite a plain path for a
video, so move that URL afterwards. GitHub renders the URL as a player when it sits on its own
line.

```bash
cd .pr-visuals/out/<branch>
gh pr view --json number -q .number                 # is there a PR? With none, use gh pr create --attach
gh pr edit <n> --attach ./demo.mp4                  # uploads; the URL lands at the end of the body
gh pr view <n> --json body -q .body > body.md
URL=$(grep -o 'https://github.com/user-attachments/assets/[A-Za-z0-9-]*' body.md | tail -1)
# Drop the appended URL line and put it under "### Demo" at the end of the screenshots section.
grep -vxF "$URL" body.md | awk -v u="$URL" -v s="## Screenshots" '
  $0 == s { inside = 1 }
  inside && /^## / && $0 != s { print "### Demo\n\n" u "\n"; inside = 0; done = 1 }
  { print }
  END { if (!done) print "\n### Demo\n\n" u }' > body-demo.md
grep -c "$URL" body-demo.md                         # must print 1 before you send it
gh pr edit <n> --body-file body-demo.md             # no --attach here, so nothing uploads twice
```

`### Demo` goes at the end of the screenshots section from the config (`## Screenshots` by
default). If the user said not to touch the PR, or there's no GitHub remote, keep `demo.mp4`
locally and give its path. On macOS it can also go to the clipboard:
`osascript -e 'set the clipboard to (POSIX file "/abs/path/demo.mp4")'`.

## Callouts

- 3–6 words per callout, one short line per chapter description.
- 3 s per callout of up to four words, 3.5 s for five or six (the template's default); viewers
  read slower than the author. Every text stays at least 2.5 s.
- Text sizes live in `TEXT` at the top of the template, sized for GitHub's player, which shows
  the video at about 60 %. Don't shrink them.
- Cards go in empty space. `callout` picks the side of the element with the most room; when that
  still covers something, pass `at: { x, y }`.
- Hover an element before calling out its tooltip. Overlays don't take pointer events, so the
  hover stays.

## Gotchas

- Record in a `--headed` session. In headless mode (playwright-cli 0.1.8 to 0.1.22) the screencast
  keeps only the top ~90% of the viewport and pads the rest with grey. A browser window opens on
  the user's screen while it records; say so before starting.
- The script must be one arrow function with **no trailing `;`**, or `run-code` fails with
  `SyntaxError: Unexpected token ';'`.
- `callout` and `showChapter` already wait for their `duration`; don't add `waitForTimeout` after them.
- Measure after animations: wait about 800 ms after opening or collapsing something before a
  callout, or the ring lands where the element used to be.
- Set the language, theme and dismiss banners before `screencast.start`, so the viewer never sees it.
- The screencast drops frames whenever Chrome has to repaint during an animation. In your own
  overlays animate only `opacity` and `transform`, never size, shadow or `backdrop-filter`.
- Without the flags from step 2, a window behind other windows records at a few frames per
  second, or the frame shrinks.
- QuickTime can't play WebM. Always deliver the MP4.
