# The Choose repositories words are copied

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, a new problem that the check of finding 3 of review round 1 found, branch `calummoore/new-repo-build-recreation`, plan `plans/added-repository-builds.md`.
- **Location:** `src/shell/new-workspace/notices.tsx:130` (`repositoriesFirst`), `docs/mockups/src/components/new-workspace/notices.tsx:63` and `:71` (`chooseRepositoriesFirst`, `adminChoosesRepositories`).
- **Reason:** the copy has been on `origin/main` since pull request #73, before the plan that found it.

- **Source:** Review. **Category:** Code structure.
- **Terms:**
  - **Mockups:** the visual spec of the app under `docs/mockups/`. The app imports their pure parts, but not parts that import catalogue links (`ScreenLink`, `paths.ts`), as `src/app/README.md` says.
- **Background:**
  - The mockup module `docs/mockups/src/components/new-workspace/notices.tsx` holds the words of the notice that asks for repositories first, and it also imports `ScreenLink` and `paths.ts`.
  - The app may not import that module, so `repositoriesFirst` in `src/shell/new-workspace/notices.tsx` copies those words.
- **Problem:** A change of the words in the mockups does not reach the app.
- **Impact if no action:** The app and the spec can drift apart at the next change of the words.
- **Root question:** How do the app and the mockups share the words of the Choose repositories notice?
- **Options:**
  - **A.** Move the words into a pure copy module beside the mockup notices, and import it in both. Effort: Small.
  - **B.** Move the catalogue parts (`ChooseRepositoriesButton`, `ChooseRepositoriesNotice`) out of the mockup `notices.tsx` into their own module, so that the app can import the rest. Effort: Small.
- **Left out:** A third approach is not real: the words live either in a module that the app can import or in two places.
- **Wider fix:** B. The mockup module that the app reads then holds no catalogue import, so later words in it are shared too.
- **Previous examples:** The waiting repository notice of New workspace had the same copy until finding 3 of the same review moved it into a shared module.
- **Recommendation:** B. It removes the cause for every later word in that module.
- **Action:** fix after merge, apply B, because the copy is outside the change that found it.
