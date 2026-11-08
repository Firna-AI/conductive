# Get started speaks only to a first-time user

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, split off from finding 14 of PR #52, branch `conductor/boat-native-remote-workspaces-milestone-15o`, round 2, option D of its check. The check's second new problem joins it.
- **Location:** the Get started section of `docs/protocol/orgs-and-members.md`, and `src/shell/onboarding/OrgStep.tsx:58`.
- **Reason:** D adds requirements to a protocol doc, so the user must decide.

- **Terms:**
  - **Get started:** the first-run page with three steps: install the GitHub App, create the first org, and connect Claude or Codex.
  - **Returning member:** a person who had an org and has none any more, after a leave, a removal, or the deletion of the org.
- **Background:** PR #52 makes Get started open again when a member leaves their last org. The page still uses first-use words, such as "2. Create your first org".
- **Problem:** A returning member reads that they create their first org. Since the invitations of PR #54, a member who joined an org and has no agent login also reaches Get started. The org step then says "Create your first org" with the status "Created", for an org that an admin created.
- **Impact if no action:** The words of the page are wrong for these people. Nothing breaks.
- **Root question:** What does Get started say to a person who is not using the app for the first time?
- **Options:**
  - **A.** Change only the words: "Create an org" for step 2, and a status that names an org that the person joined. Effort: Small.
  - **D.** A, plus requirements in `docs/protocol/orgs-and-members.md`: Get started also serves a person who has no org any more, its words claim no first use, and step 2 reads "Create an org". Effort: Small.
- **Left out:** Separate words for new and returning people from stored history, because a new user and a former member can have the same empty org list, and a stored flag adds state and an API change.
- **Wider fix:** D.
- **Previous examples:** None found.
- **Recommendation:** D. The rule keeps later texts of the page right for every person who reaches it.
- **Action:** ask the user, because D adds requirements to a protocol doc.
