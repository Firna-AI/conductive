# Agent runner doc calls file reads "file results"

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from branch `calummoore/object-memory-history-and-files-state-14g5` (Milestone 1 docs check).
- **Location:** `docs/protocol/agent-runner.md:198`
- **Reason:** The sentence is older than the history retention change and changes no requirement of that change.

**Terms**
- **File report:** a full tree (`files.snapshot`), a tree delta (`files.changed`), or a changes list (`changes.updated`) that the runner sends. The stored chat history keeps some of them, as `docs/protocol/chat-history.md` says.
- **File read:** the content of one file or one diff that the runner sends on request.

**Background:** `docs/protocol/agent-runner.md` says: "The runner also reports the file tree and the changes of its workspace, and reads files and diffs on request, as Files and changes says. File results are not part of the chat history." Cal read it on 23 November 2026 as the results of direct file and diff reads.

**Problem:** "File results" can also mean the file reports, which the chat history does keep.

**Impact if no action:** A reader can think that the history keeps no file report, which contradicts `docs/protocol/chat-history.md`.

**Root question:** How does the sentence say exactly which runner results stay out of the chat history?

**Options:**
- **A.** Change it to "The results of file and diff reads are not part of the chat history." Effort: Small.
- **B.** Keep it. Effort: Small.

**Left out:** None.

**Wider fix:** None.

**Recommendation:** A. It removes the ambiguity with one sentence.

**Action:** fix after merge.
