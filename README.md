# Conducting

Conducting is a browser-only coding tool at `conducting.build`. Each
workspace is one task with its own branch and its own cloud computer, where
agents powered by Claude and Codex work. Nothing runs on the user's
computer. It replaces Conductor Cloud, which shuts down on 20 November 2026.

## Status

The app is not built yet. Today the repository holds:

- the [architecture doc](docs/architecture.md) and the protocol docs, which
  state the requirements
- the [mockup catalogue](docs/mockups/README.md), which draws every screen
  at phone and desktop sizes
- the type check, lint, and format setup of the mockups

The repository has no app code, no tests, and no deployment yet.

## Features

These features are planned. The protocol docs state each one.

- Sign in with GitHub. The product is free.
- Each org runs on its own Boat account, with a Boat key that an org owner
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

The mockup catalogue is the only part that runs today.

1. Install Node 24, as `.nvmrc` says. The
   [mockups README](docs/mockups/README.md#commands) lists the Node
   versions that Mokly refuses.
2. Run `npm install`. The `.npmrc` file sets `legacy-peer-deps`, which
   `@firna/ui` needs.
3. Run `npm run mockups:serve`, and open `http://127.0.0.1:4173`.

| Command                 | What it does                                                    |
| ----------------------- | --------------------------------------------------------------- |
| `npm run mockups:serve` | Serve the catalogue, and rebuild it on each edit                |
| `npm run mockups:check` | Type-check the mockups, then build the catalogue in strict mode |
| `npm run lint`          | Run ESLint                                                      |
| `npm run format:check`  | Check the formatting with Prettier                              |
| `npm run format`        | Format the files with Prettier                                  |

## Key code

- `docs/mockups/src/entries/`: the Mokly entries of the screens, and the
  user flows.
- `docs/mockups/src/screens/`: one React component for each screen.
- `docs/mockups/src/components/`: the parts that the screens share.
- `docs/mockups/src/fixtures/`: the sample data of the screens.
- `docs/mockups/src/brand.ts`: the product name, which every screen reads.
- `mokly.config.json`: the Mokly configuration.

The web app will live under `src/`, and the Cloudflare Worker under
`worker/`.

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
