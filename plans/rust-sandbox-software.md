# Rust sandbox software with automatic updates

Status: Active. On branch `calummoore/porto-vtqz`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The app's own sandbox software installs only in an org image build. A
refresh and an existing workspace keep their old software, so a fix
reaches a sandbox only through a new workspace or a manual install in the
sandbox. This change moves the sandbox software into one Rust program,
`conductive`, that updates itself and the other parts of the software
with the `cli-updater` crate of `futex-ai/cli-release`. A small Node
helper keeps running only the Claude Agent SDK and the Codex SDK, because
those SDKs exist only in TypeScript and Python. The change does not cover
the removal of runner protocol version 1, which ships as its own change, and it does
not move the Worker to Rust.

## Decisions

Each decision comes from the brainstorm of 12 November 2026. The notes
are in `.context/rust-sandbox-software/notes.md`.

- **1. How every sandbox gets new software.** Chosen by the user on 12
  November 2026: the Rust program uses `cli-updater` as a library, inside
  the program, and checks the version when it loads. Rejected: the Worker
  installs the software at each start, a start that downloads only the
  changed parts, a separate resident updater service, and updates over
  the runner connection. This choice reverses decision 148 A of
  `plans/boat-native-remote-workspaces.md` and the rule of
  `docs/protocol/port-previews.md` that only a build installs the
  software of a sandbox.
- **2. Older runners of protocol version 1.** First deferred by the user
  on 12 November 2026. Then answered by the user on 12 November 2026:
  remove runner protocol version 1 now, because no one uses it. This is
  option B of `plans/follow-ups/runner-update-at-start.md` without its
  one-time move of workspaces. It reverses gateway decision 2 and the
  user's choice of 9 November 2026 that a runner of version 1 keeps
  getting the real login. The Rust runner and the Rust CLI then need only
  the version 2 messages. Item 9 of the brainstorm asks where the removal
  ships.
- **3. Which parts move to Rust.** Chosen by the user on 12 November
  2026: D. The runner core, the workspace CLI and MCP server, and the
  installer move to Rust now. A Node helper runs only the two SDKs. This
  changes decision 63 of `plans/boat-native-remote-workspaces.md` from D
  to C, apart from the Rust backend move of
  `plans/follow-ups/move-backend-to-rust-and-postgres.md`. Rejected: no
  Rust now, a Rust installer only, and the installer with the workspace
  CLI only. Left out: a Rust runner with no Node, because the stream
  protocol of the `claude` program is not a published stable API.
- **4. Where sandboxes find the newest version.** Chosen by the user on 12
  November 2026: A. Each deploy writes the release files and one JSON
  file in the `cli-updater` format to the R2 bucket `conductive-runner`.
  The JSON file sits at `releases/latest/conductive/<target>`, and the
  base URL is `https://runner.conductive.build`. `HttpReleaseClient` of
  `cli-updater` reads it unchanged. Rejected: Worker routes, a
  `cli-release-server` on GitHub Releases with or without a token, one
  JSON file in each GitHub release, and a bucket provider for
  `cli-release-server`. A later `cli-release-server` with a bucket
  provider can serve the same paths with no change in any sandbox.
- **5. When a sandbox checks and applies an update.** Chosen by the user
  on 12 November 2026: D. The program checks for an update, downloads it
  in the background, and applies it at the next restart. A start never
  waits for a download. Rejected: an update before each start, a check
  at each command, and a restart during a session.
- **6. Which builds become sandbox updates.** Chosen by the user on 12
  November 2026: A. Each deploy from `main`. The runner keeps matching
  the Worker. Rejected: B, each release together with the Mac app,
  because the runner then lags the Worker until the next release.
- **7. How the gate checks the Rust code.** Chosen by the user on 12
  November 2026: B. A separate Rust CI job, which the `Protect main`
  ruleset requires. Rejected: Rust checks inside `npm run check`, and a
  job that is not required.
- **8. Where the shared message types come from.** Chosen by the user
  on 12 November 2026: B. Rust owns the runner, helper, and workspace
  tool messages now, and `ts-rs` writes their TypeScript. Rejected: A,
  C, D, E, and F, as
  [Decision 8](#decision-8-where-the-shared-message-types-come-from)
  gives. The options check recommended D. This choice changes the design
  call of the backend move plan that keeps `src/shared/` until the
  switch, for these messages.
- **9. Where the removal of protocol version 1 ships.** Chosen by the user
  on 12 November 2026: A. A separate workspace runs it, with its own plan
  and pull request, on branch `calummoore/oslo-o65g`. Milestone 5 waits for that pull request to merge, so
  that Rust models no version 1 message.

## Design calls

These are the agent's calls of 12 November 2026. The user can change
each one.

- One Rust program, `conductive`, with subcommands: `runner`, `relay`,
  `mcp`, `git-credential`, `update`, and the workspace tool commands.
  Reason: one update path then covers each part.
- The preview relay and the git credential helper also move into the
  program. Reason: they have no npm dependencies, so Node then runs only
  the SDK helper.
- The release holds the program and a parts list. Each other part has its
  own file in R2, whose name holds its SHA-256 digest: the private Node,
  the SDK helper with its packages and agent programs, the systemd units,
  and the terminal scripts. The program installs each part whose digest
  changed. Reason: `cli-updater` replaces only one program file, and a
  part that did not change needs no download.
- The JSON file of each release always holds the digest. The program
  refuses a release file without a digest, or with a wrong one. Reason:
  the deploy always writes the digest, so this refuses only a broken
  release.
- The program downloads each update into its own version folder under
  `/opt/conductive/versions/`. It passes the program path in that folder
  as the install path of `cli-updater`. At the next start of the runner
  service, it switches the link `/opt/conductive/current` to the newest
  complete folder. Reason: a tool call and the running runner then never
  mix two versions.
- The program checks at each start and every hour while it runs. A failed
  check or download keeps the current version and logs a warning.
  Reason: one restart then applies an update, and graceful handling
  keeps the sandbox working.
- The program keeps the previous version folder. When the new version
  fails its start check, the next start goes back to the previous folder.
- The sandbox version is `0.0.<count>`, where `<count>` is the commit
  count of `main` at the deploy. Reason: `cli-updater` installs only a
  higher semantic version, and the app's `vX.Y.Z` does not change on each
  commit.
- The JSON file of the newest release has a cache time of about one
  minute. Each other release file never changes. Reason: an old cached
  JSON file then only delays an update.
- The release target is `x86_64-unknown-linux-musl`. Reason: Boat
  sandboxes are Linux x64, as the private Node archive shows, and a
  static program needs no system libraries.
- An org image build installs the newest release through the program, not
  through `image/install.sh`. Each build sandbox and each workspace
  sandbox then use the same install code.
- A sandbox without the program gets it once from the startup command of
  the workspace, at its next start. The startup command only checks that
  the program exists, and it changes nothing else. Reason: an existing
  sandbox has no other path to its first updater.
- The apt packages of the terminal, `ttyd` and `tmux`, stay in the image
  build. The terminal scripts and units become release parts. Reason:
  Ubuntu owns the packages.
- The Worker keeps support for each runner protocol version that a live
  sandbox can hold. A sandbox gets an update only at its next restart, so
  the Worker must serve that gap.
- The Rust code lives in a Cargo workspace at the repository root, with
  its crates under `crates/` and the prefix `cnd-`, as the backend move
  plan says.
- The first-start measurement tools of `runner/scripts/` stay Node tools.
  They move into the helper package.
- The `Rust gate` job runs on the GitHub-hosted `ubuntu-24.04` runner,
  not on Blacksmith. Reason: PR #310 moved every Linux job there, and
  `AGENTS.md` states that rule. Milestone 2 first named Blacksmith.

## Decision 8: where the shared message types come from

### 8. Shared message types for the Rust runner

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Code structure.
- **Location:** `src/shared/runner.ts`, `src/shared/events.ts`, `src/shared/agent-tools.ts`, `src/shared/runner-contracts.md`.
- **Terms:**
  - **Shared contracts:** the TypeScript types in `src/shared/` that the Worker, the web app, the runner, and the workspace tools use. About 105 files import the runner types.
  - **ts-rs:** a Rust crate that writes TypeScript types from Rust types.
- **Background:** The Rust runner and the Rust workspace CLI must send and read the same messages as the TypeScript Worker. The `shared-types` and `rust` skills say that Rust owns each type that crosses to TypeScript, and that TypeScript imports the generated type. The design call of the backend move plan keeps `src/shared/` as it is until that move ends. The runner messages include the chat events, which the web app also reads.
- **Problem:** Two languages must agree on one message format, and the rules disagree on the source.
- **Impact if no action:** Milestones 5 to 11 cannot start. Hand-written copies can drift, and a drifted field can lose or break chat events.
- **Root question:** How do the Rust programs, the TypeScript Worker, and the Node SDK helper write and read the same JSON and limits while the Worker stays TypeScript? The options check of 12 November 2026 gave this root question. Reason: a lost chat event can also come from the Worker's readers, a serde attribute, or a byte limit.
- **Options:**
  - **A.** Write the Rust types by hand. Shared JSON fixtures, which the TypeScript tests write, prove that both sides read the same messages. Cost: two copies of each type, and a fixture test for each message. Effort: Large.
  - **B.** Rust owns the runner, helper, and workspace tool messages, in a `cnd-runner-interface` crate. `ts-rs` writes their TypeScript into `src/shared/generated/`, and the Worker and the web app import it. Cost: the chat event types and each type that they use move to Rust now. About 520 files outside `runner/` and `tools/` import those types. `ts-rs` writes `T | null` for an omitted field and `bigint` for a 64-bit number, and it writes no constants. Effort: Large.
  - **C.** TypeScript stays the source. A tool writes a JSON Schema from the TypeScript types, and a Rust generator writes the Rust types from it. Cost: two new generators, and complex TypeScript types can lose detail in the schema. Effort: Large.
  - **D.** Choose the source for each boundary. Added by the options check. The Rust interface crate owns the new helper protocol, and `ts-rs` writes its TypeScript into the helper package. The runner protocol and the tool routes keep `src/shared/` as their source until the backend switch. Rust copies by hand only the types that it uses. After the removal of protocol version 1, these are the version 2 forms only. One committed set of JSON examples holds one example for each message variant, and cases for the byte limits, the output filter, lone surrogates, and number forms. The TypeScript tests read each example through the Worker's real readers, and the Rust tests read and write each example with serde. Cost: about 110 Rust types stay copies until the switch, and each new variant needs an example. Effort: Large.
  - **E.** Rust owns all three boundaries now, and the TypeScript importers move one type at a time. Added by the options check. `ts-rs` writes into `src/shared/generated/`, and the hand-written types stay. One typecheck file asserts that each hand-written type equals its generated type. Cost: the check needs helpers for `readonly` and literal fields, and it does not check the Worker's readers or the limits. Effort: Large.
  - **F.** Runtime schemas in TypeScript, for example with zod, become the source. Added by the options check. They give the TypeScript types, the Worker's readers, and a JSON Schema for a Rust generator. Cost: a new Worker dependency, a rewrite of the Worker's readers, and work that the backend move throws away. Effort: Large.
- **Left out:** A neutral schema file, such as JSON Schema or TypeSpec, with one generator for each language, because B is as good or better on each point. A custom TypeScript-to-Rust generator, because it is C with another tool.
- **Wider fix:** D. Only its examples check the Worker's readers, the serde attributes, and the limits. A generated type alone does not stop a field that a Worker reader drops (`worker/chat/agent-events.ts:117-133`).
- **Previous examples:** `plans/follow-ups/move-backend-to-rust-and-postgres.md` keeps `src/shared/` until the switch. The `shared-types` skill makes Rust the source when Rust is the backend.
- **Related:** Decision 3.
- **Recommendation:** D. It keeps the Worker as the source until the backend switch, and its examples catch a field that the Worker's readers drop. The first recommendation was B. If the user wants Rust to own the types now, add the examples of D to E.
- **Action:** ask the user, because the options have real trade-offs, and B and E conflict with the design call of the backend move plan.
- **Chosen:** B, by the user on 12 November 2026.

Contract owners:

- [Agent runner](../docs/protocol/agent-runner.md).
- [Org image](../docs/protocol/org-image.md).
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md).
- [Port previews](../docs/protocol/port-previews.md).
- [Architecture: sandbox software](../docs/architecture/components.md#sandbox-software).
- The [runner README](../runner/README.md), the [sandbox software README](../image/README.md), the [workspace tools README](../tools/README.md), and the [shared contracts README](../src/shared/README.md).

Replaced ways:

- The Node agent runner in `runner/src/` → the `conductive runner` subcommand and the Node SDK helper. Consumers: `image/runner-start.sh`, `image/conductive-runner.service`, `image/package-runner.mjs`, `runner/service/`, `.github/workflows/deploy.yml`, the `runner:typecheck` and `runner:test` scripts of `npm run check`, and the runner guides. Moved in Milestones 8 to 11. Deleted in Milestone 11.
- The Node workspace CLI and MCP server in `tools/` → the `conductive` workspace tool commands and `conductive mcp`. Consumers: `worker/tools/image.ts`, `worker/tools/image-assets.ts`, `tools/image-manifest.ts`, `runner/agent-tools.md`, and `tools/README.md`. Moved and deleted in Milestone 6.
- The Node git credential helper in `image/git-credential-helper.*` and the Node preview relay in `runner/src/relay/` → `conductive git-credential` and `conductive relay`. Consumers: `image/install.sh`, the relay units, and `worker/lifecycle/continue-commands.ts`. Moved and deleted in Milestone 7.
- The runner archive of each deploy, its two Worker variables, and `image/install.sh` → the release files in R2 and `conductive update`. Consumers: `worker/configuration.ts`, `worker/lifecycle/image-software.ts`, `worker/software-image/version.ts`, `.github/workflows/deploy.yml`, and `docs/deployment/runner-archive.md`. Moved in Milestones 3 and 4. Deleted in Milestone 11.
- The hand-written runner, chat event, and workspace tool message types in `src/shared/` → the types that `ts-rs` writes from the `cnd-runner-interface` crate into `src/shared/generated/`. Consumers: their importers in `worker/`, `src/`, `desktop/`, `runner/`, and `tools/`, about 520 files outside `runner/` and `tools/`. The runner and chat event types move in Milestone 5, and the tool types in Milestone 6.

## Milestone 1: Documentation and protocol

Depends on: none

The docs state the new update rules and the new shape of the sandbox
software before any code changes. No screen changes, so the plan has no
mockup milestone.

- [x] Update `docs/protocol/agent-runner.md`: the runner updates itself at the next restart after a release, and the reason of "Each build of the org image installs the newest runner" changes.
- [x] Update `docs/protocol/org-image.md`, "The software image": the program installs the newest release in a build, and an existing sandbox updates itself.
- [x] Update `docs/protocol/port-previews.md`: remove the rule that only a build installs the software of a sandbox. Record that decision 1 of this plan reverses it.
- [x] Update `docs/protocol/workspaces-and-sandboxes.md` and `docs/architecture/components.md#sandbox-software`: one Rust program, the Node SDK helper, the release files in R2, and the check, download, and restart rules of decision 5.
- [x] Update `docs/architecture.md` where it restates the software install rule.
- [x] Read the Terms page in `src/marketing/terms.ts` and the Privacy page in `src/marketing/privacy.ts` in full. Update each sentence that restates the install rule, such as the image build sentences near `terms.ts:79-97`. The removal of protocol version 1 changes the sentences about the version 1 login risk, not this change.
- [x] Read each public guide in `src/marketing/docs/` in full. Update each sentence that restates the install rule, for example `cloud-computer.md:138-148` and `agent-logins.md:238-245`. Follow `docs/protocol/website-docs.md`, and do not name Boat.
- [x] Check the Conductor comparison rows in `src/marketing/from-conductor/`. Change a row only when this change ships, starts, or drops its feature.
- [x] Add the Rust commands and the Rust CI job to `AGENTS.md`, `CLAUDE.md`, and `README.md`.

## Milestone 2: Rust workspace, program skeleton, and CI job

Depends on: 1

- [x] Add the Cargo workspace at the repository root, with `crates/cnd-cli` for the `conductive` program and a README for each crate, as the `rust` skill says.
- [x] Add `cli-updater` and `cli-release-interface` as git dependencies of `futex-ai/cli-release`, pinned to a full commit.
- [x] Give the program its subcommands with `clap`. Each subcommand that later milestones fill gives a clear "not available yet" error.
- [x] Add the `Rust gate` job to `.github/workflows/ci.yml`, on a Blacksmith runner: format, clippy, tests, and a musl release build.
- [ ] Ask an admin to add the `Rust gate` check to the `Protect main` ruleset, as decision 7 says. The change of the ruleset waits for that admin.

## Milestone 3: Release publishing in each deploy

Depends on: 2

- [ ] Build the program for `x86_64-unknown-linux-musl` in `.github/workflows/deploy.yml`.
- [ ] Package each part with a digest name. At first, the parts list holds the current runner archive and the private Node, so the Node runner keeps working.
- [ ] Upload the new files to R2 and check their public sizes, as the runner archive upload does now.
- [ ] Write the JSON file at `releases/latest/conductive/x86_64-unknown-linux-musl` last, with the version `0.0.<count>`, the absolute download URL, and the digest. Set a cache time of about one minute.
- [ ] A deploy of an older commit writes no JSON file, so the newest version never goes down.
- [ ] Update `docs/deployment/runner-archive.md` and `image/README.md`.

## Milestone 4: Updates in each sandbox

Depends on: 3

- [ ] Add `conductive update`: it reads the release through `cli-updater`, downloads the program and the changed parts into a new version folder, checks each digest, and marks the folder complete.
- [ ] At each start, the runner service applies the newest complete folder through the link `/opt/conductive/current`, then starts the software of that folder.
- [ ] While it runs, the program checks every hour and downloads in the background. A failure logs a warning and changes nothing.
- [ ] Keep the previous version folder, and go back to it when the new version fails its start check.
- [ ] Point the runner, relay, and terminal units at `/opt/conductive/current`.
- [ ] Make the `gh` wrapper, the git credential setting, and the udev rule `60-conductive-disk-cache.rules` release parts, so that no part of `image/install.sh` is left without an owner.
- [ ] Make the org image build and the software image build install the newest release through the program.
- [ ] Add the one-time install of the program to `workspaceStartupCommand` in `worker/lifecycle/image-software.ts`, for a sandbox without it.
- [ ] Update the READMEs that say only an image build installs the sandbox software, and that an existing workspace keeps it: `image/install.md`, `worker/terminal/README.md`, and `worker/previews/README.md`.
- [ ] Test the update logic with mocks of the `cli-updater` traits and of the disk, as the `rust` skill says.
- [ ] Run the live check in a real sandbox: an existing workspace gets the program at its next start, downloads a newer release, and applies it at the next restart. Save the evidence under `.context/rust-sandbox-software/`.

## Milestone 5: Rust-owned runner and chat event types

Depends on: 2, and the merged removal of runner protocol version 1

- [ ] Add the `cnd-runner-interface` crate. Define the runner handshake, commands, numbered events, and chat events of protocol version 2 in it, with serde attributes that keep the current JSON.
- [ ] Generate their TypeScript with `ts-rs` into `src/shared/generated/`. Mark each field that serde leaves out as optional in TypeScript, and give each 64-bit number the TypeScript type `number`, so the generated types match the JSON.
- [ ] Keep the byte limits and other constants in `src/shared/`, because `ts-rs` writes no constants.
- [ ] Point each importer in `worker/`, `src/`, `desktop/`, and `runner/` at the generated types, and delete the hand-written types. Use no converter.
- [ ] Add the generator, the regenerate command, the generated folder, and the wire form of 64-bit numbers to `AGENTS.md`, as the `shared-types` skill says.
- [ ] Ask the user before a check that fails on a diff of the generated files, because it is a new gate.
- [ ] Update `src/shared/README.md` and `src/shared/runner-contracts.md`.

## Milestone 6: Workspace tools in Rust

Depends on: 4, 5

- [ ] Define the workspace tool requests and replies in `cnd-runner-interface`, generate their TypeScript, and point the Worker's tool routes at the generated types.
- [ ] Port the 24 workspace tool calls of `tools/calls.md` to `conductive` commands and to `conductive mcp`, with the same options, replies, errors, and exit codes.
- [ ] Port the tests of `tools/` to Rust tests with mocked HTTP.
- [ ] Ship the tools in the release, and remove the separate tools install of `worker/tools/image.ts`.
- [ ] Delete the Node tools in `tools/` that the Rust commands replace. Keep the developer scripts of `tools/` that are not workspace tools.
- [ ] Update `tools/README.md` and `runner/agent-tools.md`.

## Milestone 7: Git credential helper and preview relay in Rust

Depends on: 4, 5

- [ ] Port the git credential helper to `conductive git-credential`, and point the system Git setting at it.
- [ ] Port the preview relay to `conductive relay`, with the socket activation of `conductive-preview-relay.socket`.
- [ ] Port the relay tests, which use real local servers.
- [ ] Delete `image/git-credential-helper.*` and `runner/src/relay/`.
- [ ] Update `image/github.md` and `runner/preview-relay.md`.

## Milestone 8: Node SDK helper

Depends on: 3, 4, 5

- [ ] Define the helper messages in `cnd-runner-interface`, and generate their TypeScript into the helper package.
- [ ] Move the Claude and Codex adapters of `runner/src/providers/` into a helper package that speaks JSON lines over stdin and stdout.
- [ ] Make the Node runner use the helper as a child process, so the helper works before the Rust runner exists.
- [ ] Ship the helper with its packages and agent programs as one release part.
- [ ] Move the first-start measurement tools into the helper package.

## Milestone 9: Rust runner: connection, events, and saved state

Depends on: 5

- [ ] Port the connection, the `hello`, the numbered events, the resends, and the state file with its recovery rules of `runner/README.md`.
- [ ] Port the event limits of `runner/event-limits.md`.
- [ ] Read a lone surrogate in a command, such as `\ud800` in user text from `src/shared/messages.ts`, without refusing the command. Replace it with U+FFFD, as the runner does for tool details. `serde_json` refuses such a string by default.
- [ ] Port the matching tests against a fake workspace endpoint.

## Milestone 10: Rust runner: files, Git, reports, and ports

Depends on: 9

- [ ] Port the file and changes reports of `runner/file-reports.md`, the report requests of `runner/reports.md`, the listening-port scan, and the restore marker watch.
- [ ] Port the matching tests with a temporary Git repository.

## Milestone 11: Rust runner: turns, and the switch

Depends on: 4, 6, 7, 8, 10

- [ ] Port the turn engine: turns, messages, interrupts, model changes, Stop, shutdown, background work, the output filter, the agent input, and the instructions.
- [ ] Drive the agents through the Node SDK helper.
- [ ] Port the matching tests with a fake helper.
- [ ] Switch the runner service to `conductive runner`, and remove the runner archive from the parts list.
- [ ] Delete the Node runner core, `image/install.sh`, `image/package-runner.mjs`, the two runner archive variables, and the `runner:typecheck` and `runner:test` steps that test deleted code. Keep the helper's typecheck and tests in `npm run check`.
- [ ] Run the live check of `image/developer-scripts.md` in a real sandbox. Save the evidence under `.context/rust-sandbox-software/`.
- [ ] Update `runner/README.md`, `runner/key-code.md`, and the other runner guides.

## Milestone 12: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the Rust gate, the targeted tests, and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the `implementation-review` skill after the push. Report the findings, then apply the fix rule: fix the `fix now` findings, record follow-up items under `plans/follow-ups/` for the rest, re-review once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the plan".
- [ ] Open the pull request. Its description gives the decisions and the design calls of this plan with their dates, a permalink to this plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] After the first deploy, check that an existing workspace updates at its next restart, with no manual step.
