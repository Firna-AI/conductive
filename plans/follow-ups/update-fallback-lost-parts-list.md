# Fallback rule for a lost parts list

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-22, from branch `calummoore/sandbox-start-issue-secrets-v2-ffdj`, review round 2, finding 7 and its check.
- **Location:** `switch_waits` in `crates/cnd-cli/src/update/presence.rs`, the pending branch of `apply` in `crates/cnd-cli/src/update/engine.rs`, and the fallback rule in the Updates section of `docs/protocol/sandbox-software.md`.
- **Reason:** no recorded user decision covers this case, and the options change which release starts.

- **Source:** Review. **Category:** Docs or spec.
- **Terms:**
  - **Fallback:** the start that returns to the previous release after a new release did not confirm its start. A pending marker keeps it due.
  - **Parts list:** the file `parts.json` in each version folder under `/opt/conductive/versions/`. It names the parts (`node`, `sdk-helper`, `system`) that the release uses.
- **Background:**
  - Cal's decision of 22 November 2026: a fallback switches to the previous release only when that release can use each part that it lists after the repair. Otherwise the start fails, and the next start tries again. Reason: the previous release can hold an older program that repairs nothing.
  - A disk loss can remove the parts list of the previous release. Then the updater cannot know which parts to repair or check.
  - The code switches in that case, as it did before the repair existed, and logs a warning. If it waited instead, no start could ever repair the list, so every start would fail until an operator acts.
  - The protocol doc and the public guide state the fallback rule and do not mention this case. The cnd-cli README describes the code.
- **Problem:** The switch for a lost parts list is a working-agent call, not a user decision. The protocol is silent on it.
- **Impact if no action:** The behaviour stays as coded, but the protocol and the guide do not describe it, and a later change can make every start of such a sandbox fail.
- **Root question:** What should a fallback do when the previous release has lost its parts list?
- **Options:**
  - **A.** Keep the switch, and record it in the protocol next to the fallback rule, with the reason that a wait could never end. Effort: Small.
  - **B.** Wait, so that the fallback never switches without a check. Cost: each start of such a sandbox fails until an operator acts. Effort: Small.
  - **C.** Read the list again from the previous release's own program with `update parts`, write `parts.json` again, then repair and check as usual. Switch with no list only when that program cannot give one. Cost: apply runs an older program as root in the runner pre-start, so it needs a time limit and tests. Effort: Medium.
- **Left out:** A switch after a set number of failed starts, because it can switch to a release that cannot run.
- **Wider fix:** None. The decision is the fix.
- **Previous examples:** On 2026-11-20, sandbox `bx_wfd6s4h2` lost the whole folder `versions/0.0.1311`, including its parts list.
- **Recommendation:** A. A double loss of a list and a part with the program intact is rare, and a wait blocks the sandbox for good.
- **Action:** ask the user, because no recorded decision covers the case.
