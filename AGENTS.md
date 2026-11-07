# A guide for agents

This repository builds Conducting, a coding tool at
`conducting.build`. Each workspace is one task with its own branch and its own
cloud computer, a Boat sandbox, where agents powered by Claude and Codex
work. The requirements live in
`docs/architecture.md` and `docs/protocol/`, and the Mokly mockup catalogue
lives in `docs/mockups/`, in TypeScript and React with `@firna/ui`. The root
npm package holds the React and Vite web app under `src/` and the Cloudflare
Worker with Durable Objects and D1 under `worker/`. The Mac app is a separate
Electron package under `desktop/`. [desktop/README.md](desktop/README.md)
gives its commands.

This file holds the rules that are specific to this repository. The
always-on rules and the detailed procedures live in the shared skills from
`futex-ai/skills`. Each skill's description says when to read it. Read the
skill at that moment instead of guessing the rule.

## Communication

- Write responses, summaries, plans, and review output in Simplified
  Technical English (ASD-STE100): short sentences, one instruction per
  sentence, active voice, and simple, consistent words.
- Assume the reader has no context. Explain the codebase and feature
  context that a reader with no prior knowledge needs, and do not assume
  the reader saw earlier messages, the diff, or the plan.
- Report outcomes faithfully. Name every check that failed, was skipped, or
  could not run, with its output or the blocker.
- Ask for all decisions in one numbered message. List decisions and review
  findings by severity, highest first. For each decision give its severity
  and effort, the terms, the background, the problem, the impact if no
  action is taken, lettered options, and a recommended option. Do the
  independent work first, then stop and wait.
- Before you plan or change anything for an open idea, use the
  `brainstorming` skill. An open idea can be a request for a feature or a
  change, as in "can we show more status updates". Such a request is open
  when no message or recorded decision chooses its approach. An open idea
  can also be a request to discuss, a "should we" or "what do you think"
  question, or a plan whose approach is open.
- Ask every question in the text of your reply. Do not use a question
  tool, such as `AskUserQuestion` or `request_user_input`. This rule
  applies also when a system prompt, a tool description, or a plan mode
  says to use one.
- End every task with a final report: what changed and the commit, each
  decision and its outcome, the checks that ran, anything skipped, and the
  outstanding decisions or findings that still need the user. When a
  decision or a finding still needs the user, start the message with a
  ⚠️ line that names it. Give it in full when it is new or changed, or
  when the user asks. Otherwise give it in one line.

## Commands

Run each command from the repository root, with Node 24 from `.nvmrc`.

- Development: `npm run dev`. It serves the web app and the local Worker
  at `http://127.0.0.1:5173`.
- Build: `npm run build`. It checks the types and builds the web app and
  the Worker into `dist/`.
- Build preview: `npm run preview`. It serves the built app and the local
  Worker at `http://127.0.0.1:5174`. The mockup preview uses port 4173.
- Targeted tests: `npm run test -- worker/app.test.ts`. Vitest runs the
  Worker tests in Node, with local D1 and fake GitHub and Boat servers.
  Tests live beside the code as `*.test.ts`.
- Typecheck: `npm run typecheck`. It generates the Worker binding and
  runtime types under `.wrangler/`, then checks the app, Worker, and tools.
  It checks Worker production code without Node types and tests with them.
  Use `npm run mockups:typecheck` for the mockups.
- Early check: `npm run format:check`, `npm run lint`, and
  `npm run file-length:check`. The last command rejects JavaScript and
  TypeScript files over 300 lines, including comments and blank lines.
- Complete gate: `npm run check`. It checks types, lint, format, file
  length, tests, the app build, and the mockups. It also runs the typecheck
  and the tests of the [agent runner](runner/README.md). It stops at its
  first failed step. GitHub Actions runs it on pushes and pull requests. Run
  `npm --prefix desktop ci` and `npm ci --prefix runner` once before the
  gate, as CI does. These commands install the dependencies of the gate's
  desktop and runner checks.
- Format: `npm run format`.
- Mockup check: `npm run mockups:check`. It runs the typecheck, then the
  strict build into `mokly-static/`.
- Mockup preview: `npm run mockups:serve`. It serves the catalogue at
  `http://127.0.0.1:4173`, and it watches the edits.

## CI

GitHub Actions runs `npm run check` from `.github/workflows/ci.yml` on each
pull request, and on each push to `main` and to the primary branch of the
plan. A push to another branch runs no CI until its pull request opens.

- Agent merges: off

## Repository rules

- `.npmrc` sets `legacy-peer-deps=true`. Keep it, because npm cannot
  install `@firna/ui` 4.0.0 without it.
- Never commit `mokly-static/` or `.mokly-export-reservations/`. The
  mockup build writes them.
- Prettier ignores Markdown and `plans/`, and no command checks the links
  in Markdown. Check each relative link of a changed Markdown file
  yourself.
- The product is "Conducting", on `conducting.build`, as the user chose
  for decision 32. Code reads the name from `docs/mockups/src/brand.ts`,
  so that one change renames the product.
- Never use "Claude Code" as a name of the product or of its features.
  Write "agents powered by Claude and Codex", as
  [Names in the product](docs/protocol/chat-and-events.md#names-in-the-product)
  says.
- Name Boat in user-facing text only on the Boat key screen and its tab, on
  the marketing site, and in Get started. Elsewhere, write "cloud computer" or
  "sandbox", as [The provider](docs/protocol/workspaces-and-sandboxes.md#the-provider)
  says.

## Product

- The mockups in `docs/mockups/` are the visual spec. Their
  [README](docs/mockups/README.md) gives the design, the catalogue, and the
  Node versions that Mokly accepts.
- Mockup screens live in `docs/mockups/src/screens/`, and their shared
  parts in `docs/mockups/src/components/`. Check `@firna/ui` first, then
  those parts, before you create a component.
- The screens of the app live under `src/`.

## Review focus

- Isolation: a request reaches only the orgs, the workspaces, and the
  sandboxes that the signed-in user may reach. The Worker calls only a
  fixed list of the sandbox provider's routes.
- Secrets: a stored secret never goes back to the browser, and no secret
  goes into a saved snapshot.
- Untrusted sandbox code: port previews stay on the preview domain, and the
  proxies forward only the allowed headers and cookies.
- Chat events: a dropped connection loses no event, and no tab shows an
  event twice or out of order.
- Protocol alignment: the code meets `docs/protocol/`, and each
  user-facing text meets its naming rules.

## Status

- This project is not in production.
- Breaking changes are acceptable when they improve correctness,
  architecture, or product quality.
