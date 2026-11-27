# Test guides call a tree delta a report

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-27, from branch `calummoore/changes-list-deltas-aedi`, review round 1, outside the scope.
- **Location:** `src/test-support/README.md:51`, `worker/test-support/README.md:164`, and `src/test-support/recorded-files.ts:87`.
- **Reason:** `origin/main` has the same fixture and the same words, and the changes deltas change did not touch them.

- **Terms:**
  - **Complete report:** A file report that holds a whole list: a full tree, `files.snapshot`, or a full changes list, `changes.updated`.
  - **Tree delta:** The file event `files.changed`. It holds only the changes of the tree since its previous revision.
- **Background:**
  - `browserFileEvents` in `src/test-support/recorded-files.ts:44` holds four recorded file events: a full tree, a full changes list, a tree delta, and a later full changes list.
  - `recordedFileEvents` gives these events to the browser tests. `recordedRunnerFileEvents` (`src/test-support/recorded-files.ts:88`) turns them into runner events for the Worker file tests, such as `worker/files/state.test.ts` and `worker/files/handlers.test.ts`.
  - Commit `cef20b9d6` wrote the README sentence on 6 November 2026, when the fixture already held the tree delta.
- **Problem:** `src/test-support/README.md:52` says that `recordedRunnerFileEvents` keeps four complete runner reports, and `worker/test-support/README.md:164` says that it has four complete reports. `src/test-support/README.md:51` and the doc comment at `src/test-support/recorded-files.ts:87` also say that the recordings hold complete reports. The third event of each recording is a tree delta.
- **Impact if no action:** A test author can expect only complete reports from the fixture, and miss that its reader must apply a tree delta.
- **Root question:** How do the test guides describe the recorded file events correctly?
- **Options:**
  - **A.** Change the four texts to name the forms: three complete reports and one tree delta. Keep the facts about the parts and the revisions. Effort: Small.
  - **B.** In the two READMEs, name the fixtures and point to `src/test-support/recorded-files.ts` for their events, with no count of forms. Move the facts about the parts and the revisions to the doc comments of that file, and correct its comment at line 87. A new event then needs no README edit. Effort: Small.
- **Left out:**
  - A test of the README words, because the `testing` skill gives doc prose no test.
  - A script that writes the list of forms, because a tool and a new check cost more than one fixture needs.
  - So two real choices remain: correct words in the guides, or a pointer from the guides to the code.
- **Wider fix:** B. A guide that names the fixture and points to its code stays correct when an event changes.
- **Previous examples:** Commit `d46c855ae` wrote a list of the `FileEvent` forms in `src/shared/README.md` that left out tree deltas.
- **Recommendation:** B. The facts then live once, beside the events that they describe.
- **Action:** fix after merge, apply B, because the words are on `origin/main`, outside the changes deltas change.
