# A saved repository Add can report failure

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from branch `calummoore/perth-pk73`, review finding 1, the wider fix that the agent split off.
- **Location:** `worker/app-api/feature-repositories.ts`, `changeShellRepository`.
- **Reason:** The Add and Remove route was on `main` before that branch, and the branch fixed only the new move route.

- **Terms:**
  - **Repositories tab:** the tab of the org settings where an admin adds and removes the repositories of the org.
  - **GitHub catalogue:** the list of repositories that the GitHub App and the signed-in person can both reach. The Worker reads it from GitHub.
- **Background:** An admin adds or removes a repository on the Repositories tab with `PUT` or `DELETE` on the path of the repository. `changeShellRepository` saves the change in D1, starts a build after an add, and then answers with the whole list from `shellRepositoryChoices`. That function calls GitHub again to merge the GitHub catalogue into the list.
- **Problem:** When the GitHub call after the save fails, the route answers with an error, although the change saved. The tab then takes the change back and says that it failed. The move route had the same defect. It now answers from stored data only.
- **Impact if no action:** During a GitHub outage, an admin can see a failed Add or Remove that in fact saved and started a build. A reload shows the saved state.
- **Root question:** How does an Add or a Remove report the change that the server saved, when GitHub fails after the save?
- **Options:**
  - **A.** Load the GitHub catalogue once, before the save, and build the answer from it and the stored rows after the save. An add already loads it before the save. Effort: Small.
  - **B.** Answer with the stored list only, and let the client keep its catalogue entries, as the move does. This changes the reply of an existing route, so older clients need a compatible path. Effort: Medium.
  - **C.** After a failed change, the client reads the list again. Effort: Small.
- **Left out:** Catching the GitHub error and answering with stored rows only: it drops the catalogue entries from a list that promises them.
- **Wider fix:** A, one load of the catalogue for every repository write.
- **Previous examples:** The move route of the repository order, fixed on branch `calummoore/perth-pk73`.
- **Recommendation:** A. It keeps the reply and removes the second GitHub call.
- **Action:** fix after merge, apply A, because the route was on `main` before the branch that found it.
