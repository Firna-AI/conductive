# Conducting

Conducting is a browser-only coding tool at `conducting.build`. Each
workspace is one task with its own branch and its own cloud computer, where
agents powered by Claude and Codex work. Nothing runs on the user's
computer. It replaces Conductor Cloud, which shuts down on 20 November 2026.

## Status

The web app has a minimal page. The Worker has GitHub sign-in, org records,
and an encrypted Boat key store. Today the repository holds:

- the [architecture doc](docs/architecture.md) and the protocol docs, which
  state the requirements
- the [mockup catalogue](docs/mockups/README.md), which draws every screen
  at phone and desktop sizes
- the app package, with tests against fake GitHub and Boat servers and
  local D1 storage, and the complete gate, which GitHub Actions runs

The app has no deployment yet.

## Features

These features are planned. The protocol docs state each one.

- Sign in with GitHub. The product is free.
- Each org runs on its own Boat account, with a Boat key that an org admin
  adds.
- A new workspace starts as an empty chat. The first message creates it,
  with its own cloud computer and branch.
- Chat with agents powered by Claude and Codex. A workspace holds several
  sessions, and one picker sets the model and the effort.
- Send a message during a turn, or stop the turn.
- Each user connects their own Claude subscription token or API keys.
- Files and Changes, a terminal, port previews, and a live desktop.
- A pull request bar with the GitHub state of the branch and its checks.
- One prepared cloud computer image for each org, built from an install
  script, with a startup script and env vars.
- Agents can create and list workspaces.
- Orgs with members, sections, reassignment, Archive, and Delete org.
- The web app works on phones and on desktops.

## What a user needs

- a GitHub account
- a Boat account, with a key for each org
- a Claude subscription token or an Anthropic API key, or an OpenAI API key
  for Codex

## Get started

The package includes a minimal React app, the Worker core, and the mockup
catalogue. The product screens are not built yet.

1. Install Node 24, as `.nvmrc` says. The
   [mockups README](docs/mockups/README.md#commands) lists the Node
   versions that Mokly refuses.
2. Run `npm install`. The `.npmrc` file sets `legacy-peer-deps`, which
   `@firna/ui` needs.
3. Run `npm run db:migrate` to create the local D1 tables.
4. Run `npm run dev`, and open `http://127.0.0.1:5173`.
5. Open `http://127.0.0.1:5173/api/health` to check the Worker. It returns
   `{"status":"ok"}`.
6. Run `npm run check` before you submit a change.

Local development needs no Cloudflare account. Wrangler provides local D1
and Durable Object storage under `.wrangler/`. The D1 ID in
`wrangler.jsonc` is a placeholder. Deployment must set a real database ID.
This setup creates no Cloudflare resources and includes no deploy command.
Put local secrets in `.dev.vars`, which Git ignores.

GitHub sign-in also needs these values in `.dev.vars`:

| Name | Value |
| --- | --- |
| `APP_ORIGIN` | `http://127.0.0.1:5173` for local development |
| `GITHUB_CLIENT_ID` | The GitHub App's client ID |
| `GITHUB_CLIENT_SECRET` | The GitHub App's client secret |
| `SESSION_SIGNING_KEY` | 32 random bytes, encoded as Base64 |
| `BOAT_KEY_ENCRYPTION_KEY` | A separate 32 random bytes, encoded as Base64 |

Keep the client secret and both keys as Worker secrets when deployment is
set up. Open `/api/auth/github` to start sign-in. No GitHub App is registered
yet. Automated tests use fakes and need no credentials.

Worker types come from `wrangler.jsonc`. The type check generates them
under `.wrangler/`, which Git also ignores.

| Command                     | What it does                                                   |
| --------------------------- | -------------------------------------------------------------- |
| `npm run dev`               | Serve the web app and the local Worker                         |
| `npm run build`             | Check types and build the web app and Worker into `dist/`      |
| `npm run preview`           | Serve the built app and local Worker at port 5174              |
| `npm run typecheck`         | Generate Worker types, then check the app, Worker, and tools   |
| `npm run test`              | Run the Vitest tests                                           |
| `npm run db:migrate`        | Apply the D1 migrations to local storage                       |
| `npm run file-length:check` | Check the 300-line limit of JavaScript and TypeScript files     |
| `npm run check`             | Run every check, including the app build and the mockup checks |
| `npm run mockups:serve`     | Serve the catalogue at `http://127.0.0.1:4173`, and watch edits |
| `npm run mockups:check`     | Check mockup types, then build the catalogue in strict mode     |
| `npm run lint`              | Run ESLint                                                     |
| `npm run format:check`      | Check formatting with Prettier                                 |
| `npm run format`            | Format the files with Prettier                                 |

GitHub Actions uses `.nvmrc`, installs with `npm ci`, and runs
`npm run check` on pushes and pull requests. It does not deploy.

## Key code

- `docs/mockups/src/entries/`: the Mokly entries of the screens, and the
  user flows.
- `docs/mockups/src/screens/`: one React component for each screen.
- `docs/mockups/src/components/`: the parts that the screens share.
- `docs/mockups/src/fixtures/`: the sample data of the screens.
- `docs/mockups/src/brand.ts`: the product name, which every screen reads.
- `mokly.config.json`: the Mokly configuration.

- `worker/app.ts`: the Worker's HTTP entry point.
- `worker/security/`: GitHub sign-in, signed sessions, and the request gate.
- `worker/data/`: D1 queries for users, orgs, sessions, and encrypted keys.
- `worker/sandbox/`: the typed Boat adapter and the encrypted key store.
- `src/shared/`: the browser API contracts, route paths, and runner message types.
- `src/test-support/`: the fake API, recorded chat and file events, and terminal fake.
- `worker/test-support/`: local D1, fake GitHub and Boat servers, and runner fakes.
- `migrations/`: the D1 schema migrations.

The web app lives under `src/`, and the Cloudflare Worker under `worker/`.

## Docs

- [Architecture](docs/architecture.md): the components, the hostnames, the
  flows, and the terms.
- Protocol docs, which state the requirements:
  - [Workspaces and sandboxes](docs/protocol/workspaces-and-sandboxes.md)
  - [Chat and events](docs/protocol/chat-and-events.md)
  - [Access and security](docs/protocol/access-and-security.md)
  - [GitHub banner](docs/protocol/github-banner.md)
  - [Agent tools](docs/protocol/agent-tools.md)
  - [Orgs and members](docs/protocol/orgs-and-members.md)
- [Mockups](docs/mockups/README.md): the design and the catalogue.
- [AGENTS.md](AGENTS.md): the rules for agents in this repository.
