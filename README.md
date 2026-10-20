<h1 align="center">pr-visuals</h1>

<p align="center">Your coding agent changes a screen. These skills make it put the proof in the PR:<br>before/after screenshots and an annotated demo video.</p>

<p align="center"><a href="https://github.com/michalklejdysz/pr-visuals/actions/workflows/ci.yml"><img src="https://github.com/michalklejdysz/pr-visuals/actions/workflows/ci.yml/badge.svg" alt="CI"></a> <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-lightgrey" alt="MIT license"></a></p>

https://github.com/user-attachments/assets/38a2e586-794d-4757-8c6a-d4558378c9b6

Reviewers shouldn't have to check out the branch to see what changed. Two skills:

- **`pr-screenshots`**: matched before/after pairs, in a table in the PR body.
- **`pr-demo-video`**: an annotated walkthrough (the ticket, a spotlight on what changed, numbered
  callouts) as an MP4 that plays inline on GitHub.

## Example artifacts

Everything below comes from a real PR, untouched:
[michalklejdysz/shadcn-admin#1](https://github.com/michalklejdysz/shadcn-admin/pull/1).

**`pr-screenshots`**: the agent shot the app, swapped the changed file back to `main` and shot it
again.

| Theme | Before | After |
| --- | --- | --- |
| Light | ![before, light](https://github.com/user-attachments/assets/27741e38-dd3c-4586-8a6b-4f8c7a4471ec) | ![after, light](https://github.com/user-attachments/assets/3e965f8b-af00-4876-a6e5-85a6db58cfc3) |
| Dark | ![before, dark](https://github.com/user-attachments/assets/afafc8f6-fa8e-4911-b6f2-083ce5c3812a) | ![after, dark](https://github.com/user-attachments/assets/39c2d29b-24c8-4416-99e7-5c8ef931b9f9) |

**`pr-demo-video`**: the ticket, a spotlight on the changed card, then callouts.

https://github.com/user-attachments/assets/f86922be-f1e8-44f0-ba5a-355c083f9a6e

## How the "before" works

The agent takes the "after" shot first. Then it puts only the changed files back to their
base-branch version with `git show origin/main:<file> > <file>`, waits for the dev server to
hot-reload, and shoots the same page again. Then it restores the files and checks `git status`.

So both shots share the data, the account, the URL and the viewport. The only difference is
the code in the diff. No second checkout, no second dev server.

When the change lives in the API or the data, a frontend swap can't show the old state. The
agent then uses the base-branch command from your config, or a throwaway script that puts a
record into its old and new shape in your local database.

## Install

Any agent that reads `SKILL.md` (Claude Code, Codex, Cursor and others):

```bash
npx skills add michalklejdysz/pr-visuals
```

You also need:

- `gh` 2.99 or later, for `--attach` (`gh --version`)
- for videos: [playwright-cli](https://www.npmjs.com/package/@playwright/cli)
  (`npm i -g @playwright/cli`) and `ffmpeg`
- for screenshots: playwright-cli, or any browser tool your agent has that saves a PNG
  (Claude in Chrome, Chrome DevTools MCP)

**Tested on:** Claude Code 2.1 with Opus 5.5, playwright-cli 0.1.8, gh 2.102, ffmpeg 7.1,
macOS 27, on a Vite + React app.

## First run

The first time a skill runs in a repo, the agent looks around (installed tools, dev server URL,
seed accounts), proposes a config in one message and writes `.pr-visuals/config.md` once you
agree. Commit that file. Everything the skills produce goes to `.pr-visuals/out/`, which
`.pr-visuals/.gitignore` keeps out of git, so your own `.gitignore` stays untouched.

**Use a demo account.** Shots and videos end up in a PR. The agent logs in only with a local or
seeded account whose data can be public, and asks you to create one if there isn't any.

## Make it a habit

Paste this into your `CLAUDE.md` or `AGENTS.md`, so the agent does it without being asked:

```markdown
- PRs that change what the UI shows (including API changes that surface there) need a
  `## Screenshots` section: before/after pairs for changed screens, just "after" for new ones.
  Use the `pr-screenshots` skill. For a new flow or anything that moves, add a demo with
  `pr-demo-video`.
```

## If the agent skips it anyway

A rule in `CLAUDE.md` is a strong hint, not a guarantee. If PRs still go out without shots, a
Claude Code hook can stop `gh pr create` when UI files changed and nothing is attached.

`.claude/hooks/pr-visuals.sh` (set `UI_PATHS` to your frontend folders, then `chmod +x` it):

```sh
#!/bin/sh
# Blocks `gh pr create` without attachments when the branch touches UI files.
UI_PATHS='^(src/components|src/pages|app/)'
cmd=$(jq -r '.tool_input.command // ""')
case "$cmd" in *"gh pr create"*) ;; *) exit 0 ;; esac
case "$cmd" in *--attach*|*"pr-visuals: skip"*) exit 0 ;; esac
git diff --name-only origin/HEAD...HEAD | grep -qE "$UI_PATHS" || exit 0
echo "This branch changes UI files. Add before/after shots with the pr-screenshots skill, or add the comment '# pr-visuals: skip' to the command and say why in the PR." >&2
exit 2
```

`.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": ".claude/hooks/pr-visuals.sh" }]
      }
    ]
  }
}
```

Exit code 2 sends the message back to the agent, which then takes the shots and retries.

Other common problems:

- **The video has a grey band at the bottom.** Record in a headed browser (`playwright-cli open --headed`);
  headless screencasts lose the bottom ~10% of the page.
- **`--attach` is an unknown flag.** Update gh to 2.99 or later.
- **The "before" shot shows a build error.** The agent swapped a file whose old version doesn't
  fit the new code around it (a new import, a changed type). It should swap a smaller set, or
  the parent component instead.
- **Not on GitHub.** The files stay in `.pr-visuals/out/<branch>/`, and the agent gives you the
  markdown to paste.

## License

MIT
