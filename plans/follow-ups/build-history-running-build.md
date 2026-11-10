# The app and the mockups list different builds

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, from the mockups of the plan `plans/automatic-first-build.md`, branch `calummoore/box-auto-build-onboarding`.
- **Location:** `src/shell/settings/BuildCard.tsx:116-118` and `:147-151`, `docs/mockups/src/components/settings/BuildHistory.tsx`, `docs/mockups/src/components/settings/BuildSection.tsx`.
- **Reason:** the mismatch was on `origin/main` before the automatic first build, and the choice decides which side of a mismatch between the mockups and the app is right.

- **Source:** Implementation. **Category:** Mockup.
- **Terms:**
  - **Build card:** the card at the top of the Cloud computer tab of the org settings. It shows the newest build, its log, and a History list of the builds.
- **Background:**
  - In the app, `BuildCard` in `src/shell/settings/BuildCard.tsx` lists every build of the kind `build` in History, also the build that runs. History shows whenever the org has a build.
  - In the mockups, History of Acme is a fixed list of builds that ended, in `docs/mockups/src/components/settings/BuildSection.tsx`. The `building` and `build-failed` pages of `app/org-settings/cloud-computer` do not list the build that runs or the failed build at the top.
  - The first-build pages of Firna, in `app/org-settings/cloud-computer/first-build`, list only builds that ended, and hide History until one has.
- **Problem:** While a build runs, the app lists it in History, and the mockups do not. While the first build of an org runs, the app shows "History (1)", and the mockups show no History.
- **Impact if no action:** The app and its visual spec keep disagreeing on one detail of the Cloud computer tab. A change of either side has no rule to follow.
- **Root question:** Which builds does History list, and when does History show?
- **Options:**
  - **A.** List only builds that ended, and hide History until one has, as the mockups draw it. The app stops listing the build that runs. Effort: Small.
  - **B.** List every build, as the app does. The mockups add a row for the build that runs. Effort: Small.
  - **C.** Change nothing. Effort: Small.
- **Left out:** None.
- **Wider fix:** None. Each side draws History in one component.
- **Previous examples:** The `building` and `build-failed` pages of `app/org-settings/cloud-computer`.
- **Recommendation:** A. A build that runs already shows in the head of the card, so a History row only repeats it.
- **Action:** ask the user, because the choice decides which side of a mismatch between the mockups and the app is right.
