# Conductive

Conductive is a coding tool at `conductive.build`, in the browser and in a
Mac app. Each workspace has its own cloud computer, where agents powered by
Claude and Codex work, and one branch at a time. It can hold one task after
another. The agents run only in the cloud. It replaces Conductor Cloud,
which shuts down on 20 November 2026.

## Status

Today the repository holds:

- the [architecture doc](docs/architecture.md) and the
  [protocol docs](docs/architecture/protocol-docs.md), which state the
  requirements
- the [mockup catalogue](docs/mockups/README.md), which draws every screen
  at phone and desktop sizes
- the app package, with tests against fake GitHub, Boat, and E2B servers and
  local D1 storage, and the complete gate, which GitHub Actions runs
- the Mac app in `desktop/`, with signed packages and update support, as
  [Mac app](#mac-app) says

A test deployment runs at `conductive.build`. Each push to `main` deploys
it, as [Automatic deploys](docs/automatic-deploys.md) says. The project is
not in production yet. [Deployment inputs](docs/deployment.md) lists what a
deployment needs.

## Features

Conductive has these features. The protocol docs state each one. A
feature that is not complete yet says so.

- Sign in with GitHub. The product is free until billing starts.
  [Pricing](docs/protocol/pricing.md) states the coming plans, which the
  pricing page of the marketing site shows. Billing is not built yet.
- A waitlist. A new account waits until an operator approves it, or an
  invite code, a referral code, or an org invitation lets the person in.
  An operator can turn the waitlist off. Each new person then gets in at
  once, unless sign-ups are paused.
- Every cloud computer runs in an account of the app with a sandbox
  provider, Boat or E2B, so users need no provider account. Each org keeps
  one provider account for its whole life.
- A new workspace starts as an empty chat. The first message creates it,
  with its own cloud computer and branch.
- Chat with agents powered by Claude and Codex. A workspace holds several
  sessions, and one picker sets the model and the effort.
- Send a message during a turn, or stop the turn.
- Attach files of up to 25 MB each to a message.
- Each user connects their own Claude subscription token, ChatGPT plan
  through device code sign-in, or API keys.
- Files and Changes, a terminal, and port previews. The live desktop is
  hidden for now, as [Desktop](docs/protocol/workspace-tools.md#desktop)
  says.
- A pull request bar with the GitHub state of the branch and its checks.
  It sends the agent fixed requests, such as Create PR and Fix
  checks, and merges as the member. After the merge, Continue moves the
  workspace to a new branch, with the same cloud computer and sessions.
- One prepared cloud computer image for each org, built from an install
  script, with a startup script and env vars.
- Agents can create workspaces and sessions. They can read chats and
  message sessions across the org.
- Routines run a saved prompt on a schedule or on a pull request event,
  each time in a new workspace.
- Each workspace has a number, such as `W-395`. A press on the number in
  the header copies the link of the workspace. A workspace link in chat
  shows as a chip with the number and the name.
- Orgs with members, sections, reassignment, Archive, and Delete org.
- A menu on a workspace row moves, reassigns, renames, or archives the
  workspace.
- A command palette, on ⌘K or Ctrl+K, finds the workspaces of the org,
  runs the actions of the page, and opens the settings.
- Keyboard shortcuts, which each person can change on the Account page.
- Send feedback from the command palette, with screenshots. The team gets
  each message by email, and replies to the primary verified GitHub email.
- The web app works on phones and on desktops.
- A Mac app for macOS, with the native window buttons in its own top bar.
  An agent can ask to run a command on the Mac of the person who sent its
  turn. Published packages update themselves from GitHub releases.

## What a user needs

- a GitHub account
- a login for Claude, Codex, or both:
  - Claude: a Claude subscription token or an Anthropic API key
  - Codex: a ChatGPT plan with device code sign-in enabled, or an OpenAI API key

## Get started

The [Run it](src/app/README.md#run-it) section of the web app README says
how the app runs in development and in the production build.

1. Install Node 24, as `.nvmrc` says. The
   [mockups README](docs/mockups/README.md#commands) lists the Node
   versions that Mokly refuses.
2. Run `npm install`. The `.npmrc` file sets `legacy-peer-deps`, which
   `@firna/ui` needs. Then run `npm --prefix desktop ci` for the Mac shell's
   check dependencies. Run `npm ci --prefix runner` for the check
   dependencies of the [agent runner](runner/README.md).
3. Run `npm run db:migrate` to create the local D1 tables.
4. Run `npm run dev`, and open `http://127.0.0.1:5173`.
5. Open `http://127.0.0.1:5173/api/health` to check the Worker. It returns
   `{"status":"ok"}`.
6. Run `npm run check` before you submit a change.

Local development needs no Cloudflare account and no E2B account, and it
deploys nothing. Put local secrets in `.dev.vars`, which Git ignores.
[Local development](docs/local-development.md) gives the local storage,
the app origin, the values of GitHub sign-in and of the cloud computers,
and the production values of `wrangler.jsonc`. Automated tests use fakes
and need no credentials.

Worker types come from `wrangler.jsonc`. The type check generates them
under `.wrangler/`, which Git also ignores.

| Command                     | What it does                                                   |
| --------------------------- | -------------------------------------------------------------- |
| `npm run dev`               | Build the marketing site, then serve the web app and the local Worker |
| `npm run build`             | Check types, build the marketing site into `public/_site/`, then build the web app and Worker into `dist/` |
| `npm run preview`           | Serve the built app and local Worker at port 5174              |
| `npm run typecheck`         | Generate types and check app, tools, Worker production, Worker tests, and the Astro files of the marketing site |
| `npm run test`              | Run the Vitest tests                                           |
| `npm run db:migrate`        | Apply the D1 migrations to local storage                       |
| `npm run file-length:check` | Check the 300-line limit of JavaScript, TypeScript, and Astro files |
| `npm run site:dev`          | Serve the marketing site from Astro at `http://localhost:4321`, and reload on edits |
| `npm run site:build`        | Build the marketing site into `public/_site/`, with its file list |
| `npm run check`             | Run every check, including the app build, the mockup checks, and the runner checks |
| `npm run mockups:serve`     | Serve the catalogue at `http://127.0.0.1:4173`, and watch edits |
| `npm run mockups:check`     | Check mockup types, then build the catalogue in strict mode     |
| `npm run lint`              | Run ESLint                                                     |
| `npm run format:check`      | Check formatting with Prettier                                 |
| `npm run format`            | Format the files with Prettier                                 |

GitHub Actions uses `.nvmrc`. It installs with `npm ci`,
`npm --prefix desktop ci`, and `npm ci --prefix runner`. Then it runs
`npm run check` on pull requests, and on pushes to `main` and to the primary
branch of the plan. CI does not deploy. The `Deploy` workflow deploys each
push to `main`, as [Automatic deploys](docs/automatic-deploys.md) says. It
does not wait for CI.

## Mac app

The Mac app is an Electron shell for macOS, on Apple silicon and Intel
Macs. It bundles the built web app, shows it in its own window, and calls
the same Worker. The agents still run only in the cloud. The shell has these
features:

- It shows the shared web app screens. The window has no title bar of its
  own. The native window buttons sit at the top left of the app's left
  panel. The sidebar toggle, Back, and Forward share that bar. The top bars
  move the window, and their controls do not. Full screen gives back the
  space of the window buttons.
- The Worker routes the browser-to-app GitHub sign-in handoff. The Mac
  workflow builds and tests desktop changes on Apple silicon and Intel.
- Pull request and local builds have an ad-hoc signature. Release builds
  have a Developer ID signature, and Apple notarizes them.
- Each merge of the release pull request publishes a GitHub release of
  this repository with the signed Mac app. The published builds update
  themselves from later releases.

[Mac app](docs/protocol/desktop-app.md) states the requirements.
[desktop/README.md](desktop/README.md) gives the commands, and
[desktop/RELEASES.md](desktop/RELEASES.md#releases) gives the release steps.

## Key code

- `docs/mockups/src/entries/`: the Mokly entries of the screens, and the
  user flows.
- `docs/mockups/src/screens/`: one React component for each screen.
- `docs/mockups/src/components/`: the parts that the screens share.
- `docs/mockups/src/fixtures/`: the sample data of the screens.
- `docs/mockups/src/brand.ts`: the product name, which every screen reads, and the GitHub repository of the releases.
- `mokly.config.json`: the Mokly configuration.

- `worker/app.ts`: the Worker's HTTP entry point.
- `worker/marketing/`: built marketing pages, the agreement page before
  GitHub, the file list, request markers, and the site's security headers.
- `src/marketing/`: Astro pages, layouts, parts, styles, pictures, shared
  legal text, the public guides, the shared rows and words of the
  Conductor comparison page, and the shared plans and words of the pricing
  page. Its [README](src/marketing/README.md) gives the build and preview
  steps.
- `src/shared/site-build.ts`: names and types shared by the Astro build
  and the Worker.
- `worker/security/`: GitHub sign-in, signed sessions, the request gate,
  the app origin of each request, the Mac app's sign-in handoff and origin
  rules, and the shared content security policy of the web app and the Mac
  app.
- `worker/data/`: D1 queries for users, orgs, and sessions.
- `worker/sandbox/`: the provider accounts, the lookup of the client of each
  account, and the typed client of each provider kind. The `boat` account
  uses the app's Boat key. Each other account, such as `e2b`, comes from
  `SANDBOX_PROVIDER_ACCOUNTS`.
- `src/app/`: the data of the web app, such as the typed API client, the
  models that the screens read, the router, and the event stream. Its
  [README](src/app/README.md) gives the rules and the key code of the
  web app.
- `src/shell/`: the screens of the app shell, such as the workspace list,
  the workspace screen, Get started, and the settings. The
  [web app README](src/app/README.md) also gives their rules and their
  key code.
- `src/shared/`: the browser API contracts, route paths, and runner message types.
- `src/test-support/`: the fake API, recorded chat and file events, and terminal fake.
- `worker/test-support/`: local D1, fake GitHub, Boat, and E2B servers, and runner fakes.
- `migrations/`: the D1 schema migrations.
- `desktop/`: the Mac app, an Electron package of its own. Its
  [README](desktop/README.md) gives its key code.

The web app lives under `src/`, and the Cloudflare Worker under `worker/`.

## Docs

- [Architecture](docs/architecture.md): the
  [components](docs/architecture/components.md), the hostnames, the
  [flows](docs/architecture/flows.md), the
  [marketing site](docs/architecture/marketing-site.md), the
  [data and trust boundaries](docs/architecture/data-and-trust.md), and the
  terms.
- [Protocol docs](docs/architecture/protocol-docs.md), which state the
  requirements. That page of the architecture docs lists each one, with
  what it covers.
- [Mockups](docs/mockups/README.md): the design and the catalogue.
- [Third-party notices](THIRD_PARTY_NOTICES.md): licenses for copied icons
  and the bundled font.
- [AGENTS.md](AGENTS.md): the rules for agents in this repository.
