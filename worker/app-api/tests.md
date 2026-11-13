# App API tests

Run the commands in [Development](README.md#development) from the repository root.

- `boot.test.ts` checks the boot routes, the saved preferences, the
  encrypted logins, and a missing model list. Two users save different
  defaults, New workspace views, shortcut changes, and logins, including a Codex ChatGPT
  sign-in. After each save and a delete, each reads only their own account
  and Get started step.
  `boot-account.test-support.ts` holds the account helpers of that test.
  `boot-account-isolation.test-support.ts` holds its two-user scenario.
- `shortcuts.test.ts` checks ordered saves, empty overrides, reset by row
  deletion, separate keyboards, rejected batches, fixed keys, and retired
  commands in account and save replies. It saves and reads the shared
  Create PR command ID. Its stored-data cases also check
  recovery from unreadable keys and JSON without losing valid keys.
- `agent-login-secret.test.ts` checks that a saved login keeps no
  whitespace, and that a read removes the whitespace of an older login.
  It also checks that a runner without ChatGPT support gets no ChatGPT
  login and reports the next steps for a turn that it cannot run.
- `agent-endpoint-login.test.ts` checks both agents, encrypted addresses
  and keys, safe account metadata, the address rule, and share defaults.
- `endpoint-models.test.ts` checks discovery at save and Refresh, private
  account data, model lists in share replies, failed reads, unmatched lists,
  and replacement during a read.
- `codex-device.test.ts` checks the device exchange, encrypted storage,
  account isolation, expiry, and overlapping polls.
  Repeated finished polls keep the current share setting, failure cause, login kind, and removal.
  `codex-device-failure.test.ts` keeps the failed exchange and safe-cause checks.
  `codex-device-owner.test.ts` checks that an approved exchange commits after the polling client leaves.
  `codex-device-login-change.test.ts` checks removals, API key saves, and newer
  ChatGPT sign-ins before polling, between OpenAI calls, and before the final save.
  It also checks the accepted save-and-remove return to an absent login.
  Its OpenAI replies come from `codex-device.test-support.ts`.
- `agent-login-reuse.test.ts` checks the login-kind defaults, the private
  preference update, and unchanged secret data and timestamps.
- `agent-login-migration.test.ts` checks that the table rebuild keeps
  existing login values and accepts Codex tokens.
- `feature-github-install.test.ts` checks the install link of the GitHub
  App, and the default app when the slug is missing or not valid.
- `shell-resources.test.ts` and `chat-read-state.test.ts` check the lists,
  the private views, the encoded workspace IDs, the archived writes, and
  the read marks.
- `chat-create-journey.test.ts` boots the shell, creates a workspace, and
  delivers the first message through a Stop and a resume.
- `machine-credentials.test.ts` checks the two machine credential routes.
- `feature-shell-settings.test.ts` checks shared scripts, encrypted env
  values, secret marks, mark changes without replacement values, member
  reads, and refused member writes through the Worker.
- `feature-shell-sections.test.ts` checks section order, private collapse,
  workspace moves, section deletion, and workspace event publication.
- `feature-workspaces-data.test.ts` and `feature-sections-data.test.ts`
  commit a second move just before the batch of a first move. They check
  that the order keeps both moves: a move out of the target section, two
  moves in one section, and two section moves. They also check refused
  moves when an org suspension commits before the batch, and a move
  without `sectionId` after the workspace moved to another section.
- [`workspace-data.test.ts`](../lifecycle/workspace-data.test.ts) in the
  lifecycle folder checks that a new workspace lists first, before and
  after a move. It runs with the lifecycle tests.
- `shell-list.test-support.ts` gives these three test files their org,
  sections, and rows. Its D1 wrapper commits the second move of the move
  tests.
- `feature-shell-github.test.ts` checks the user's GitHub access, paginated
  repository reads, saved org initials, and admin repository selection.
- `feature-org.test.ts` checks the repository requirement, the first build,
  and a failed build start that keeps the org.
- `feature-settings-builds.test.ts` checks the install script change in
  the build history before and after the first image.
- `feature-repository-builds.test.ts` checks the admin's repository build,
  repeated saves, removals, adds after a failed build, and a failed start
  that keeps the choice.
- `feedback.test.ts`, `feedback-refusals.test.ts`, and
  `feedback-body.test.ts` check the feedback routes with a fake Resend, as
  [Feedback routes](feedback.md#development) says.
- `codex-device-endpoint.test.ts` checks a switch from an own endpoint to
  ChatGPT and back, including metadata cleanup.
