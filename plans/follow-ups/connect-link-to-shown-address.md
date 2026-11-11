# A Connect link to the shown address opens nothing

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from the branch `calummoore/conductor-internal-tools-410`, review round 2, a problem outside the scope that the check of finding 4 found.
- **Location:** `AgentList` in `src/shell/account/AgentList.tsx:146`, `useInlineForms` in `src/shell/ui/inline-form.ts:69`, and `useRoute` in `src/app/navigation.ts:82`.
- **Reason:** `origin/main` behaves the same, so the fix belongs in its own branch.

- **Terms:**
  - **Connect form:** the form under the row of an agent on the account page, where a member connects a login. The address `/account?connect=<agent>` opens it with the page.
  - **`useInlineForms`:** the shared helper in `src/shell/ui/inline-form.ts` that holds the open form of the agent list. It opens the form of `initial` at first, and again each time that `initial` changes.
- **Background:**
  - The account page gives `connect` of its address to the agent list as `initial`. Links from other screens, such as the Connect notice of the New workspace page, push that address.
  - `useRoute` builds the route from the address text. So a push of the address that already shows gives the same `connect`, and the list sees no change.
  - Nobody reproduced the problem. A read of the code shows it, and the code before the shared helper did the same.
- **Problem:** After Cancel on `/account?connect=codex`, a link to that same address, such as the Connect notice of a New workspace dialog over the account, does not open the Codex form again.
- **Impact if no action:** In that rare case, the member must press Connect on the account page.
- **Root question:** How does a link to the form of an agent open the form also when the account already shows its address?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Give each push of an address an ID in the route, and let the agent list follow the ID as well as `connect`. Effort: Medium.
  - **C.** Make the address the one owner of the open form: Connect and Sign in again replace the address with the address of the form, and Cancel and a connect replace it with `/account`. This changes the address bar at each press, which no requirement covers, and it changes `src/app/screens.md`. Effort: Medium.
- **Left out:** A list that reads `connect` only as it mounts: Back and the Connect notice of a dialog over the account change `connect` while the page stays open.
- **Wider fix:** C. The address then always says which form shows.
- **Previous examples:** None found.
- **Recommendation:** B. It opens the form for each link, with no change of what the page shows. C protects the codebase best, but it changes the address bar, which needs the user.
- **Action:** fix after merge, apply B, because the problem is outside the scope of the branch that found it, and the wider fix C changes the address bar, which no requirement covers.
