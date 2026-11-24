# The test fake host ignores the host read limit

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/own-computers-milestone-8-builds-over-ef32` (pull request #686), review round 2, the wider fix of finding 110.
- **Location:** `worker/lifecycle/lifecycle-boat-test-support.ts:255` (`LifecycleBoat.status`), `worker/lifecycle/backend-test-support.ts:39-45`, `crates/cnd-host/src/commands/output.rs:24`, `crates/cnd-runner-interface/src/host/limits.rs`, and `src/shared/host.ts`.
- **Reason:** The branch that found it kept the large build output case on the host path with a sentence in the test guide, and this fix changes Rust and TypeScript host limits outside that branch.

- **Source:** Review.
- **Category:** Test.
- **Terms:**
  - **Fake host:** `LifecycleHost` of the lifecycle tests. It answers each host status read from the status reply of the fake provider, `LifecycleBoat.status`.
  - **Per-stream read:** the most bytes of one output stream that the host program returns in one status reply, 1,179,648 bytes, from `HOST_COMMAND_REPLY_MAX_BYTES / 16` in `crates/cnd-host/src/commands/output.rs:24`.
- **Background:**
  - The host program cuts each stream of a status reply at the per-stream read, and the Worker reads the rest in later replies.
  - The fake host returns a whole stream in one reply. The large build output case of `worker/lifecycle/build-output.test.ts` sends 2,100,000 bytes over the host path in one reply, which the real host program never sends.
  - `worker/sandbox/transport-command-status.test.ts` checks the provider reader with the same size. The test guide `worker/lifecycle/tests.md` says so.
  - Review finding 153 made the fake count UTF-8 bytes and cut before an incomplete character.
- **Problem:** The per-stream read lives only in the Rust host program, so the fake host cannot follow it, and no Worker test reads a large host output across several replies.
- **Impact if no action:** A Worker defect that only shows when a host output needs several replies passes the tests. A 2,100,000-byte host reply is still valid under the 18 MiB reply limit, so this is no product defect today.
- **Root question:** How do the Worker tests get host status replies with the size limits of the host program?
- **Options:**
  - **A.** Copy the value into the fake host, with a comment that names its Rust source. Effort: Small.
  - **B.** Add the per-stream read to the shared host limits in `crates/cnd-runner-interface/src/host/limits.rs` and `src/shared/host.ts`, with its row in `crates/cnd-runner-interface/tests/constants.rs`. Use it in `crates/cnd-host/src/commands/output.rs` and in the fake host. Add a host case that reads a large output across several replies. Effort: Medium.
- **Left out:** Running the host case with the Rust host program: it adds a native process to the Worker tests, and `crates/cnd-host/tests/commands_tests.rs` already checks the host's own read.
- **Wider fix:** B. One shared value then serves the host program and every test.
- **Previous examples:** Review finding 153 of pull request #686 aligned the byte offsets of the same fake with the host reader.
- **Recommendation:** B. The fake then follows the real host by construction.
- **Action:** fix after merge, apply B, because it changes host limits in Rust and TypeScript outside the branch that found it, and it guards a test gap, not a product defect.
