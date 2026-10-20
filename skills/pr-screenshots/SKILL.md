---
name: pr-screenshots
description: Capture matched before/after screenshots of a UI change in the running web app and attach them to the branch's GitHub PR. The "before" comes from swapping the changed files back to the base branch while the dev server hot-reloads, so both shots share the same data, URL, login and viewport. Use when a PR changes what a screen shows, or when asked for screenshots, before/after shots or visuals for a PR.
---

# PR screenshots

Before/after pairs that differ only by the code in the diff. The trick: take the "after" shot,
put the changed files back to their base-branch version, let the dev server hot-reload, take the
"before" shot of the same page, then restore the files.

## 0. Config

Read `.pr-visuals/config.md` at the repo root. If it's missing, set it up once:

1. Detect what's available instead of asking: `which playwright-cli`, the browser tools you have
   (Claude in Chrome, Chrome DevTools MCP, others), the dev command in `package.json`, the dev
   server port, and any seed script or seeded accounts in the repo.
2. Propose a config in one message and let the user correct it, e.g. "playwright-cli is
   installed, so I'll use it at 1440x900 against http://localhost:5173, logging in as the seeded
   demo@example.com. OK?" Any tool that saves a PNG works; playwright-cli is the default because
   scripted shots repeat exactly.
3. Explain the demo account: screenshots end up in a PR, so log in only with a local or seeded
   account whose data can be public. If there isn't one, ask the user to create it (or offer to
   add it to the seed) rather than using their own account.
4. Write `.pr-visuals/config.md` from [config-template.md](config-template.md), and
   `.pr-visuals/.gitignore` containing `out/`. Commit the config with the rest of the work.

Artifacts go to `.pr-visuals/out/<branch>/` (gitignored by the file above). Run browser commands
from the repo root: playwright-cli only reads scripts from under the directory it was opened in.

## 1. Plan the shots

From the diff and the task, list the screens and states the change affects: a page, an open
dialog, a hover state, an error state. One pair per state. New screens get only an "after".

## 2. Prepare the state

Create the data the screens need the normal way (the UI or the real backend), logged in as the
demo account. Note the exact URL and the steps that reach each state.

## 3. After

With the branch code running, capture each state at the config viewport. Name files
`after-<state>.png`. Look at each one before moving on: a dev-server error overlay, a spinner or
a half-finished animation means a retake.

```bash
# Keeps playwright-cli logs in .pr-visuals/out/ instead of a .playwright-cli/ folder in the repo.
P() { PLAYWRIGHT_MCP_OUTPUT_DIR="$PWD/.pr-visuals/out/.cli" playwright-cli -s=shots "$@"; }
# Twice the pixel density, so shots stay sharp in a PR and in a README. Viewport from the config.
mkdir -p .pr-visuals/out && printf %s '{"browser":{"contextOptions":{"viewport":{"width":1440,"height":900},"deviceScaleFactor":2}}}' > .pr-visuals/out/shots.json
P open --config=.pr-visuals/out/shots.json "<url>"
P goto "<url of the state>"
P screenshot --filename=.pr-visuals/out/<branch>/after-<state>.png
```

For a crop of one component, `run-code` with `page.screenshot({ path, clip })` around its
`boundingBox()` plus about 16 px of padding.

## 4. Before: swap, reload, capture

1. Find the base: `gh pr view --json baseRefName -q .baseRefName`, or the remote default branch
   (`git symbolic-ref --short refs/remotes/origin/HEAD`). Run `git fetch origin <base>`.
2. Pick the files to swap: the changed frontend files that render this state, from
   `git diff --name-only origin/<base>...HEAD`. Swap the smallest set that brings back the old
   UI. Swapping unrelated files (new imports, changed types) can break the build.
3. **Each file you swap must have no uncommitted changes**, or restoring it would wipe them.
   Check with `git diff --quiet HEAD -- <files>`. If it fails, commit first (a WIP commit is
   fine) or stop and ask.
4. Swap: `git show origin/<base>:<file> > <file>` for each file. A file that is new on the
   branch has no base version; leave it, and swap the file that imports it instead.
5. Wait for the hot reload, then reload the page and repeat the exact steps from section 2.
   Capture `before-<state>.png` at the same viewport, scroll position and zoom as the "after".
6. **Restore, always, even if a capture failed:** `git checkout -- <files>`. Then `git status`
   must show the working tree as it was before the swap. Reload once more and check the page
   shows the "after" UI again.

### When swapping files isn't enough

If the change is in the API, the database or generated data, a frontend swap can't show the old
state. In order of preference:

- **Config says how:** use the "Backend changes" section of `.pr-visuals/config.md`, e.g. a
  command that runs the base branch on another port.
- **Throwaway state script:** write a script under `.pr-visuals/out/<branch>/` that puts the
  same record into its old and new shape (`node state.mjs before` / `after`) against the local
  dev database only, capture each, then delete the script. Never point it at a shared or remote
  database.
- **Can't reproduce:** say so in the PR ("before: not reproducible locally, see the issue") and
  attach only the "after".

## 5. Attach to the PR

GitHub only, and `gh` 2.99 or later (`gh --version`). `--attach` uploads each file and rewrites
`![alt](./file.png)` references in the body to the uploaded URL.

Write the section into the PR body file, using the layout from the config:

```markdown
## Screenshots

| State | Before | After |
| --- | --- | --- |
| Settings, saved | ![before](./before-saved.png) | ![after](./after-saved.png) |
```

Use stacked pairs (`**Before**` / image / `**After**` / image) instead of a table when the shots
are wider than about 1200 px or when there's only one pair, so GitHub doesn't shrink them.
If the repo has a PR template, keep its section names and put the shots in its screenshots
section.

Run gh from the folder that holds the PNGs, so the relative paths resolve:

```bash
cd .pr-visuals/out/<branch>
gh pr view --json number -q .number          # is there a PR already?
gh pr create --title "..." --body-file pr.md --attach ./before-saved.png --attach ./after-saved.png
gh pr edit <n> --body-file pr.md --attach ./before-saved.png --attach ./after-saved.png
```

In a fork, pass `-R <owner>/<repo>` (and `--base`) to every gh command, or gh targets the
upstream repository.

Then check the result: `gh pr view <n> --json body -q .body` must contain
`github.com/user-attachments/` URLs and no `./` paths left.

If the user said not to touch the PR, or there's no GitHub remote or a new enough gh, keep the
files in `.pr-visuals/out/<branch>/` and hand over their paths plus the markdown above.

## Rules

- Only the diff differs between a pair: same data, account, URL, viewport, theme and language.
- Crop or zoom to the area that changed when the page is large; the reader should see the
  difference without hunting for it. Use the same crop for both shots of a pair.
- No real personal data in a shot. If it appears, retake with demo data.
- Never commit anything under `.pr-visuals/out/`.
