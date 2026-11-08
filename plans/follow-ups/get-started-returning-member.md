# No rule covers Get started for a returning member

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, split off from finding 14 of PR #52, branch `conductor/boat-native-remote-workspaces-milestone-15o`, round 2, option D of its check. The check's second new problem joins it.
- **Location:** the Get started section of `docs/protocol/orgs-and-members.md`, the shared words in `docs/mockups/src/screens/getStartedCopy.ts`, and the org step in `src/shell/onboarding/OrgStep.tsx`.
- **Reason:** each option adds a requirement to a protocol doc, so the user must decide.

- **Terms:**
  - **Get started:** the first-run page with three steps: install the GitHub App, create an org, and connect Claude or Codex.
  - **Returning member:** a person who had an org and has none any more, after a leave, a removal, or the deletion of the org.
- **Background:** PR #52 opens Get started again when a member leaves their last org. With option B of finding 14, its words make no claim of first use: step 2 reads "2. Create an org". The protocol doc still lists the step as "Create the first org".
- **Problem:** No requirement says that Get started serves a returning member, or that its words claim no first use. So a later change can bring first-use words back, and the protocol doc and the app differ on step 2. Also, a member who joined an org by invitation and has no agent login sees the org step done with the status "Created", for an org that an admin created.
- **Impact if no action:** A later text change can be wrong for these people, and no review rule catches it. The status "Created" is wrong for an invited member. Nothing breaks.
- **Root question:** What does Get started promise to a person who is not using the app for the first time?
- **Options:**
  - **D.** Add to the Get started section of `docs/protocol/orgs-and-members.md`: Get started also serves a person who has no org any more, after a leave, a removal, or the deletion of the org, and its words claim no first use. Change step 2 there to "Create an org". Effort: Small.
  - **F.** D, and give the done org step a status that also fits a joined org, such as "Ready", in the shared words of the app and the mockups. Effort: Small.
- **Left out:** Separate words for new and returning people, option C of finding 14, because a new user and a former member can have the same empty org list, and a stored flag adds state and an API change.
- **Wider fix:** D. The rule keeps each later text of the page right for every person who reaches it.
- **Previous examples:** finding 14 of PR #52.
- **Recommendation:** F. It also fixes the status that an invited member sees.
- **Action:** ask the user, because each option adds a requirement to a protocol doc.
