# Skills list can stay loading after a race

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from branch `calummoore/oslo-3u7a`, review finding 401.
- **Location:** `src/app/skills-lookup.ts:125`, `src/app/skills-lookup.ts:138`, `src/members/MemberComputerTab.tsx:61`.
- **Reason:** The race needs an admin's save during the first reads of the tab, and reopening the tab recovers. The fix rule defers a Rare Medium product bug whose fix does not get harder after the merge.

### 1. Skills list can stay loading after a race

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small.
- **Source:** Review.
- **Category:** Product bug.
- **Location:** `src/app/skills-lookup.ts:125`.
- **Terms:**
  - **Skills section:** the last section of the Cloud computer tab of the org settings. It names the org skills repository and lists the skills that a GitHub lookup finds.
  - **Lookup:** the request `GET /api/orgs/:orgId/settings/skills`. The Worker reads the saved repository itself and returns its skills or a notice.
- **Background:** The tab reads the settings and starts the lookup at the same time. The section hides a lookup answer that names another repository than the saved one. When the names differ, it reads the settings again once. `ComputerModel` serves the admin and member views of the app. The dev-only `MemberComputerTab` copies the same rule.
- **Problem:** On a first opening, an admin's save can make the lookup read repository A while the settings read B. The reread returns B again, and no request then looks up B. A failed reread also keeps the older settings and reads nothing more. In both cases the section shows a spinner that never ends. In another order, the reread proves the lookup newer, and the section looks up on GitHub a second time without need.
- **Impact if no action:** A member or an admin sees a permanent spinner in the Skills section until the tab reopens or the app reloads.
- **Root question:** How does the Skills section always end with the saved repository's list, or a notice with Try again, whichever answer is older or fails?
- **Options:**
  - **A.** After the settings reread, look up again when the names still differ. Apply this in both implementations. Keep obsolete answers hidden. Add a test with held responses. Effort: Small.
  - **B.** One shared loader for both entry points owns the reconciliation. Effort: Medium.
  - **C.** The Worker returns the settings and the lookup as one answer, and the settings stay available when the lookup fails. Effort: Large.
  - **D.** A settings counter in D1 that each save raises, returned in both answers, so the client refreshes the older side. Effort: Medium.
  - **E.** On a first opening with no shared settings yet, start the lookup after the first settings answer. Effort: Small.
  - **F.** When the reread fails, or the names still differ after the allowed refreshes, show the failed-lookup notice with Try again. Change the expected state at `src/app/computer-skills.test.ts:148` from loading to failed. Works with A, B, or E. Effort: Small.
- **Left out:** Polling, because the protocol looks up only at each load and each Save.
- **Wider fix:** F. It ends each state that cannot settle, whatever detail fails.
- **Previous examples:** Review finding 201 of the same branch, which added the reconciliation.
- **Recommendation:** A with F. A recovers from the race without slowing the common opening, and F ends every other state that cannot settle.
- **Action:** fix after merge, apply A and F, because the race is rare and reopening the tab recovers.
