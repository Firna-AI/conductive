# A failed first build could retry once

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, option D of the options check of decision 152 of the plan `plans/automatic-first-build.md`, branch `calummoore/box-auto-build-onboarding`.
- **Location:** `worker/lifecycle/image-build-failure.ts`, `worker/lifecycle/image-builds.ts` (`startImageBuild`), and the section "The org image" of `docs/protocol/workspaces-and-sandboxes.md`.
- **Reason:** the retry changes the decision of 5 November 2026 that a failed build waits for Try again, and the user did not ask about it.

- **Source:** Design. **Category:** Docs or spec.
- **Terms:**
  - **First build:** the build that makes the first org image of an org. Create org starts it by itself when the org is saved with its repositories.
  - **Provider retry:** the retry of a short fault of the sandbox provider, for up to 10 minutes, in `worker/lifecycle/provider-retry.ts`.
- **Background:**
  - On 5 November 2026 the user chose that an admin builds the org image with Build computer, also after a failure. That decision left out an automatic retry, because a broken install script fails again.
  - The first build of a new org runs the empty install script of a new org. An install script that an admin saves during the first build runs in one more build after the first good build.
  - So the first build fails only for other causes: the clone of a repository, the install of the software of the cloud computer, such as a network fault in a package download, or a provider fault that the provider retry did not end.
  - After a failed first build, Get started shows the failure with Try again, and New workspace keeps Send off with a notice.
- **Problem:** A short fault in the first build stops the onboarding until an admin presses Try again.
- **Impact if no action:** Some new users meet a failed build in their first minutes, for a cause that one more build would pass.
- **Root question:** How does a new org recover from a short fault in its first build with no manual step?
- **Options:**
  - **A.** Keep Try again for every failed build. Effort: Small.
  - **B.** When the first build of an org fails, the Worker starts one more build at once, with the first admin who is not suspended. A build that passed its 60-minute limit gets no retry. A second failure shows Try again, after about twice the wait. It costs one more paid build. Effort: Medium.
- **Left out:** A retry of every failed build. A broken install script fails again, and later builds have a last good image, so the org keeps working.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/workspace-waits-for-first-build.md`. Under its options, a retry also keeps a waiting workspace alive.
- **Recommendation:** B. The first build never runs a script of the user, so a second attempt is likely to pass a short fault.
- **Action:** ask the user, because B changes the decision of 5 November 2026 for the first build.
