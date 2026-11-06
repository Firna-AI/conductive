# The Preview and Source switch is not a pair of links

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-06, from PR #14, branch `conductor/boat-native-remote-workspaces-milestone-10`, the blocked wider fix D of round 2 finding 9.
- **Location:** `src/files/page/FilePage.tsx:98`.
- **Reason:** the fix changes a visible control and overrides its mockup, so it needs the user.

- **Background:** A Markdown file page has a segmented control that switches between Preview and Source. The page calls the shell's `navigate` from that control. Every other press that navigates in Files uses `FilesLink`.
- **Problem:** Twice in PR #14, a press that navigates had no test that pressed it: the first read in finding 5 and this switch in finding 9. Each new handler needs its own mounted click test.
- **Impact if no action:** A later press handler can break with no failing test, as these two did.
- **Root question:** How does each press that navigates in Files get one tested path?
- **Options:**
  - **A.** Keep the segmented control. Each handler keeps its own mounted test, as finding 9's fix adds. Effort: Small.
  - **D.** Build the switch from two `FilesLink` links, Preview and Source, with the look of the segmented control. Then only `FilesLink` navigates, and one mounted click test of `FilesLink` covers every press that navigates. The keyboard changes from arrow keys in a radio group to Tab between links. Effort: Medium.
- **Left out:** None.
- **Wider fix:** D.
- **Previous examples:** Findings 5 and 9 of PR #14.
- **Recommendation:** A, because finding 9's test already covers the switch, and D changes a control that the mockup draws.
- **Action:** ask the user, because D changes a visible control and its mockup.
