# Provider error logs give only a code

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-27, from branch `calummoore/failed-message-action-kssx`, the logging finding of the investigation of the stuck workspace "ITSA full approval".
- **Location:** `worker/sandbox/errors.ts:26`
- **Reason:** the user has not answered it yet, and it is outside the disk hold change.

- **Background:** When a provider call fails, the Worker logs the provider's error code, such as `resume_failed`, but not its message. A comment in the code says: "Never copy upstream messages. They can contain a submitted secret." On 2026-11-26, the log showed only `resume_failed`. The real cause, a disk too big for the machine, appeared only in a manual call to Boat. Since 2026-11-27, Boat sends the clearer code `type_too_small` for that case, which the Worker already logs.
- **Problem:** Other causes that share one code still need a manual call to diagnose.
- **Impact if no action:** An operator spends more time on the next failure whose code is not specific.
- **Root question:** How does an operator learn why a provider call failed, without a secret reaching the logs?
- **Options:**
  - **A.** Log the provider's message, cut to a fixed size. This breaks the rule in the code comment, because a message can hold a secret. Effort: Small.
  - **B.** For known disk errors only, read the sizes out of the message and log the numbers. Effort: Small.
  - **C.** Change nothing, because Boat's new code `type_too_small` already names the cause. Effort: Small.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** Commit `a8c31a53c` added the provider code to this log.
- **Recommendation:** C, because the new code already names the cause, and copying messages breaks the secret rule.
- **Action:** ask the user, because the original question was the user's to answer.
