# Check approval feedback after a search change

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, an unconfirmed observation from the final finding check of the waitlist branch.
- **Location:** `src/shell/operator/WaitlistTab.tsx:199`, `src/shell/operator/ApproveDialog.tsx`, `src/shell/operator/useQuestion.ts`, and `docs/protocol/operator-section.md` under The Waitlist tab.
- **Reason:** The observation arrived after the final review pass. It needs an independent check before any change to user-visible confirmation.

- **Terms:**
  - **Approval question:** The dialog that names a waiting person and asks the operator to approve them.
- **Background:** A pending search can finish while the approval question retains a person from its earlier rows. The new search can remove that person's row. A successful approval then closes the question. The current code provides no Approved row or success toast in that new list.
- **Task:**
  1. Read the confirmation requirements in `docs/protocol/operator-section.md` and the approved Waitlist mockup state.
  2. Trace or reproduce a search change that removes the selected row while the approval question stays open.
  3. Check both response orders with the existing fake API and `HeldRequests` helper.
  4. Determine whether closing the successful question and showing the current search already meet the confirmation requirement.
  5. Close this item if they do. If they do not, record a confirmed finding and its real options before changing the UI.
  6. Ask the user before adding confirmation behavior that no current requirement covers.
- **Impact if no action:** The operator may get no specific confirmation after an unusual search overlap. The approval still succeeds. This is not yet a confirmed defect.
- **Needs:** Nothing. The current source and controlled-request helpers are sufficient for the check.
- **Done when:** An independent check confirms or removes the observation. Any confirmed change has a defined requirement and the appropriate regression.

The related count problem is recorded in `plans/follow-ups/waitlist-search-approval-count.md`. That work repairs the count. It does not decide whether a separate success message is needed when the approved row is absent. Keep these two questions separate.
