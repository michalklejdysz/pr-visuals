# PR visuals

Read by the `pr-screenshots` and `pr-demo-video` skills. This file is committed, so keep secrets
out of it: only local or seeded demo accounts belong here.

## App

- URL: http://localhost:5173
- Who starts it: the user (the agent asks instead of starting it) | the agent, with `pnpm dev`
- Before capturing: none (e.g. switch the UI language to English, dismiss the cookie banner)

## Demo accounts

Local or seeded accounts only, never a real user or an admin with production data.

| Role | Login | Password | Where it comes from |
| --- | --- | --- | --- |
| user | demo@example.com | demo1234 | `pnpm db:seed` |

Login steps: open `/login`, fill the email and password fields, submit.

## Capture

- Tool: playwright-cli
- Viewport: 1440x900
- PR layout: table (the agent stacks shots wider than about 1200 px instead)
- Section heading: `## Screenshots`
- Accent colour for video callouts: #4f46e5

## Backend changes (optional)

How to show the "before" state when the change is in the API or the data, e.g. a command that
starts the base branch on another port. Without this, the agent writes a throwaway state script.

## Gotchas

Project-specific pitfalls, one line each.
