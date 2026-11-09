# No rule covers Get started for a returning member

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, split off from finding 14 of PR #52, branch `conductor/boat-native-remote-workspaces-milestone-15o`, round 2, option D of its check. The check's second new problem joins it. An options check on the same day added G to J and changed the recommendation from F to H. Its report is in `.context/options-check/report.md`.
- **Location:** the Get started section of `docs/protocol/orgs-and-members.md`, the shared words in `docs/mockups/src/screens/getStartedCopy.ts`, and the org step in `src/shell/onboarding/OrgStep.tsx`.
- **Reason:** each option adds a requirement to a protocol doc, so the user must decide.

- **Terms:**
  - **Get started:** the first-run page with three steps: install the GitHub App, create an org, and connect Claude or Codex.
  - **Returning member:** a person who had an org and has none any more, after a leave, a removal, or the deletion of the org.
- **Background:** PR #52 opens Get started again when a member leaves their last org. With option B of finding 14, its words make no claim of first use: step 2 reads "2. Create an org". The protocol doc still lists the step as "Create the first org".
- **Problem:** No requirement says that Get started serves a returning member, or that its words claim no first use. So a later change can bring first-use words back, and the protocol doc and the app differ on step 2. Also, a member who joined an org by invitation and has no agent login sees the org step done with the status "Created", for an org that an admin created.
- **Impact if no action:** A later text change can be wrong for these people, and no review rule catches it. The status "Created" is wrong for an invited member. Nothing breaks.
- **Root question:** How do the words of Get started stay true for each person who reaches it, also a person who joined an org or left one?
- **Options:**
  - **D.** Add to the Get started section of `docs/protocol/orgs-and-members.md`: Get started also serves a person who has no org any more, after a leave, a removal, or the deletion of the org, and its words claim no first use. Change step 2 there to "Create an org". Effort: Small.
  - **F.** D, and give the done org step a status that also fits a joined org, such as "Ready", in the shared words of the app and the mockups. Effort: Small.
  - **G.** The rule of D, but the protocol doc names each step by what it gives: the GitHub App, an org, and an agent login. It does not copy the titles, so `getStartedCopy.ts` stays the one home of the words. The rule also says that the words claim no action that the person did not take. Effort: Small.
  - **H.** G, and give the done GitHub App step and the done org step the status "Done" in `getStartedCopy.ts`. An invited member also sees "Installed" for an install that an admin made. "Connected" stays, because an agent login always belongs to the person. Effort: Small.
  - **I.** D, and show "Created" or "Joined" on the done org step, from the stored creator of the org. It needs a field in the org list, a mockup state, and tests. Effort: Medium.
  - **J.** Option C of finding 14: separate words for a person who returns, from a stored record of each past membership. It needs a migration, a field in the Get started reply, a mockup state, and a protocol rule. Effort: Medium.
- **Left out:** A list that hides the done steps, because H removes the wrong claim at less cost and keeps what the done steps show.
- **Wider fix:** G, in place of D. Its rule also covers claims of actions, and the words keep one home. H includes G.
- **Previous examples:** finding 14 of PR #52.
- **Recommendation:** H, in place of F. It also fixes the same claim on the GitHub App step, and "Done" also fits a deleted org.
- **Action:** ask the user later, because the user deferred this choice on 8 November 2026. Each option adds a requirement to a protocol doc.
