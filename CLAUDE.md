# Working on pr-visuals itself

- Everything users get is in `skills/`: the two skills (`skills/*/SKILL.md`) and their templates. Users install them with `npx skills add`, which copies only the skill folders, so repo-only files (README, `hero/`, CI) never reach them. There is no Claude Code plugin on purpose.
- Skills must work in any agent that reads `SKILL.md` (Claude Code, Codex, Cursor), not only Claude Code: no Claude-only tools in the required steps.
- Before pushing: `npx skills add . --list` must list both skills, `node --check` on every `.js`, and `uvx --from shellcheck-py shellcheck hero/*.sh`. CI (`.github/workflows/ci.yml`) runs the same.
- `demo-template.js` overlays animate only `opacity` and `transform`. The screencast drops frames whenever Chrome repaints (animated size, shadow or `backdrop-filter`), and the video stutters.
- Releasing: `gh release create vX.Y.Z` with two or three lines on what changed for users.

## The README hero

Made from the demo repo, a clone of the fork `michalklejdysz/shadcn-admin` on the `feat/dash-12-revenue-trend` branch with its dev server on :5173, and its PR #1 (screenshots and video made by the skills themselves):

1. `hero/capture.sh <demo repo> <PR url>` shoots the real stills at 2x: the app after the change, the app with the changed file swapped back to `main`, and the logged-out PR page.
2. Copy the PR's `demo.webm` into `<demo repo>/.pr-visuals/out/hero/`.
3. `hero/render.sh <that folder> [from] [to]` renders `stage.html` frame by frame at 60 fps into `hero.mp4`. Pass a range to check one part (into `hero-part.mp4`).
4. Upload `hero.mp4` with `gh issue comment 1 -R michalklejdysz/pr-visuals --body "New render" --attach ./hero.mp4` (issue #1 hosts the hero video) and put the new `user-attachments` URL at the top of the README: GitHub plays only those URLs inline, and never a video from the repo. Timing lives in `stage.html`: every element has keys `[[time, value]]`, and `seek(t)` sets them all, so nothing depends on how fast Chrome paints.
