# Search changes lose an approval count

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, finding 6 of the waitlist branch re-review, `calummoore/waitlist-and-invite-system`.
- **Location:** `src/app/operator-directory.ts:190`, `src/app/operator-row-changes.ts:45`, and `src/shell/operator/WaitlistTab.tsx:137`.
- **Reason:** The defect needs an approval across a search change with the person outside the new first page. A later read corrects it.

- **Terms:**
  - **OperatorDirectory:** The browser model that owns an operator list, its search, its pages, and confirmed row changes.
  - **RowChanges:** The model helper that keeps confirmed changes by row key and their first-read number.
  - **Count-leaving write:** A write whose person leaves the waiting count. Only Approve currently uses this flag.
  - **First read:** A request for the first 20 rows of a search.
- **Background:** Each Waitlist reply contains up to 20 people and the total across all matches. A search keeps the old rows usable until its answer. Approve can therefore use an old row while another search loads. A queued search timer or browser Back can also change the search while its question remains open.
- **Problem:** The model subtracts an approval only when that person's row is loaded. A newer search can count the person outside its first page. The successful approval then leaves the displayed total one too high. Both response orders have this result.
- **Impact if no action:** The waiting count stays incorrect until Show more, another search, or another visit. The approval itself succeeds.
- **Root question:** How should the Waitlist count exclude each confirmed approval exactly once, whichever search and read supplied the shown total?
- **Options:**
  - **A.** In the Waitlist screen, reread the current search after an approval crosses a search change or first read. Cover both response orders. The screen must rebuild read ordering that the model already owns. Effort: Small.
  - **B.** Hold searches while an approval question is open and disable old-row approvals during a first read. This prevents overlap through interaction restrictions. It changes visible behavior beyond the current contract, so it needs user approval. Effort: Small.
  - **C.** Let the model own count membership for each confirmed approval and displayed total snapshot. Membership is counted, not counted, or unknown. A row present in that reply is counted. A total from a read started after confirmation excludes it. Other cases are unknown. Unknown membership starts one current-search read after confirmation. Its total repairs the count while rows and pages stay. A failed read keeps the shown count. Effort: Medium.
  - **D.** Let the model reload the current first page when a count-leaving write cannot be placed in the shown rows. If a first read is pending, inspect its rows when it answers. Keep the shown state on a repair-read failure. This repairs the current trigger but can end other Approved rows during the extra list load. Effort: Small.
  - **E.** Read the current total after every successful approval, using only the total from the first-page reply. Preserve rows and pages. Reconcile confirmed changes against each count read's start. This adds one request for every approval and updates external approvals in the count before their rows change. Effort: Medium.
  - **F.** Send the search in the approval request and return its new count from the Worker. The client still needs reconciliation when the search changes. This adds an uncovered API behavior and needs user approval. Effort: Medium.
- **Left out:**
  - Doing nothing leaves the count wrong.
  - Subtracting every approval from every search reduces searches that never matched that person.
  - Client-side query matching can differ from SQLite `LIKE` rules.
  - Closing the question cannot stop a write already sent.
  - Hiding an uncertain count adds no benefit over repairing it with the same read.
  - Clearing old rows removes the existing search behavior.
  - A reply marker alone cannot determine membership in a newer search.
  - A class test detects the defect but does not fix ownership and needs user approval.
- **Wider fix:** C. An unknown membership always requests an authoritative count, independent of the loaded page.
- **Previous examples:** Commit `dd75dd10` corrected confirmed changes and counts during pagination. Its snapshot rule handles unchanged searches but does not determine membership in a new search.
- **Related:** The existing approval-pagination and Disable regressions cover the same model. Keep `WaitlistShowMore.test.tsx` and `CodesDisable.test.tsx` passing. Count repair must preserve row confirmation ordering.
- **Recommendation:** C. One model should own the total snapshot, confirmed changes, and reconciliation when membership is unknown.
- **Action:** fix after merge, apply C, because this Medium/Rare overlap has a reload workaround and creates no persistent data issue.

Reproduce with 21 waiting people. A narrow search shows the newest person. Clear that search, then open or confirm Approve on the old row. The new empty-search read captures total 21 before the approval commits. Its first 20 rows omit that person.

If the read answers first, the later approval cannot find its key in loaded rows. If approval answers first, its change survives `RowChanges.end` because it has the same read number. The new rows still omit it. Both orders display 21 although 20 wait.

The search delay in `SearchField.tsx` keeps running while a question shows. `WaitlistTab` remains mounted across query changes and retains `asking`. One D1 batch in `worker/operator/waitlist-directory.ts` supplies each reply's rows and total from one snapshot.

Add both orders to a focused regression through the public model or existing mounted screen. Use `HeldRequests` from `src/app/test-kit.ts`. Use a fixed reply for the pre-commit snapshot and another reply for the repair read. Tie membership to the specific total snapshot, not an older row list. Keep unchanged-search confirmation rows, the other tabs' newest totals, and existing read-error behavior.

Update `src/shell/operator/README.md` to describe the repaired count policy. The current displayed count is a snapshot minus approved rows still shown. The selected fix changes that internal policy. It needs no new endpoint or protocol requirement.
