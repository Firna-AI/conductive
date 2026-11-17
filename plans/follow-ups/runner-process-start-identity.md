# Distinguish runner restarts from connection retries

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from `calummoore/stops-show-why-a-turn-stopped-ccqn`, decision 5.
- **Location:** `crates/cnd-runner-interface/src/runner_handshake.rs`, `crates/cnd-runner/src/state/store.rs`, `worker/chat/runner-diagnostics.ts`, and `docs/protocol/runner-warnings.md`.
- **Reason:** Cal approved the optional runner-start identity as a separate change on 17 November 2026. This branch implements that answer.

- **Decision:** Cal chose **5 = B** on **17 November 2026**: "5 = B - as a new worksapce under this parent". The answer authorizes a separate workspace under "agent stopped bug" #251 and a separate pull request into `main` from PR 439. The recorded reason for B is that existing connection and stream metadata cannot identify a process start.

- **Terms:**
  - **Runner:** The program in a workspace cloud computer that runs agent turns and connects to the Worker.
  - **Worker:** The service that stores workspace chat and writes operational logs.
  - **Hello:** The first runner message of a connection, defined by the Rust runner interface.
  - **Stream ID:** The saved event stream identity that survives runner process restarts.
- **Background:** Each workspace runs all agent turns inside `conductive-runner.service`. A restart ends every running turn in every session. The Worker logs runner connections, disconnections, and turn ends without a Stop request. Cal approved those logs on 17 November 2026. The approved scope uses existing connection metadata and requires a decision before adding a runner message field.
- **Problem:** No current hello field identifies one runner process start. A connection ID changes on each reconnect. The stream ID survives process restarts. The protocol version identifies the message format, not the program release or process start.
- **Impact if no action:** Operators can match connection changes and stopped turns. They cannot reliably distinguish each runner restart from a connection retry. A restart with no running turn has no recovered stopped turn to identify it.
- **Root question:** How should operational logs distinguish a runner restart from a connection retry?
- **Options:**
  - **A.** Keep the existing connection, stream, protocol, and turn metadata. State the limit in the protocol and operational docs. Cost: no new message field. Risk: some restart causes remain uncertain. Effort: Small.
  - **B.** Add an optional process-start ID to the hello in a separate change. Each process creates one ID and keeps it across reconnects. The Worker logs that ID. Older runners omit it and continue to work, with null in the log. Update Rust-owned messages, generated TypeScript, readers, safe warning fields, protocol docs, and affected Privacy text. Test reconnect identity, a new process identity, and older-runner compatibility. Cost: a compatible interface change and both gates. Effort: Medium.
- **Left out:** A Worker connection timestamp or generation identifies a connection, not a process start. A stored stream ID and software image version have the same identity gap. A local journal alone is lost when the computer stops. Only the runner knows whether it is a new process, so no third distinct approach meets the identity goal without equivalent new runner data.
- **Wider fix:** B. A process identity makes the difference explicit instead of inferring it from connection events.
- **Previous examples:** On 16 November 2026, workspace 134 connected 32 times. Twenty-one connects followed Worker deploys. Eleven did not, and only some had a known cause.
- **Recommendation:** B, in a separate change. It removes the ambiguity while preserving older runners. The existing diagnostic logs can ship independently.
- **Action:** fix after merge, apply B. PR 439 has merged. Cal approved the optional field and the separate change. Delete this item in the implementing branch after its focused checks pass.
