# Builds could start from the clean base image

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-07, option E of decision 107, from PR #21 round 3 finding 21. The user chose D and asked to keep this option for later.
- **Location:** `worker/lifecycle/image-builds.ts:188`.
- **Reason:** the user asked to keep it for a later decision.

- **Background:** A refresh build starts from the last org image. Decision 107 accepts that a program which an earlier install left in the image can read the clone token of a later copy, and the access protocol states that risk.
- **Problem:** The planted program also stays in every later image and every new workspace.
- **Impact if no action:** The accepted risk stays, as decision 107 says.
- **Root question:** Should each build start where no repository code has run?
- **Options:**
  - **E.** Start every build and refresh from the clean base image, with no snapshot. A refresh then runs the full install, so it is slower and costs more, and it loses the package caches. It also removes a planted program at the next build. Effort: Medium.
  - **D.** Keep the accepted risk of decision 107. Effort: Small.
- **Left out:** A second clean cloud computer for each copy, and a Git proxy in the Worker, as decision 107 says.
- **Wider fix:** E.
- **Previous examples:** the check before decision 90 named this risk.
- **Recommendation:** E, when the cost of a full install for each refresh is acceptable.
- **Action:** ask the user, because E changes the cost of every build.
