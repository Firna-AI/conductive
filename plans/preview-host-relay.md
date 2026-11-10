# Preview relay for servers with a Host check

Status: Active. On branch `calummoore/port-preview-error-v2`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

On 10 November 2026, a port preview of `mokly serve` showed status 403 with
`{"code":"forbidden","message":"Use the local catalogue address."}`. The
preview proxy sends each request to the Boat address of the port, so the
server gets the Boat hostname as `Host`. A dev server with a Host check
refuses that hostname. `mokly serve` accepts only `localhost:<port>` and
`127.0.0.1:<port>`, on purpose, as its own protocol says. Vite and webpack
dev servers also block unknown hostnames by default. The user chose a relay
in the sandbox (decision 213). The relay gives each server its local
address as `Host`, as a browser on the sandbox would send it. On the same
day, the user chose that a sandbox where the relay does not run refuses
previews (decision 214), because the app is not live yet.

The same branch fixes the preview frame, which showed the 403 as a blank
page. On 10 November 2026, the user chose option A of that item: the frame
uses the `Canvas` system colour. That fix is done. This plan covers only
the relay.

Contract owners:

- [Access and security](../docs/protocol/access-and-security.md), "Port previews" and "Proxies and ports".
- [Workspace tools](../docs/protocol/workspace-tools.md), "Port previews".
- The [architecture doc](../docs/architecture.md), "Sandbox software".
- The [preview backend README](../worker/previews/README.md), the [runner README](../runner/README.md), and the [sandbox software README](../image/README.md).

Replaced ways:

- The direct route, where Boat hosts the previewed port itself → the relay
  route. Consumers: `PrivatePorts` in `worker/previews/ports.ts`, the
  listener check in `worker/previews/listeners.ts`, `portRequest` and the
  origin helpers, the reads and writes of `listener_mode` and
  `listener_sandbox_id` in `worker/previews/store.ts`,
  `worker/previews/handler.ts`, and `worker/security/connection-access.ts`,
  and their tests. Moved and deleted in Milestone 3. The two D1 columns stay
  unused until a follow-up item drops them, because the old Worker reads
  them until the new one replaces it.

## Decisions

### 213. Send each previewed server its local address

Added on 10 November 2026, from item 1 of the investigation of the failed
preview of `mokly serve`.

- **Severity:** High. **Effort:** Large.
- **Source:** Design. **Category:** Product bug.
- **Options:**
  - **A.** Change nothing. A user runs a relay in the sandbox by hand. Effort: Small.
  - **B.** Add a setting to Mokly that allows more hostnames. Vite and webpack projects still need their own setting. Effort: Medium.
  - **C.** Ask Boat for a relay option that sends the local `Host`. Effort: Small in this repository. The wait for Boat is unknown.
  - **D.** Add a relay to the sandbox image, beside the agent runner. Every preview goes through it with `Host: localhost:<port>` and a matching `Origin`. Effort: Large.
- **Recommendation:** D.
- **Chosen:** D, by the user on 10 November 2026. Reason: it fixes every
  server with a Host check, with no change to its repository. It also
  meets Mokly's rule that a forwarded local port works.

### 214. Previews in a sandbox without the relay

Added on 10 November 2026, from the design of decision 213. The options
check of 10 November 2026 changed the root question, added options D and
E, and changed the recommendation from A to D.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. **Category:** Docs or spec.
- **Terms:**
  - **Org image:** the saved snapshot that each new sandbox of an org starts from. Each image build installs the sandbox software of `image/`. A refresh installs none.
  - **Direct route:** today's preview path. Boat hosts the previewed port itself, and the server gets the Boat hostname as `Host`.
  - **Transient unit:** a systemd service that `systemd-run` starts with no unit file on the disk. It ends when the sandbox stops.
- **Background:**
  - Only an image build installs sandbox software. A workspace keeps the
    software of the image that it started from, also after a resume.
  - So an image install of the relay misses each existing workspace. It
    also misses each new workspace until an admin runs a new build.
  - On 8 November 2026, the user kept that rule for the terminal files,
    in decision 148 of `plans/boat-native-remote-workspaces.md`, option A.
    The recommendation then was an install at each workspace start. The
    number 148 also names an operator decision, so this plan means the
    terminal one.
  - `docs/protocol/agent-runner.md` already says that the Worker serves
    each runner version that a live image or sandbox can hold.
  - A relay that was installed can also stop running.
- **Problem:** No requirement says how a preview gets the local `Host` in a
  sandbox where no relay runs.
- **Impact if no action:** The relay work waits, because its install path
  and the route choice of the Worker depend on the answer.
- **Root question:** How does a preview get the local `Host` in a sandbox
  where no relay runs, because its image is older or its relay stopped?
- **Options:**
  - **A.** Install the relay with each image build. Keep the direct route
    for a sandbox without it, so its previews work as today, with today's
    Host problem. A follow-up item removes the direct route when no active
    preview uses it, as the stored listener mode shows. Effort: Small.
  - **B.** Install the relay with each image build. Refuse a preview in a
    sandbox without it: the open answers 409 and asks for a new workspace.
    Cost: until an admin runs a new build, this also refuses previews in
    new workspaces, because a refresh installs no software. Effort: Small.
  - **C.** Install the relay with each image build. In an older sandbox,
    install it at the preview open from the current runner archive. Cost:
    the archive holds hundreds of megabytes of agent SDK files, so the
    first preview of each older sandbox downloads them. It is a second
    install path. Effort: Medium.
  - **D.** The Worker starts the relay in memory at each preview open that
    finds no relay running. Effort: Medium.
    - The Worker holds the relay as one file with no npm dependency, as it
      holds the git credential helper.
    - One privileged command writes the file to `/run`, which is memory,
      and starts it as a transient unit. The image build installs nothing
      for the relay, so every sandbox gets it in this one way.
    - When the relay does not start, for example in a sandbox without the
      private Node, the preview uses the direct route, as in A.
    - Cost: the first open after each sandbox start takes one more command
      call. The relay can use only the built-in modules of Node. The
      direct route stays for the fallback.
  - **E.** Each workspace start brings the sandbox software up to date.
    Effort: Large.
    - The start compares the digest of the installed archive with the
      current digest of the Worker. When they differ, it runs the software
      step of a build, then restarts the runner.
    - The relay, the terminal programs, the GitHub CLI wrapper, and the
      private Node then reach each workspace at its next start.
    - Cost: it reopens decision 148. The first start after a deploy
      downloads the archive and runs `apt-get`. A newer runner must read
      the saved state of an older one. A workspace that runs during the
      deploy still needs A or B until it stops.
- **Left out:** An automatic image build for each org: it fails the goal,
  because each existing workspace keeps its image.
- **Wider fix:** E. Each change to the sandbox software needs its own rule
  for older sandboxes, and E gives one rule for all of them.
- **Previous examples:** Decision 148 for the terminal files, commit
  `7e23773` for the GitHub CLI wrapper, and the Node pin in
  `image/runtime.md`.
- **Recommendation:** D, in place of the first recommendation, A. D gives
  the local `Host` to existing and new workspaces at their first preview.
  It needs no build and writes no file to the disk, so each workspace still
  keeps the files of its image, as decision 148 keeps for the terminal. E
  protects the codebase best, but it is Large and reopens decision 148. If
  the image must stay the only way that the relay gets in, A is the best
  option.
- **Chosen:** B, by the user on 10 November 2026. Reason: the app is not
  live yet, so a refusal until the next build and a new workspace costs
  little, and the Worker keeps one route.

## Design

These are my design calls under decision 213, on 10 November 2026. The
reason follows each call.

### The relay program

- The relay is a Node program in the runner package, under
  `runner/src/relay/`, built as the bundle `relay.mjs` of the runner
  archive. It uses only the built-in modules of Node. Reason: the user
  chose a relay beside the agent runner, and decision 214 installs it with
  the image build, which already installs the runner archive.
- It listens on `127.0.0.1:7682`. Reason: loopback keeps it off the sandbox
  network. Port 7682 sits beside the terminal's 7681 and is rare for apps.
- `src/shared/previews.ts` holds the relay port and the header name.
  Reason: the Worker and the runner both import that folder.

### How the relay gets into a sandbox

- The image build installs the relay, as decision 214 chose. The units are
  my design calls.
- A socket unit, `conductive-preview-relay.socket`, holds
  `127.0.0.1:7682`. The service unit, `conductive-preview-relay.service`,
  runs the relay as `user` with the private Node, with `Restart=always`.
  The relay takes the listening socket from systemd. Reason: the port stays
  open while the relay restarts, so new connections wait for it, and no
  other process can take the port. This came from review finding 4.
- The units need no workspace marker, because the relay needs no
  workspace variable. Boat starts the enabled units after each resume and
  fork.
- Reason for units of its own: a restart of the runner, which each
  workspace start does, must not drop the open previews.
- A workspace gets the relay only from an image build that has it. A
  refresh installs no software, and a workspace keeps the software of its
  image, as the terminal software does.

### The request contract

- The Worker asks Boat to host port 7682 in localhost mode, and keeps that
  descriptor for each sandbox as it keeps descriptors today.
- Each preview request goes to the Boat address of port 7682, with the path
  and the query of the browser request.
- The Worker adds `X-Conductive-Preview-Port: <port>`. The header allowlist
  already drops any browser header with that name. Reason: a path prefix
  would change the paths that the server sees.
- The Worker maps a same-origin `Origin` to `http://localhost:<port>`, with
  today's rule for same-origin requests. Foreign and missing `Origin`
  headers keep their meaning. Reason: only the Worker knows the fetch
  metadata and the preview hostname.
- The Worker maps a redirect to `http` or `https` on `localhost:<port>`,
  `127.0.0.1:<port>`, or `[::1]:<port>` to the preview hostname. The map of
  the Boat address goes, because no previewed server sees that address.

### The rules of the relay

- It answers a request only when `Host` is `<label>-7682.on.boat.dev`. Each
  other `Host` gets 403. Reason: this stops DNS rebinding through the relay,
  for example from a page in the sandbox's desktop browser. Boat's hosting
  docs tell Vite users to allow `.on.boat.dev`, so that hostname reaches
  the sandbox. The post-merge check confirms it.
- It answers 400 to a missing or invalid port header, and to port 7682
  itself. Reason: a request to its own port would loop. No open refuses a
  port today, so the open does not refuse 7682.
- It removes the port header, the `_port_auth` cookie, `Forwarded`, and each
  `X-Forwarded-*` header. It sets `Host: localhost:<port>`. Reason: the
  server must see one consistent local request. For example, Next.js
  compares `Origin` with `X-Forwarded-Host`.
- It sends `localhost`, not `127.0.0.1`. Reason: dev servers print and
  allow `localhost`, and Mokly allows both.
- It connects to `127.0.0.1:<port>`, then `[::1]:<port>`, then each
  non-internal address of the sandbox. When none opens, it answers 502.
  Reason: a server on one sandbox address works today through Boat's
  network mode, so the relay keeps that case.
- It streams both bodies with backpressure. It keeps long streams open,
  such as server-sent events and large uploads. It ends the upstream
  request when the client goes away.
- It relays WebSocket upgrades with the same header rules, then pipes both
  sockets.
- Its error answers are short plain text that names no provider. Reason:
  they show in the preview frame, and user-facing text never names Boat.
- It adds `X-Conductive-Relay: 1` to each answer that it sends, and it
  replaces any mark that the server sets. The Worker replaces each answer
  without the mark with its own unavailable error, and drops its
  descriptor. The response allowlist keeps the mark from the browser.
  Reason: an answer without the mark did not come from the relay, such as
  a gateway error of Boat while the relay is down. This came from review
  finding 3.

### The route choice in the Worker

- The open checks the state of the relay's socket unit with one command
  call. Reason: a user server on port 7682 must not count as the relay.
- When the unit runs, Boat hosts port 7682 in localhost mode, and the
  preview uses the relay. No preview uses the direct route.
- When the unit does not run, the open answers 409
  `preview_relay_unavailable`, with the message "Previews need newer cloud
  computer software. Start a new workspace after an admin runs Build
  computer." The proxy answers its requests with the same error. This is
  decision 214. The message names no provider.
- A page load does not run the check again. Reason: the relay finds the
  address of the server for each connection, so the check only adds a
  command call to each page load. A failed upstream request, or an answer
  without the relay mark, drops the descriptor, so the next request checks
  again. A marked 401, 403, or 502 comes from the previewed server, so it
  keeps the descriptor.
- The Worker no longer runs `ss`, and it no longer reads or writes the
  listener mode of a preview.

### Security

- The credential gate of each preview stays in the Worker. A request
  reaches the relay only through Boat's address with Boat's token, which
  only the Worker holds.
- The relay reaches only ports of its own sandbox. Each process in the
  sandbox can reach them already.
- The Boat token of port 7682 reaches each port of the sandbox, not one
  port. Only the Worker holds it, in memory, as it holds the tokens of
  today. The Worker can host any port with its Boat key already, so the
  token adds no new reach. The relay drops the `_port_auth` cookie, so the
  server never sees the token.
- A server that builds absolute links from `Host` now builds
  `http://localhost:<port>` links. Before, they named the Boat address. The
  browser can open neither, so no case gets worse. Redirects keep working,
  because the Worker maps them.

## Milestone 1: Documentation and protocol

Depends on: none

The protocol docs state the new requirements, so that the code below can
meet them.

- [x] `docs/protocol/access-and-security.md`, "Port previews" and "Proxies
      and ports": a previewed server gets `localhost:<port>` as `Host`, and
      `http://localhost:<port>` as the `Origin` of the page's own requests
      (decision 213). Give the reason and the rejected alternatives.
- [x] In the same doc: the relay answers only requests that reach it
      through the Boat address of its own port, and it reaches only ports
      of its own sandbox. Restate the redirect rule for the local address.
- [x] `docs/protocol/workspace-tools.md`, "Port previews": a server that
      answers only its local address works in a preview with no change to
      its repository. Port 7682 belongs to the relay.
- [x] `docs/architecture.md`, "Sandbox software": add the preview relay.
- [x] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact.
- [x] Check the previews row of the comparison page in
      `src/marketing/from-conductor/`. Change its status only when the
      claim rules ask for it.

## Milestone 2: The relay

Depends on: 1

The relay runs in each sandbox of a new org image. No Worker preview code
uses it yet.

- [x] Add the relay port and the header name to `src/shared/previews.ts`.
- [x] Add the relay under `runner/src/relay/` with its entry point. Add the
      `relay` entry to `runner/scripts/build.mjs` and to the `runner`
      entries of `knip.jsonc`.
- [x] Add `relay.mjs` to the archive in `image/package-runner.mjs`. Check
      the file in `image/install.sh`.
- [x] Add `image/conductive-preview-relay.service` and its start script.
      Stage both in the software step of
      `worker/lifecycle/image-software.ts`. `image/install.sh` installs them,
      enables the unit, and starts nothing. Update the image software test.
- [x] Test the relay in `runner/` against real loopback servers:
  - [x] Only the Boat `Host` of port 7682 gets an answer. `localhost:7682`
        and `evil.example:7682` get 403.
  - [x] A missing, invalid, or out-of-range port header, and port 7682,
        get 400.
  - [x] The server gets the method, the path, the query, the body, and
        `Host: localhost:<port>`. The port header, `_port_auth`,
        `Forwarded`, and `X-Forwarded-*` are gone. Other cookies and
        `Origin` stay.
  - [x] A server-sent event reaches the client before the server ends the
        response.
  - [x] A WebSocket upgrade gets the same `Host` rule, and frames pass both
        ways.
  - [x] A server on `::1` only gets the request. With no server, the
        answer is 502.
  - [x] A client that goes away ends the upstream request.
- [x] Update `runner/README.md`, `image/README.md`, and `image/install.md`.
      Say that a workspace gets the relay only from a new image build.

## Milestone 3: The Worker uses the relay

Depends on: 1, 2

Every preview goes through the relay. A sandbox where the relay does not
run refuses previews, as decision 214 chose.

- [x] Replace the listener check in `worker/previews/listeners.ts` and
      `worker/previews/ports.ts` with the check of the relay unit, as the
      design says.
- [x] Refuse an open, and the requests of a preview, with 409
      `preview_relay_unavailable` when the relay does not run.
- [x] Build the relay request in `worker/previews/headers.ts` and
      `worker/previews/origins.ts`: the relay address, the port header, the
      `Origin` map, and the redirect map for the local address. Keep the
      terminal behaviour.
- [x] Delete the direct route: the `ss` check, the listener modes of
      previews, the map of the Boat address in preview redirects, and the
      reads and writes of `listener_mode` and `listener_sandbox_id`. Add a
      follow-up item that drops both columns after this change deploys.
- [x] Update the docs in the same change as the code:
  - [x] `docs/protocol/access-and-security.md`: the refusal of decision
        214, with its reason and the rejected options. Remove the redirect
        rule for the private address.
  - [x] `docs/protocol/workspace-tools.md`: the refusal, in place of the
        words "while the relay runs".
  - [x] `docs/architecture.md`: list the relay in the software of each org
        image.
  - [x] `docs/architecture/flows.md`: name the relay on the preview path.
- [x] Test in `worker/previews/` with the fake Boat server:
  - [x] When the relay unit runs, the open hosts port 7682 in localhost
        mode. Each request and each WebSocket upgrade goes to its Boat
        address with the port header.
  - [x] When the relay unit does not run, the open and the proxy answer
        409 `preview_relay_unavailable`, and no request reaches Boat's
        address.
  - [x] A same-origin `Origin` becomes `http://localhost:<port>`. A foreign
        `Origin` stays.
  - [x] A redirect to `http://localhost:<port>/x` or
        `http://127.0.0.1:<port>/x` reaches the browser on the preview
        hostname.
  - [x] A page load runs no check of the relay unit.
- [x] Update `worker/previews/README.md`: the relay route and the refusal,
      in place of the `.on.boat.dev` rule.

## Milestone 4: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds. It says how an
      existing workspace gets the relay, from decision 214.

## Post-merge follow-up (non-blocking)

- [ ] After a deploy, run a new org image build, then start a workspace. Run
      `mokly serve` and a Vite dev server with its default settings. Open a
      preview of each. Check the page, the live reload, and a form POST.
      Check that the relay sees `Host` as `<label>-7682.on.boat.dev`.
- [ ] Check that a preview in a workspace from an older image shows the
      refusal of decision 214.
