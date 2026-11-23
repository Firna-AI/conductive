# The Choose repositories words are copied

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, a new problem that the check of finding 3 of review round 1 found, branch `calummoore/new-repo-build-recreation`, plan `plans/added-repository-builds.md`.
- **Location:** `src/shell/new-workspace/notices.tsx:130` (`repositoriesFirst`), `docs/mockups/src/components/new-workspace/notices.tsx:63` and `:71` (`chooseRepositoriesFirst`, `adminChoosesRepositories`).
- **Reason:** the copy has been on `origin/main` since pull request #73, before the plan that found it.

- **Source:** Review. **Category:** Code structure.
- **Terms:**
  - **Shared UI:** the parts, styles, and words that the app and the mockups both use, in `src/ui/`. Since the user's decision of 2026-11-23, a module that the app uses lives there, and the mockups import it. A lint rejects an import of `docs/mockups/` in shipped code. `src/ui/README.md` gives the rules.
- **Background:**
  - The mockup module `docs/mockups/src/components/new-workspace/notices.tsx` holds the words of the notice that asks for repositories first, and it also imports `ScreenLink` and `paths.ts`.
  - The app may not import that module, because it imports catalogue links and lives in `docs/mockups/`. So `repositoriesFirst` in `src/shell/new-workspace/notices.tsx` copies those words.
- **Problem:** A change of the words in the mockups does not reach the app.
- **Impact if no action:** The app and the spec can drift apart at the next change of the words.
- **Root question:** How do the app and the mockups share the words of the Choose repositories notice?
- **Options:**
  - **A.** Move the words into a copy module in `src/ui/components/new-workspace/`, and import it in the app and in the mockup notices. Effort: Small.
  - **B.** Split the mockup `notices.tsx`. Move its words and the parts without catalogue imports into `src/ui/components/new-workspace/`, where the app imports them. Keep `ChooseRepositoriesButton` and `ChooseRepositoriesNotice`, which import `ScreenLink` and `paths.ts`, in the mockups. Effort: Small.
- **Left out:** A third approach is not real: the words live either in a module that the app can import or in two places.
- **Wider fix:** B. The shared module then holds the notice words and parts, so later words in it are shared too.
- **Previous examples:** The waiting repository notice of New workspace had the same copy until finding 3 of the same review moved it into a shared module.
- **Recommendation:** B. It removes the cause for every later word in that module.
- **Action:** fix after merge, apply B, because the copy is outside the change that found it.
