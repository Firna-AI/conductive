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
address as `Host`, as a browser on the sandbox would send it.

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
  origin helpers, the `listener_mode` value of each preview, and their
  tests. Moved in Milestone 3. Decision 214 decides whether the direct route
  stays for a sandbox without the relay.

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
- **Action:** ask the user, because each option adds a requirement that no
  protocol doc has. A and D also keep an old route for sandboxes outside
  the repository.

## Design

These are my design calls under decision 213, on 10 November 2026. The
reason follows each call.

### The relay program

- The relay is one Node program with no npm dependency. It runs on the
  private Node of the image. Reason: every option of decision 214 can ship
  one such file, and the relay needs only HTTP, sockets, and addresses.
- The preview backend owns the relay file, as the terminal backend owns
  its software. The answer to decision 214 gives its folder and its build.
- It listens on `127.0.0.1:7682`. Reason: loopback keeps it off the sandbox
  network. Port 7682 sits beside the terminal's 7681 and is rare for apps.
- `src/shared/previews.ts` holds the relay port and the header name.
  Reason: the Worker and the relay both import that folder.

### How the relay gets into a sandbox

This part follows the answer to decision 214.

- With option A, B, or C, the image build installs the relay file and an
  enabled systemd unit, `conductive-preview-relay.service`, with
  `Restart=always`. The unit runs as `user`, with no workspace marker,
  because the relay needs no workspace variable. Boat starts the enabled
  services after each resume and fork. Reason for a unit of its own: a
  restart of the runner, which each workspace start does, must not drop
  the open previews.
- With option D, one privileged command of the Worker writes the file to
  `/run/conductive/` and starts it with `systemd-run` as the transient unit
  `conductive-preview-relay`, as `user`, with a restart on failure.

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
  `127.0.0.1:<port>`, or `[::1]:<port>` to the preview hostname.

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

### The route choice in the Worker

- The Worker checks whether the relay runs by the state of its unit, not
  by a listener on port 7682. Reason: a user server on that port must not
  count as the relay. The open reads the unit state and `ss -H -ltn` in one
  command call.
- When the relay runs, the preview uses the relay route. Boat hosts port
  7682 in localhost mode, and the preview stores `relay` as its listener
  mode. The column holds text, so no migration is needed.
- In the relay route, a page load does not run the check again. Reason:
  the relay finds the address of the server for each connection, so the
  check only adds a command call to each page load. A failed upstream
  request, or a 401 or 403 from Boat, still drops the descriptor, so the
  next request checks again.
- When the relay does not run, decision 214 applies.

### Security

- The credential gate of each preview stays in the Worker. A request
  reaches the relay only through Boat's address with Boat's token, which
  only the Worker holds.
- The relay reaches only ports of its own sandbox. Each process in the
  sandbox can reach them already.
- A server that builds absolute links from `Host` now builds
  `http://localhost:<port>` links. Before, they named the Boat address. The
  browser can open neither, so no case gets worse. Redirects keep working,
  because the Worker maps them.

## Milestone 1: Documentation and protocol

Depends on: none

The protocol docs state the new requirements, so that the code below can
meet them.

- [ ] `docs/protocol/access-and-security.md`, "Port previews" and "Proxies
      and ports": a previewed server gets `localhost:<port>` as `Host`, and
      `http://localhost:<port>` as the `Origin` of the page's own requests
      (decision 213). Give the reason and the rejected alternatives.
- [ ] In the same doc: the relay answers only requests that reach it
      through the Boat address of its own port, and it reaches only ports
      of its own sandbox. Restate the redirect rule for the local address.
- [ ] `docs/protocol/workspace-tools.md`, "Port previews": a server that
      answers only its local address works in a preview with no change to
      its repository. Port 7682 belongs to the relay.
- [ ] `docs/architecture.md`, "Sandbox software": add the preview relay.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact.
- [ ] Check the previews row of the comparison page in
      `src/marketing/from-conductor/`. Change its status only when the
      claim rules ask for it.

## Milestone 2: The relay

Depends on: 1, and the answer to decision 214

The relay program exists, with its tests, and it reaches a sandbox in the
way that decision 214 gives. No Worker preview code uses it yet.

- [ ] Add the relay port and the header name to `src/shared/previews.ts`.
- [ ] Add the relay program as one file with no npm dependency, in the
      folder that the answer to decision 214 gives. Typecheck and lint it.
- [ ] With option A, B, or C of decision 214: stage the relay file, its
      start script, and `conductive-preview-relay.service` in the software
      step of `worker/lifecycle/image-software.ts`. `image/install.sh`
      installs them, enables the unit, and starts nothing. Update the
      image software test.
- [ ] Test the relay against real loopback servers:
  - [ ] Only the Boat `Host` of port 7682 gets an answer. `localhost:7682`
        and `evil.example:7682` get 403.
  - [ ] A missing, invalid, or out-of-range port header, and port 7682,
        get 400.
  - [ ] The server gets the method, the path, the query, the body, and
        `Host: localhost:<port>`. The port header, `_port_auth`,
        `Forwarded`, and `X-Forwarded-*` are gone. Other cookies and
        `Origin` stay.
  - [ ] A server-sent event reaches the client before the server ends the
        response.
  - [ ] A WebSocket upgrade gets the same `Host` rule, and frames pass both
        ways.
  - [ ] A server on `::1` only gets the request. With no server, the
        answer is 502.
  - [ ] A client that goes away ends the upstream request.
- [ ] Update the README of the folder of the relay. With option A, B, or
      C, also update `image/README.md` and `image/install.md`.

## Milestone 3: The Worker uses the relay

Depends on: 1, 2

Previews in a sandbox where the relay runs go through it. Decision 214
sets the behaviour where it does not run.

- [ ] Add the route choice to `worker/previews/listeners.ts` and
      `worker/previews/ports.ts`, as the design says.
- [ ] With option D of decision 214: the open starts the relay as a
      transient unit when it does not run, then checks again.
- [ ] Build the relay request in `worker/previews/headers.ts` and
      `worker/previews/origins.ts`: the relay address, the port header, the
      `Origin` map, and the redirect map.
- [ ] Apply decision 214 to a sandbox where the relay does not run. State
      that rule in "Port previews" of `docs/protocol/access-and-security.md`,
      in the same change as the code. Update "Sandbox software" in
      `docs/architecture.md` when the answer changes how the relay gets in.
- [ ] Test in `worker/previews/` with the fake Boat server:
  - [ ] When the relay runs, the open hosts port 7682 in localhost mode.
        Each request and each WebSocket upgrade goes to its Boat address
        with the port header.
  - [ ] A user server on port 7682 without the relay unit does not count
        as the relay.
  - [ ] A same-origin `Origin` becomes `http://localhost:<port>`. A foreign
        `Origin` stays.
  - [ ] A redirect to `http://localhost:<port>/x` or
        `http://127.0.0.1:<port>/x` reaches the browser on the preview
        hostname.
  - [ ] A page load in the relay route runs no check.
  - [ ] A sandbox where the relay does not run gets the behaviour of
        decision 214.
- [ ] Update `worker/previews/README.md`: the relay route, and the rule for
      a sandbox without the relay in place of the `.on.boat.dev` rule.
- [ ] With option A or D of decision 214: add a follow-up item that
      removes the direct route when no active preview uses it, as the
      stored listener mode shows.

## Milestone 4: Verification, commit, review, and pull request

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
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds. It says how an
      existing workspace gets the relay, from decision 214.

## Post-merge follow-up (non-blocking)

- [ ] After a deploy, start a workspace. With option A, B, or C of
      decision 214, run a new org image build first. Run
      `mokly serve` and a Vite dev server with its default settings. Open a
      preview of each. Check the page, the live reload, and a form POST.
      Check that the relay sees `Host` as `<label>-7682.on.boat.dev`.
- [ ] Check a preview in a workspace from an older image, with the
      behaviour of decision 214.
