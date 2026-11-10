# Refreshes could start from a clean image

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-07, option E of decision 107, from PR #21 round 3 finding 21. The user chose D and asked to keep this option for later. Updated on 2026-11-10 by branch `conductor/later-builds-from-software-image`, which did the build half of option E.
- **Location:** `buildSandboxIntent` in `worker/lifecycle/resource-intents.ts`, which chooses the start image of a refresh.
- **Reason:** the user asked to keep it for a later decision.

- **Background:**
  - Decision 107 accepts that a program which an earlier install left in the image can read the clone token of a later copy. `docs/protocol/github-tokens.md` states that risk.
  - Since branch `conductor/later-builds-from-software-image`, each build starts from the software image of its app software version, or from the provider's base image. No repository code has run there. So the build half of option E is done, and the next build removes a planted program.
  - A refresh still starts from the last org image. It fetches the new commits of each chosen repository, and runs neither the software step nor the install script.
- **Problem:** A planted program stays in each refreshed image and in every new workspace, until the next build replaces the image.
- **Impact if no action:** The accepted risk stays for refreshes, as decision 107 says.
- **Root question:** Should each refresh start where no repository code has run?
- **Options:**
  - **E.** Start every refresh from a clean image too, as each build now does. A refresh then copies each repository and runs the whole install script, so it is slower and costs more, and it loses the package caches. It also removes a planted program at each refresh. Effort: Medium.
  - **D.** Keep the accepted risk of decision 107 for refreshes. Effort: Small.
- **Left out:** A second clean cloud computer for each copy, and a Git proxy in the Worker, as decision 107 says.
- **Wider fix:** E.
- **Previous examples:** the check before decision 90 named this risk.
- **Related:** `plans/follow-ups/software-image-plan-rebase.md` records the remaining refresh work. On 10 November 2026, the user chose to keep push refreshes as today and make the daily refresh clean. The daily install-script rule stays open. Making every refresh clean would also change that push-refresh choice.
- **Recommendation:** E, when the cost of a full install for each refresh is acceptable.
- **Action:** ask the user, because E changes the cost of every refresh.
