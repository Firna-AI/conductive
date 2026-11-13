# Remove agent runner protocol version 1

Status: Active. [PR #339](https://github.com/Firna-AI/conductive/pull/339) is open.
The pull request that completes this work deletes this plan.

Conductive will refuse unsupported runners before it sends any command.
Every accepted turn uses the model gateway. No real agent login reaches a sandbox.

## Approved decision

Cal approved this removal on 12 November 2026: "we can remove version 1 now, no one is using it anymore".
Cal requested the plan, implementation, review, and pull request in the same task.
This approval covers deletion of version 1 functionality, tests of that functionality, and its documentation.
It chooses option B of [the runner follow-up](https://github.com/Firna-AI/conductive/blob/379f60628/plans/follow-ups/runner-update-at-start.md), without its one-time workspace move.
It reverses gateway decision 2 and Cal's 9 November 2026 choice to give real logins to version 1 runners.
The reversal date is 12 November 2026.
The rejected alternatives are runner updates at each start, a scheduled refusal, and continued compatibility.
Cal reports that nobody uses version 1 anymore.
The production inventory cannot run here. Wrangler reports: "You are not authenticated".
Evidence: `.context/remove-runner-protocol-v1/production-inventory.txt`.
This change does not rebuild org images. An old image needs an admin to build it again before new workspaces can run agents.

This change has its own pull request.
It does not include the Rust sandbox software work on `calummoore/porto-vtqz`.
Milestone 5 of [that plan](https://github.com/Firna-AI/remote-code/blob/calummoore/porto-vtqz/plans/rust-sandbox-software.md) waits for this removal to merge.

Contract owners:

- [Agent runner](../docs/protocol/agent-runner.md).
- [Version pins](../docs/protocol/version-pins.md).
- [Model gateway](../docs/protocol/model-gateway.md).
- [Worker README](../worker/README.md).
- [Runner README](../runner/README.md).

## Design calls

These are agent calls dated 12 November 2026.

- Keep the version pin column and image allocation mechanism for later versions.
  A missing recorded version still means the oldest image generation in stored metadata.
  It never permits an unsupported runner. Remove the runtime fallback to a legacy wire format.
- Require the supported wire version independently of the workspace pin.
  A supported runner remains usable in a workspace with an older or missing pin.
  No migration, runner installer change, or workspace move is needed.
- Use the existing turn failure path to explain an unsupported runner when that path can safely persist the failure.
  Use one refusal reason that tells the member to rebuild the org image, then start a new workspace.
  Cal stated on 12 November 2026: "Prefer a clear failure that says to create a new workspace, if a path for it exists".
  Use existing turn and start failure paths. This changes no screen or user flow.
  Fail obsolete runners. Close a future-version connection without failing its turns.
- Parse hello versions as positive integers. Use one support helper for handshake and saved connection restoration.
  Invalidate unsupported saved connections without throwing from the Durable Object constructor.
- Keep historical plan records intact. Update live requirements and follow-up facts.
  Close only follow-up items whose entire problem this change fixes.

## Replaced ways

- Legacy login-bearing turns and messages become gateway token turns and credential-free messages.
  Consumers include `src/shared/runner.ts`, Worker command preparation and dispatch, login access and availability, session metadata, connection storage, and runner parsing.
  Move their tests and fixtures in Milestone 2. Delete all obsolete wire types and branches there.
- Version 1 acceptance becomes rejection before welcome and commands.
  Consumers include the hello parser, handshake, saved connection restoration, fake runner, native socket fixtures, and integration fixtures.
  Move consumers and remove compatibility fallbacks in Milestone 2.
- Version-specific login and risk prose becomes the single gateway contract.
  Consumers include architecture, protocols, Worker and runner docs, shared contracts, public guides, and legal pages.
  Move them in Milestone 1. Follow-up cleanup runs in Milestone 3.

Options check: `.context/remove-runner-protocol-v1/options-check.md`.
The check recommended a shared support predicate, safe restoration, and rebuild advice.
Those corrections are part of the design above.
Messages from the orchestrator to delegates are agent instructions, not additional user approvals.

## Milestone 1: Documentation and protocol

Depends on: none

- [x] Check the supplied facts against code and search for other consumers.
- [x] Update internal requirements and area docs for gateway-only operation and unsupported-runner refusal.
  Evidence: `.context/remove-runner-protocol-v1/internal-docs.md`.
  Move the naming requirements to a linked page to keep the touched protocol doc below its length target.
  Close the obsolete tool-process check in `plans/boat-native-remote-workspaces.md`.
- [x] Read both legal pages and every public guide in full. Update each affected statement.
- [x] Check the comparison feature rows and update any affected status.
- [x] Check relative Markdown links in changed files.
  Evidence: `.context/remove-runner-protocol-v1/combined-links.txt`.

## Milestone 2: Remove legacy code and move tests

Depends on: 1

- [x] Delete legacy wire types, real-login dispatch, capability branches, and runtime fallbacks.
- [x] Reject unsupported hello messages and restored connections independently of the pin.
- [x] Use existing turn and start failure paths for obsolete runners. Preserve login availability metadata.
  Give the rebuild and new-workspace remedy. Keep future-version refusal nondestructive.
- [x] Move live test assertions and fake runners to gateway credentials. Remove tests only for deleted behavior.
- [x] Verify refusal for old and missing pins, supported runners with old pins, and absence of real logins on the wire.
- [x] Run targeted checks, new async tests ten times, and break proofs for new regression tests.

Evidence: `.context/remove-runner-protocol-v1/code-report.md` and `.context/remove-runner-protocol-v1/root-targeted.txt`.

## Milestone 3: Follow-ups and verification

Depends on: 2

- [x] Read all five named follow-ups. Delete only fully resolved items and update remaining live facts.
- [x] Attempt a read-only production runner inventory only if credentials and an authorized route exist. Record any blocker.
- [x] Record a follow-up for the blocked read-only inventory of runners and old org images.
  Item: `plans/follow-ups/production-runner-inventory.md`.
- [x] Run the deletion audit and check all changed Markdown links.
  Evidence: `.context/remove-runner-protocol-v1/implementation-audit-before.txt` and `.context/remove-runner-protocol-v1/combined-links.txt`.
  Merge record: `.context/remove-runner-protocol-v1/merge-decisions.md`.
- [ ] Run `npm run check` with Node 24 after desktop and runner dependency installation.
- [x] Commit with Conventional Commits and push the branch. Record Cal's deletion approval.
- [ ] Review the complete diff against `origin/main` with the `implementation-review` skill after the push.
  Fix confirmed `fix now` findings, record other findings as follow-ups, and re-review once.
- [ ] Delete this plan after the other tasks pass.
- [ ] Open the pull request with the dated decisions, design calls, plan permalink, and follow-up outcomes.
