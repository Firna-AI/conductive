# Mockups lack five states of Switch account

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/operator-switch-user-boat-e2b-rn5q`, Milestone 5 of the plan `plans/operator-provider-switch.md`.
- **Location:** `docs/mockups/src/entries/app/operator/org/`, `docs/mockups/src/fixtures/operatorSwitch.ts`, `src/ui/components/operator/switchCopy.ts`.
- **Reason:** The states are rare, the app already shows them with the words of `switchCopy.ts`, and the mockups need no change for the feature to work.

- **Terms:**
  - **Provider account box:** the box on the page of an org in the operator section that gives the org's provider account, its switch, and Switch account or Stop switch.
  - **Switch build:** the hidden build of the org image on the new account that an operator's switch starts.
- **Background:** The operator can switch an org to another provider account, as `docs/protocol/switch-account.md` says. The mockups under `docs/mockups/src/entries/app/operator/org/` draw the box in most switch states. The app in `src/shell/operator/AccountBox.tsx` also shows five states that no mockup draws. Their words are already in `switchCopy.ts`.
- **Problem:** No mockup draws these states:
  - a switch build that waits for a running refresh, not a build
  - a switch build that waits for Restore of a deleted org
  - a waiting switch with no reason, which shows "Starts soon"
  - a job or an operator with no known GitHub login
  - the box with one configured account, which says "`boat` is the only configured account." and shows no Switch account
- **Impact if no action:** A later change of the mockups can drift from the app for these states, because the visual spec does not show them.
- **Root question:** Where can a reader see each state of the Provider account box?
- **Options:**
  - **A.** Add a mockup variant for each of the five states, with fixtures in `operatorSwitch.ts`. Effort: Medium.
  - **B.** Draw only the one-account line and the refresh wait, the two states that operators are most likely to meet. Effort: Small.
  - **C.** Change nothing. Effort: Small.
- **Left out:** None.
- **Wider fix:** A. Each state of the box then has a mockup.
- **Previous examples:** None found.
- **Recommendation:** A. The mockups are the visual spec of the app.
- **Action:** fix after merge, apply A, because the states are rare and the app words already exist.
