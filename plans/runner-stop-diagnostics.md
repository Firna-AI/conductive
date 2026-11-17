# Runner stop diagnostics

Status: Active. On branch `calummoore/stops-show-why-a-turn-stopped-ccqn`, no pull request yet. The completing pull request deletes this plan.

Cal approved decision 4, A + D, on 17 November 2026 and requested implementation and a pull request. Add a short instruction about the shared runner service. Add structured Worker warnings for runner connections, disconnections, and turn ends without a Stop request. Keep turn completion and the runner unit unchanged.

Decision 4 asked how agents, members, and operators learn why a turn stopped. A adds the agent instruction. B records a cause on each stopped turn and shows it in chat. C makes no change. D adds the Worker warnings. Cal chose A + D because they cover agents and operators with a small change. B belongs to the wider work. Cal's task message refines D to use available connection metadata. A new runner message field requires a separate decision before it is added.

The rejected wider work prevents agent commands from stopping the runner and changes its stop timeout. Another session owns it. This change records existing operational information. It adds no runner message field and preserves older runners and saved session instructions.

Contract owners:

- [Agent instructions](../docs/protocol/agent-instructions.md).
- [Agent runner](../docs/protocol/agent-runner.md).
- [Messages and attachments](../docs/protocol/messages-and-attachments.md).
- [Chat backend](../worker/chat/README.md).

## Design calls

The orchestrator made these calls on 17 November 2026 within Cal's approved scope:

- Emit a connection warning after its first accepted hello. A connection that closes before hello gets its connection warning before its disconnect warning, with unavailable metadata set to null. This keeps available protocol and stream metadata in the connect line without adding a wire field. An upgrade-time line is simpler and has the transport accept time, but lacks that metadata. Hibernation restore is not a connection event.
- Apply D to finished, stopped, and failed ends without a Stop request. Include the terminal state. The task says each end, so limiting the warnings to stopped turns would narrow its scope.
- Collect turn diagnostics inside the transaction and emit them after commit. Preserve first-request attribution for older records through the existing history reader. This keeps rollback and event replay from duplicating warnings.
- Keep diagnostics best effort. If a diagnostic-only legacy requester lookup fails, omit that warning and let completion proceed. A turn end after the runner closes has null current-connection metadata. This preserves turn behavior without claiming missing evidence.
- Reuse the connection ID, persistent stream ID, and protocol version. No release version or process start timestamp is available. A stream survives runner restarts, so it cannot identify a process start.
- A restored connection with an unsupported protocol version writes a disconnect warning from its matching saved record. A stale socket writes none. This covers the close before activation without changing connection authority or turn handling.
- Apply option F from the options check: new turns store `stopRequest: null` for known absence. A missing field keeps the older history fallback. This avoids full-history reads for new system-stopped turns and preserves older actual Stop attribution. Dropping the fallback, option C, would create false warnings for older Stops. A special case for login failure, option D, would leave other system stops exposed. Moving the read after commit, option E, would still hold the chat queue.
- State that an end the Worker does not observe can leave a gap in disconnect warnings. A Worker restart can cause such a gap. Do not infer an end time at the next connection or add a production deployment check to this change.
- Split the touched protocol pages that exceed the documentation length target. Keep the existing anchors as links and preserve all moved requirements. This applies the documentation rule without changing the contract.

The options check keeps the first-hello, terminal-state, post-commit, and existing-metadata choices. It changed its Stop-history recommendation from C to F after checking the creation marker. Report: `.context/runner-stop-diagnostics/options-check.md`.

## Post-merge follow-up (non-blocking)

[Runner process-start identity](follow-ups/runner-process-start-identity.md) records the separate decision about a compatible optional hello field. No code of this change depends on that choice. Cal explicitly requested the pull request after the gates, so the available-metadata implementation can proceed to that pull request while this separate choice remains open.

## Milestone 1: Documentation and protocol

Depends on: none

- [x] Document the shared service instruction and diagnostic warning requirements.
- [x] Read both legal pages and every public guide in full. Align each affected sentence, including operational data in the Privacy page.

External documentation review: `.context/runner-stop-diagnostics/external-docs.md`.
- [x] Check each changed Markdown relative link.

Relative link evidence: `.context/runner-stop-diagnostics/root-links.txt`.

## Milestone 2: Instruction and structured warnings

Depends on: 1

- [x] Add the short service instruction for new sessions.
- [x] Log runner connect and disconnect transitions through explicit safe field selection.
- [x] Log turn ends without a Stop request with workspace and turn identity and available runner connection metadata.
- [x] Preserve completion behavior, compatibility, replay, and hibernation behavior.
- [x] Prove new behavior with focused tests, assertion failures before the change, and ten passes of new asynchronous tests.

Implementation and test evidence: `.context/runner-stop-diagnostics/non-ui-report.md`.

## Milestone 3: Keep diagnostic reads small

Depends on: 1, 2

- [x] Keep new system-stopped turns from scanning the workspace history, while retaining older Stop attribution.
- [x] Document connection ends that the Worker does not observe as a best-effort limit.
- [x] Split the long touched protocol pages and prove that the moved content is preserved.
- [x] Check the change with focused regression tests and the options check.

Evidence: `.context/runner-stop-diagnostics/options-check.md`, `.context/runner-stop-diagnostics/option-f-report.md`, `.context/runner-stop-diagnostics/internal-docs.md`, `.context/runner-stop-diagnostics/split-proof/proof.txt`, and `.context/runner-stop-diagnostics/root-focused.txt`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

- [x] Run early checks and a diagnostic smoke test.

Smoke evidence: `.context/runner-stop-diagnostics/diagnostic-smoke.txt` and `.context/runner-stop-diagnostics/privacy-smoke.txt`.
- [x] Run the complete npm gate and the Rust gate, including static release build and generated-type drift check.

Gate evidence: `.context/runner-stop-diagnostics/verification.md`. Main integration evidence: `.context/runner-stop-diagnostics/merge-main.md` and `.context/runner-stop-diagnostics/capabilities-merge.md`.
- [ ] Commit with Conventional Commits and push the workspace branch.
- [ ] Review the complete diff against `origin/main` with the `implementation-review` skill. Check findings, apply its fix rule, and review fixes.
- [ ] Delete this plan under the `plans` skill. Preserve its dated decisions and design calls in the pull request.
- [ ] Open a pull request into `main` and watch CI to its end.
