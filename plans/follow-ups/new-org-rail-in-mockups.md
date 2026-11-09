# The first org shows other orgs in mockups

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from the check of the mockups of the plan `plans/automatic-first-build.md`, branch `calummoore/box-auto-build-onboarding`.
- **Location:** `docs/mockups/src/fixtures/orgs.ts:28`, `docs/mockups/src/screens/WorkspaceListScreen.tsx:97`, and the screens of `app/new-workspace/first-build` and `app/org-settings/cloud-computer/first-build`.
- **Reason:** the rail of `app/orgs/empty` was wrong on `origin/main` before the automatic first build, and the fix touches every page of the first org.

- **Source:** Review. **Category:** Mockup.
- **Terms:**
  - **Org rail:** the narrow column at the left edge of the app that lists the orgs of the person.
  - **Firna:** the first org of the sign-up in the mockups. Cal creates it in Get started and has no other org.
- **Background:**
  - Get started draws the rail with Firna only, in `docs/mockups/src/screens/GetStartedScreen.tsx`.
  - `app/orgs/empty` draws Firna with the rail `orgList`, which holds Acme, Futex, and Firna, at `docs/mockups/src/screens/WorkspaceListScreen.tsx:97` and `docs/mockups/src/fixtures/orgs.ts:28`.
  - The first-build pages of Firna reuse the same rail and the settings links of Acme.
- **Problem:** In the sign-up flow, the rail gains Acme and Futex when Firna opens, although Cal has only Firna.
- **Impact if no action:** The sign-up flow shows orgs that the new user does not have. Nothing in the app changes.
- **Root question:** Which orgs does the rail of the first org of the sign-up show?
- **Options:**
  - **A.** Give the pages of the first org of the sign-up a rail with Firna only, as Get started has. Effort: Small.
  - **B.** Change nothing. Effort: Small.
- **Left out:** None. The rail of a person with one org has one real shape.
- **Wider fix:** A. One rail fixture for the first org then serves every page of it.
- **Previous examples:** `app/orgs/empty`.
- **Recommendation:** A. The flow then shows what a new user sees.
- **Action:** fix after merge, apply A, because the rail was wrong before this change and the fix touches pages outside its scope.
