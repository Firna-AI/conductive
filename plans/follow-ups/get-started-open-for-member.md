# Open is secondary for a member with no action

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from Milestone 4 of the plan `plans/automatic-first-build.md`, branch `calummoore/box-auto-build-onboarding`, item 3 of the `ui implementor`.
- **Location:** `Finish` in `src/shell/onboarding/GetStartedScreen.tsx`, and the mockups `app/sign-in/get-started/build-failed` and `app/sign-in/get-started/no-build` in `docs/mockups/src/screens/GetStartedScreen.tsx`.
- **Reason:** the change departs from the mockups, so the user decides which side is right.

- **Source:** Implementation. **Category:** Mockup.
- **Terms:**
  - **Get started:** the first-run page with three steps: install the GitHub App, create an org, and connect Claude or Codex. When every step is done, its finish shows a line about the org and an Open button for the org.
  - **First build:** the build that Create org starts. Until a build succeeds, the org has no image that a workspace can start from.
- **Background:**
  - The org step of Get started shows the first build of the org. After a failed build, an admin gets Try again there. With no build, an admin gets Build computer.
  - In those two states, the finish makes Open a secondary button, because the action of the org step is the main action. The mockups draw only an admin.
  - A member who is not an admin gets no action in the org step, because only an admin builds.
- **Problem:** A member then sees no primary button on the page, only a secondary Open.
- **Impact if no action:** The page of a member has no main action. Nothing breaks.
- **Root question:** Which action is the main one for a person who cannot build?
- **Options:**
  - **A.** Keep Open secondary for everyone, as the mockups draw it. Effort: Small.
  - **B.** Make Open primary for a person who may not change the settings, and add that case to the mockups. Effort: Small.
- **Left out:** A link to the settings for a member, because the member can do nothing there.
- **Wider fix:** None. One component draws the finish.
- **Previous examples:** None found.
- **Recommendation:** B. A member has no action in the org step, so the reason for a secondary Open does not apply.
- **Action:** ask the user, because B departs from the mockups.
