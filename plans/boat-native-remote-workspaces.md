# Boat-Native Remote Workspaces

Status: Active. On branch `calummoore/conductor-alternative-architecture`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Conductor Cloud goes read-only on 13 November 2026 and shuts down on
20 November 2026. This change builds a browser-only replacement for one
user first: one Boat sandbox per workspace, chat with coding agents, a
file list and preview, a terminal, port previews, a GitHub banner, a
prepared base per repository, and agent tools that create workspaces.
Nothing runs on the user's computer.

The chosen approach is a Boat-native app. A web app and a Cloudflare
Worker use Boat's own agents, files, port URLs, desktop stream, saved
snapshots, environments, and webhooks. There is no daemon of our own in
the sandbox. This change does not cover other users, billing, a mobile
app, or a provider other than Boat. The brainstorm notes and sources are
in `.context/brainstorm/notes.md`.

Contract owners. Milestone 2 creates them:

- `docs/architecture.md`.
- `docs/protocol/workspaces-and-sandboxes.md`.
- `docs/protocol/access-and-security.md`.
- `docs/protocol/chat-and-events.md`.
- `docs/protocol/github-banner.md`.
- `docs/protocol/agent-tools.md`.
- `README.md`.

## Decisions

The user answered each decision on 5 November 2026, in the brainstorm of
this branch.

### 1. Choose what to build, and on which stack

- **Root question:** What is the fastest way to a browser-only tool with
  one sandbox per workspace that updates at once and can grow into a
  product?
- **Options:**
  - **A.** Boat-native app over Boat's own agents and API. Chat updates
    arrive by polling about once a second. The agents are locked to Boat.
  - **B.** Fork T3 Code and add managed sandboxes.
  - **C.** An own TypeScript stack on Cloudflare with an own daemon in
    each sandbox.
  - **D.** An own Rust and Postgres stack with a Rust daemon.
  - **E.** Added by the options check: run the agent CLIs as detached
    Boat commands and read their live attach stream. It needs no daemon.
    The stream has no stdin, so a running turn cannot be steered.
    Effort: Medium. Decision 7 records it as the fallback.
- **Left out:** an agent loop in the control plane, an extension of
  `futex-ai/terminal`, GitHub Codespaces or Coder, and a hosted product.
- **Recommendation:** C.
- **Chosen:** A, by the user on 5 November 2026. A is the smallest build
  and needs no daemon. The agent recommended C for streamed updates.

### 2. Choose the sandbox provider

- **Options:** **A.** Boat. **B.** Sprites on Fly.io.
- **Left out:** E2B, Vercel Sandbox, Daytona, and Modal for price, and
  Cloudflare Containers for size limits. The options check gave Daytona
  about 9 times and Modal about 13 times Boat's price.
- **Chosen:** A, by the user on 5 November 2026, as recommended. Boat is
  the cheapest and already has fork, saved snapshots, environments, port
  URLs, desktop streaming, and webhooks.

### 3. Choose a bridge until the new tool works

- **Options:** **A.** The Conductor Mac app. **B.** T3 Code or Paseo on
  one Boat sandbox. **C.** No bridge. **D.** Added by the options check:
  Claude Code on the web or Codex cloud, with Codespaces for a terminal.
- **Chosen:** C, by the user on 5 November 2026. The agent recommended B.
  All effort goes to this build. A gap after 13 November is likely, so the
  milestones put a usable chat first.

### 4. Use a clone per sandbox, not worktrees

- **Options:** **A.** One clone per sandbox. **B.** One worktree per
  workspace in a shared sandbox.
- **Chosen:** A, by the user on 5 November 2026, as recommended. Each
  workspace starts from the base of its repository and makes a branch.
  The options check found that a fork of a running base can copy a
  half-done refresh. Agent call: a new workspace starts from the saved
  snapshot of the last good refresh, as Boat advises.

### 5. Keep the Boat key away from other sandboxes

Agent call, 5 November 2026: option G. The second options check found
that Boat can limit a key to one environment. G costs nothing and Boat
enforces it, so this is no longer a question for the user.

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Background:** The Worker holds one scoped Boat key. A key without a
  sandbox or environment limit reaches every sandbox of its account, also
  the ciproxy sandboxes. Only the D1 ownership check keeps the Worker to its own
  sandboxes.
- **Problem:** A bug or a leak of the key exposes every sandbox of the
  account.
- **Impact if no action:** One Worker bug can reach unrelated sandboxes.
- **Root question:** How do we limit what the app's Boat key can reach?
- **Options:**
  - **A.** Keep one account key, and rely on the D1 check. Effort: Small.
  - **F.** Give the app its own Boat organization, whose key sees nothing
    else. Set a 365-day key lifetime and a dated rotation. Register the
    Boat webhook by hand, because it needs `account.admin`. A seat costs
    the plan price, and it adds its full included time. Effort: Small.
  - **G.** Added by the second options check: put the app's sandboxes in
    their own Boat environment, and limit the Worker key to it. Boat then
    refuses every other sandbox. Effort: Small.
- **Left out:** Per-sandbox keys, because minting them needs
  `account.admin` in the Worker.
- **Wider fix:** G.
- **Recommendation:** G. The first recommendation was F. G gives the same
  limit at no cost. F also separates the start limits from ciproxy.
- **Action:** applied as an agent call. Decision 5 is closed.

### 6. Show port previews safely in a frame

Open. Added on 5 November 2026 from the options check.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Background:** Port previews run code that agents write. Cloudflare
  Access cannot sign in inside a frame, so a framed preview behind Access
  stays blank in Safari, Firefox, and iOS.
- **Problem:** The current design guards previews with Access and shows
  them in a frame. That fails in most browsers.
- **Impact if no action:** Embedded previews stay blank.
- **Root question:** How does only the user open a preview of untrusted
  code, inside the app, in every browser?
- **Options:**
  - **A.** Access on the preview domain, as now. Frames stay blank.
    Effort: Small.
  - **C.** No Access on previews. The API gives a short-lived signed
    grant, and the preview host swaps it for a host-only cookie. Previews
    live under the app's domain. Preview code is then same-site with the
    app. Effort: Medium.
  - **D.** C on a separate registrable domain, with `Partitioned`
    cookies. It costs a second domain. Safari before 26.2 shows blank
    frames. Effort: Medium.
  - **E.** Keep Access, and open each preview in its own tab. There is no
    embedded preview. Effort: Small.
  - **F.** Added by the second options check: a random one-level
    hostname for each preview on the domain of D. The hostname is the
    credential, so frames need no cookie. The workspace Durable Object
    revokes it. Browser history can leak it. Effort: Medium.
  - **G.** Added by the second options check: embed Boat's browser-only
    view of Chrome in the sandbox, opened at the port. It is slower, and
    it has no local developer tools. Effort: Small.
- **Left out:** Boat `_token` URLs in the browser, because a token cannot
  rotate without a public gap.
- **Wider fix:** F.
- **Recommendation:** F. The first recommendation was D. F needs no
  cookie in the frame and keeps preview code off the app's site. Safari
  still blocks the previewed app's own cookies in a frame, so each
  preview also gets an "Open in new tab" link.
- **Action:** ask the user, because D costs a domain, and E gives up the
  embedded preview.

### 7. Choose how chat output reaches the app

Agent call, 5 November 2026: option F. It keeps the chosen approach and
steer. Milestone 7 measures it. If Boat's partial events lag, this
decision opens again with E.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Performance.
- **Background:** Decision 1 chose the Boat-native app. Boat's own agents
  give their events only by polling, about once a second. Boat's detached
  commands give a live output stream.
- **Problem:** Chat updates arrive in steps of about one second.
- **Impact if no action:** Chat feels slower than Conductor.
- **Root question:** How does agent output reach the chat as it happens,
  without a daemon of our own?
- **Options:**
  - **A.** Boat's integrated agents, polled. Steer, interrupt, and
    conversations come from Boat. Effort: Medium.
  - **E.** Run `claude` and `codex` in JSON streaming mode as detached
    Boat commands, and read the attach stream. Each message starts a new
    turn that resumes the session. A running turn cannot be steered, only
    stopped. Effort: Medium.
- **Left out:** An own daemon, because decision 1 chose no daemon.
- **Wider fix:** None. This is a one-time choice.
  - **F.** Added by the second options check: A, but polled every
    250 ms while a turn runs. It helps only if Boat's partial events
    update that often. Boat allows 10,000 requests a minute per address.
    Effort: Small.
- **Recommendation:** F. The first recommendation was A. F keeps steer
  at a small cost.
- **Action:** applied as an agent call, with the measurement in
  Milestone 7.

### 8. Limit the workspaces that agents create

Open. Added on 5 November 2026 from the options check.

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Background:** Agent tools can create workspaces. Each workspace is a
  paid sandbox. Boat's $20 plan allows 100 sandboxes at once and 200
  starts a day. Boat bills extra starts to the wallet. The app shares
  these limits with ciproxy.
- **Problem:** A looping or injected agent can create many sandboxes.
- **Impact if no action:** Cost and start limits can run out in a day.
- **Root question:** How do we stop agents from creating too many
  workspaces?
- **Options:**
  - **A.** No limit of our own. Boat's plan limits apply. Effort: Small.
  - **B.** At most 5 open workspaces created by agents, and 20 a day.
    Effort: Small.
  - **C.** Each workspace that an agent asks for waits for the user's
    approval in the app. Effort: Medium.
  - **D.** Added by the second options check: turn off Boat's automatic
    top-up and invoiced extra starts. An empty wallet then refuses extra
    starts, also for ciproxy and for you. Effort: Small.
- **Left out:** None.
- **Wider fix:** D. It also catches bugs in the Worker.
- **Recommendation:** B. It caps the cost and keeps agents fast.
- **Action:** ask the user, because a limit is new validation.

## Design

Each item below is an agent call of 5 November 2026 unless it says
otherwise. The user can override any of them.

**Components.**

- The web app is React with Vite, and it uses `futex-ai/ui` components.
  Reason: the user's shared component library already has the controls.
- The Worker serves the API, the proxies, and the webhook endpoints. It
  holds the Boat key. Reason: the browser must never hold the key.
- D1 holds repositories, workspaces, and settings. Boat labels alone are
  not enough, because they are fixed after create or fork.
- One Durable Object per workspace holds the open tabs, the idle timer,
  the event poll, and the banner state. Its storage keeps the chat
  history, so a stopped workspace still shows it. It runs with the
  Western Europe location hint, near Boat's machines.
- A small `SandboxProvider` interface wraps the Boat client. Reason: a
  later change can add another provider or an own daemon.
- Chat events use our own event type, mapped from Boat's events in the
  Worker. Reason: option C of decision 1 stays possible later.

**Access and security.** These calls answer the user's question of
5 November 2026 on secure access to Boat.

- Cloudflare Access protects the web app and the API. Decision 6 decides
  the sign-in of port previews. The Worker verifies the Access token on each request. Reason:
  it needs no login code for one user. Own GitHub login replaces it when
  other users join.
- The Boat key is a scoped key and a Worker secret. It has only the
  actions that the app uses, and no `account.admin` action. It is limited
  to the app's own Boat environment, as decision 5 says.
- The Worker calls only a fixed list of Boat routes. It has no general
  pass-through. Before each sandbox call, it checks that the sandbox
  belongs to a workspace of the signed-in user in D1.
- Each hostname has one gate that runs before every route and every
  WebSocket upgrade. It checks the sign-in, a matching `Origin` header,
  and a JSON body for writes. Reason from the options check: an upgrade
  without an `Origin` check lets preview code open chat sockets.
- Webhooks and agent tools use a hostname without Access. Their gate
  checks the webhook signature or the workspace token instead.
- The proxies forward only an allowlist of headers and cookies. They
  strip the Access cookie and every `Cf-Access-*` header before Boat.
- The terminal socket runs on the app hostname. The Worker connects it to
  the private `ttyd` port with the Boat `_port_auth` cookie and a
  per-workspace `ttyd` password. Reason: sandbox code can make a port
  public with `host --public`, and the password still guards it.
- Port previews go through the Worker, which adds the `_port_auth` cookie
  on the server side. Decision 6 decides their domain and sign-in.
  Preview hostnames stay one level deep, such as
  `<workspace>-<port>.<preview domain>`, because Universal SSL covers one
  level.
- The Worker asks Boat for a new desktop URL on each page load. The URL
  works for 10 minutes and carries its token in the fragment.
- The Worker verifies the signature of each GitHub and Boat webhook.
- Each workspace sandbox gets its own workspace token as a sandbox
  variable. Agent tools can only create and list workspaces with it.

**Workspaces and sandboxes.**

- Each repository has one base sandbox. A push to the default branch
  refreshes it at most once in 30 minutes, and a daily timer refreshes it
  too: resume, fetch, reset to the default branch, run the startup
  script, save a saved snapshot, and stop. Reason: each resume counts as
  a Boat start, and the $20 plan allows 200 starts a day.
- A new workspace starts from the newest good saved snapshot of its base,
  with labels for the user, the repository, and the workspace. It then
  creates its branch. Reason: a fork of a running base can copy a
  half-done refresh.
- Each workspace sandbox has a Boat auto-stop deadline as a safety net.
  The workspace Durable Object extends it while a tab is open or an agent
  turn runs. Reason: a new sandbox stops after one hour by default.
- Workspace sandboxes use the app's Boat environment, with the user's
  GitHub access and AI logins, as Conductor Cloud does. Reason: one user
  owns every sandbox. Sandboxes for other users will use `noEnv`.
- "Install software" opens a terminal on the base sandbox. The user
  installs tools and saves. The startup script and the env vars live in a
  Boat environment, which applies them at each start.
- A sandbox stops after 30 minutes with no open tab and no running agent
  turn. Reason: a Boat stop ends all processes, so it must not cut off
  work. Opening the workspace resumes it, and the app shows a starting
  state until Boat reports it ready.
- The terminal is `ttyd` as a systemd service in the base snapshot,
  exposed as a private Boat port. Reason: Boat has no terminal API, and
  enabled services come back after each resume.

**Agents and tools.**

- Chat uses Boat's integrated agents: prompt, steer, interrupt, and
  conversations. The workspace Durable Object polls Boat's events with
  the `ETag` header, as decision 7 says. Decision 7 keeps streamed agent
  CLIs as the fallback.
- Agents create workspaces through an MCP server and a CLI in the base
  snapshot. Both call the Worker with the workspace token.
- Agents use Boat's built-in computer tools for browser work. The app
  embeds the Boat desktop stream, so the user can watch.

**GitHub banner.** A GitHub App sends pull request, check, status, and
push webhooks. The Worker routes each event to the workspace of its
branch. When a tab opens, the Worker reads the current pull request and
check state from the GitHub API.

**Prerequisites from the user.** A Cloudflare account on Workers Paid
with Access and a domain. A paid Boat plan and a scoped Boat key. A
GitHub App with its key. Milestone 16 needs all of them. Earlier
milestones use fakes.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Set up the Mokly catalogue and draw every screen and flow of the plan,
each in a mobile and a desktop variant.

- [ ] Set up `@mokly/mokly` under `docs/mockups`, with a build and a
      mockup check command. Follow the setup of `futex-ai/accounting`.
- [ ] Draw the app shell with the workspace list, the GitHub banner, and
      the sandbox states: ready, starting, stopped, and error.
- [ ] Draw the new workspace screen and the repository settings screen:
      base status, install software, startup script, and env vars.
- [ ] Draw the workspace chat: messages, tool calls, the running state,
      steer, and interrupt.
- [ ] Draw the files panel with All and Changes, and the Markdown and
      code preview.
- [ ] Draw the terminal, the port preview, and the desktop view.
- [ ] Draw two flows: create a workspace, and reopen a stopped workspace.
- [ ] Run the mockup check. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements and the decisions in force for the work below.

- [ ] Write `AGENTS.md` with the `agents-md` skill, and link `CLAUDE.md`
      to it.
- [ ] Write `README.md` with the features, the setup, and the key code.
- [ ] Write `docs/architecture.md` with the components and their
      boundaries.
- [ ] Write the five protocol docs named under "Contract owners".
- [ ] Add the build output to `.gitignore`.

## Milestone 3: Repository bootstrap

Depends on: 2

Create the TypeScript workspace and the complete gate.

- [ ] Create npm workspaces: `apps/web`, `apps/worker`, and
      `packages/protocol` for the shared types.
- [ ] Add strict TypeScript, ESLint, Prettier, Vitest, and the 300-line
      file check.
- [ ] Add one gate command and a GitHub Actions workflow that runs it.
- [ ] Add the Wrangler configuration with D1 and the Durable Object
      binding. Do not deploy.
- [ ] Build each package, and run the gate.

## Milestone 4: Worker core and Boat client

Depends on: 3

- [ ] Verify the Cloudflare Access token on each request.
- [ ] Add the Boat client behind `SandboxProvider`, with the fixed route
      list and typed errors. Its key is limited to the app's own Boat
      environment.
- [ ] Add the D1 schema and its migrations for repositories, workspaces,
      and settings.
- [ ] Add the ownership check and the `Origin` check.
- [ ] Test the client and the checks against a fake Boat server.

## Milestone 5: Bases and workspace lifecycle

Depends on: 4

- [ ] Create and refresh the base sandbox of a repository.
- [ ] Create a workspace: fork, labels, branch, and workspace token.
- [ ] Add the workspace Durable Object: tabs, idle stop, and resume on
      open.
- [ ] Receive and verify Boat webhooks, and update the workspace state.
- [ ] Add the daily refresh timer and the 30-minute push limit.
- [ ] Test the lifecycle against the fake Boat server.

## Milestone 6: App shell and workspaces

Tags: ui

Depends on: 5

- [ ] Build the app shell, the workspace list, and the sandbox states.
- [ ] Build the new workspace and the repository settings screens.
- [ ] Compare each screen with its mockup.

## Milestone 7: Chat backend

Depends on: 5

- [ ] Add prompt, steer, and interrupt endpoints.
- [ ] Poll Boat events in the workspace Durable Object while a tab is
      open: every 250 ms during a turn, every few seconds otherwise, and
      not at all with no tab.
- [ ] Measure how often Boat's partial events change during a turn.
      Save the result under `.context/`. Open decision 7 again if they
      lag.
- [ ] Map Boat events to our event type, store them, and push them to
      the open tabs over a WebSocket.
- [ ] Test the mapping and the poll cursor against recorded events.

## Milestone 8: Chat UI

Tags: ui

Depends on: 6, 7

- [ ] Build the chat with messages, tool calls, the running state,
      steer, and interrupt.
- [ ] Show the stored history while the sandbox is stopped or starting.
- [ ] Compare each screen with its mockup.

## Milestone 9: Files backend

Depends on: 5

- [ ] List files, and read one file with a size limit.
- [ ] List changes and diffs from `git status` and `git diff`.
- [ ] Test both against the fake Boat server.

## Milestone 10: Files UI

Tags: ui

Depends on: 6, 9

- [ ] Build the All and Changes lists, and the Markdown and code preview.
- [ ] Compare each screen with its mockup.

## Milestone 11: Terminal, previews, and desktop backend

Depends on: 5

- [ ] Add the `ttyd` service with a per-workspace password to the base
      snapshot setup.
- [ ] Expose private ports, and proxy them with the `_port_auth`
      cookie, including WebSockets, as the user's answer to decision 6
      says.
- [ ] Add the desktop URL endpoint.
- [ ] Test the proxy with a fake upstream.

## Milestone 12: Terminal, previews, and desktop UI

Tags: ui

Depends on: 6, 11

- [ ] Build the terminal with xterm.js, the port preview, and the desktop
      frame.
- [ ] Compare each screen with its mockup.

## Milestone 13: GitHub banner backend

Depends on: 5

- [ ] Receive and verify GitHub App webhooks.
- [ ] Route each event to the workspace of its branch, and push it to the
      open tabs.
- [ ] Read the current pull request and checks when a tab opens.
- [ ] Test with recorded webhook payloads.

## Milestone 14: GitHub banner UI

Tags: ui

Depends on: 6, 13

- [ ] Build the banner for pull request, checks, and merge state.
- [ ] Compare it with its mockup.

## Milestone 15: Agent tools

Depends on: 5

- [ ] Add the create and list workspace endpoints for workspace tokens.
- [ ] Apply the user's answer to decision 8.
- [ ] Add the CLI and the MCP server to the base snapshot setup.
- [ ] Test the token scope and both tools.

## Milestone 16: Deployment and live smoke test

Depends on: 8, 10, 12, 14, 15

This milestone needs the prerequisites from the user.

- [ ] Deploy the Worker, D1, and the web app to the user's Cloudflare
      account behind Access.
- [ ] Smoke-test with a real Boat sandbox: create a workspace, chat, open
      a file, use the terminal, open a preview, stop, and resume.
- [ ] Check that a private Boat port does not answer on the public
      address of the sandbox without its token.

## Milestone 17: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.
