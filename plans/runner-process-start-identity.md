# Runner process-start identity

Status: Active. On branch `calummoore/stops-identify-runner-process-starts-nbhf`, no pull request yet. The completing pull request deletes this plan.

Conductive's Worker logs runner connections, disconnections, and turn ends without a Stop request. Connection IDs change on reconnect. Saved stream IDs survive process restarts. Neither identifies one runner process lifetime.

## Approved decision

Cal answered stop diagnostics decision **5 = B** on **17 November 2026**: "5 = B - as a new worksapce under this parent". This request authorizes implementation through a separate pull request into `main`. No field decision remains open.

- **Severity:** Medium. **Effort:** Medium. **Source:** Design. **Category:** docs or spec.
- **Location:** `docs/protocol/runner-warnings.md` and the runner hello boundary.
- **Terms:** Runner means the process that runs every agent turn of a workspace. Hello means its first connection message. Stream ID means its saved event stream identity.
- **Background:** PR 439 added safe operational warnings. This branch starts at its merge, `273582d8a46fe4fc8ea108fa379324da1ac922d6`.
- **Problem:** Existing metadata cannot distinguish a process restart from a connection retry.
- **Impact if no action:** Operators cannot reliably identify runner restarts, including restarts with no active turn.
- **Root question:** How should operational logs distinguish a runner restart from a connection retry?
- **Options:**
  - **A.** Keep existing metadata and describe its limit. Effort: Small.
  - **B.** Add an optional process-start ID to hello. Keep it for one process lifetime. Carry it through saved connections and safe warnings. Older runners omit it and log null. Effort: Medium.
- **Left out:** Connection timestamps identify connections. Stream IDs and software versions do not identify process starts. A local journal can be lost. Provider lifecycle records miss runner starts inside a running computer. A goodbye can be lost at a crash. A numbered start event adds an unknown event for older Workers. A new stream ID breaks saved event continuity. A saved counter adds disk writes and can repeat after state loss. Service-manager IDs identify service invocations and need a fallback. A Worker restart verdict adds behavior that this change does not need. No third distinct approach meets the identity goal without equivalent runner data.
- **Wider fix:** B makes process identity explicit.
- **Previous examples:** Workspace 134 connected 32 times on 16 November 2026. Twenty-one connects followed Worker deploys. Eleven did not.
- **Recommendation:** B. It removes the identity ambiguity and preserves older runners.
- **Outcome:** Cal chose B and rejected A on 17 November 2026. Cal authorized this separate workspace under parent #251 and a separate PR from PR 439.

## Design

- **Orchestrator call, 17 November 2026:** Use the optional wire name `processStartId`. It states the identity's scope without implying a stop cause.
- **Orchestrator call, 17 November 2026:** Generate one lowercase version 4 UUID at CLI program startup, outside the runner reconstruction loop. Pass it into each link. Reconnects and update attempts that return to the same program keep it. A failure that ends the program leads to a new start and a new ID.
- **Orchestrator call after options check, 17 November 2026:** A replacement of the runner program in place is a new runner start. It makes a new ID even when the Linux process ID stays the same. This tracks runner program starts without a handoff between releases or a dependency on the service manager.
- **Orchestrator call, 17 November 2026:** Keep the ID out of the durable runner stream store. A new process must not reuse it.
- **Orchestrator call after options check, 17 November 2026:** Use lenient readers for this diagnostic field. An invalid ID must not reject hello or fail a saved connection restore. Keep only a checked UUID, a fixed `unknown` for another present value, or null for an unavailable value. This preserves connection behavior and bounds the saved field.
- **Orchestrator call, 17 November 2026:** Keep protocol version 2 and all version-pin rules. The optional field permits rolling updates without a new version.
- **Orchestrator call, 17 November 2026:** Select warning fields explicitly. A pre-hello connection has no ID. A turn end uses the connection current at commit. These choices preserve existing diagnostic timing and safe selection.
- **Implementor call, 17 November 2026:** Use a small CLI `RunnerStart` owner to make the ID and construct each link with it. This permits a controlled test of real UUID creation without a startup or update refactor.
- **Implementor call, 17 November 2026:** Derive the incoming hello shape and its normalized identity value from generated `RunnerHello`. Keep the raw numeric version for unsupported-version handling. This preserves Rust ownership of the message shape.
- **Implementor call, 17 November 2026:** Keep the normalized ID in `RunnerConnectionStore` metadata. Keep the small native WebSocket attachment unchanged. This preserves the existing socket authority boundary.
- **Implementor call, 17 November 2026:** Use the existing workspace interface crate as a CLI dev dependency. The controlled socket test then captures the real hello type without a new third-party dependency.
- **External docs implementor call, 17 November 2026:** Disclose a random ID for each program start in Privacy. Keep internal field names out of public prose.
- **External docs implementor call, 17 November 2026:** Keep the guides and legal dates unchanged. All twelve guides remain accurate. Both legal dates already read 17 November 2026.
- Keep connection authority, hibernation behavior, commit timing, Stop attribution, replay handling, and diagnostic failure tolerance.
- Change no turn behavior, service unit, service protection, stop cause, error payload, or timeout.
- Test process construction and transport with controlled boundaries. Never stop or restart `conductive-runner.service`.

Contract owners:

- [Runner warnings](../docs/protocol/runner-warnings.md).
- [Agent runner](../docs/protocol/agent-runner.md).
- [Version pins](../docs/protocol/version-pins.md).
- [Runner interface](../crates/cnd-runner-interface/README.md).
- [Runner](../crates/cnd-runner/README.md).
- [Worker warning guide](../worker/chat/runner-warnings.md).

## Milestone 1: Requirements and disclosures

Depends on: none

- [x] Update protocol requirements before implementation.
- [x] Read both legal pages, all five legal source files, and every public guide in full. Update each restated changed fact, including Privacy.
- [x] Align affected area READMEs and the Worker warning guide.
- [x] Check the approved decision and plan options in a fresh second pass. Preserve Cal's answer.

Evidence belongs in `.context/runner-process-start-identity/`.
The external audit is `reports/external-docs.md` in that folder.
The internal audit is `reports/internal-docs.md`. The options check is `reports/plan-options.md`.
The options check confirmed B and found no new user choice. Its corrections clarify startup scope and lenient readers.

## Milestone 2: Runner and Worker identity

Depends on: 1

- [x] Add the optional Rust-owned hello field. Create one ID per process and keep it across reconnects and runtime reconstruction.
- [x] Regenerate all shared TypeScript with the locked generator.
- [x] Carry identity through readers, active connections, saved runner connection records, restore paths, and all three safe warnings.
- [x] Prove reconnect stability, new-process identity, old hello and saved metadata compatibility, and safe field selection. Observe assertion failures first.
- [x] Preserve existing connection, transaction, Stop, replay, and diagnostic failure semantics through focused coverage.
- [x] Repeat each new async case ten times. Record per-test cost from one run.
- [x] Recheck code-facing READMEs and test guides against the final API and focused tests.
- [x] Apply Cal's answer to `plans/follow-ups/runner-process-start-identity.md`. Delete it after implementation and its focused checks pass.

Implementation evidence is in `.context/runner-process-start-identity/reports/implementation.md`.
Checks after the main merge and per-test costs are under `post-main/` in that context folder.

## Milestone 3: Verification, review, and pull request

Depends on: 1, 2

The merge of main at `9f1a3928321e9eeb7fd3698175f3f31801c9fa3f` had no conflict or manual resolution. Its preservation audit is `.context/runner-process-start-identity/merge-audit.log`.

- [x] Run early checks and focused tests. Run a safe smoke check with controlled construction and transport boundaries. Start no live runner. Stop or restart no service.
- [x] Run the complete npm gate, Rust format, workspace clippy, workspace tests, and musl release build. Verify generated drift.
- [x] Commit with Conventional Commits and push this workspace branch.
- [x] Review the complete diff against `origin/main` after push with the `implementation-review` skill. Check each finding independently. Apply the fix rule and re-review fixes.
- [x] Preserve main's release-only update at `23173c8440ee5b860dfd2025d72b00857beb6289`. Confirm that the reviewed identity diff is unchanged.
- [ ] Delete this plan after all other required work and review pass. Preserve its dated decisions in the PR description.
- [ ] Open a separate PR into `main`. Watch every workflow of the final commit to its end. Leave the PR for a member to merge.

Combined gate evidence is `.context/runner-process-start-identity/post-main/gates.json` and its named logs.
The independent review found no in-scope or outside-scope problem. Its record is `.context/reviews/calummoore/stops-identify-runner-process-starts-nbhf/findings.md`.
The release merge had no conflict or manual resolution. Its preservation evidence is `.context/runner-process-start-identity/release-main/`. Final PR CI verifies the combined tree.
