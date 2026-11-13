# A long saved script can pass the argument limit

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-13, from the check of finding 6 in review round 1 of the branch `calummoore/porto-6ebg`.
- **Location:** `worker/lifecycle/build-execution.ts:45`, `worker/http/request-body.ts:27`.
- **Reason:** the review found it in code that the branch did not change.

- **Terms:**
  - **Argument limit:** Linux refuses one process argument of 131,072 bytes or more. The sandbox provider starts each command as one argument.
- **Background:** `savedScriptCommand` puts the org's saved install script into the detached install command as base64. The settings route accepts a script up to the 1,000,000-byte body limit. The startup script takes the same path at each workspace start.
- **Problem:** A saved script over about 96 KB makes a command that the provider cannot start, with no clear output.
- **Impact if no action:** Such an org cannot build its image or start a workspace, and sees no reason.
- **Root question:** How does a saved script of any accepted size reach the sandbox?
- **Options:**
  - **A.** Limit saved scripts to a size that fits the command. It adds a new rejection. Effort: Small.
  - **B.** Upload the script with the provider's file write route, as `plans/follow-ups/image-files-through-upload.md` proposes for the image files. Effort: Medium.
- **Left out:** Change nothing, because an org gets no reason for the failure.
- **Wider fix:** B, with `plans/follow-ups/image-files-through-upload.md`.
- **Previous examples:** `0ab26e0d` split the tools install for the same limit.
- **Recommendation:** B. It keeps the accepted size and fixes the cause.
- **Action:** ask the user, because the review found it outside the branch.
