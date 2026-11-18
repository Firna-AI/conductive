# A file attached during a change can stay in the old folder

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from the branch `calummoore/perth-siol` (PR #423), review finding 10.
- **Location:** `worker/lifecycle/repository-change-commands.ts` (the settle command).
- **Reason:** The case needs a turn that attaches a file in the seconds of a change, and the file is not lost, so it can wait.

- **Terms:**
  - **Context folder:** the `.context/` folder in the repository folder of a workspace. Notes and attached files of the chat live there.
  - **Settle command:** the command that the Worker runs in the cloud computer after a repository change is stored. It copies the context folder again and points new terminals to the new folder.
- **Background:**
  - A repository change copies the old folder's context folder into the new folder before it stores the new repository.
  - A file that a turn attaches while the change runs goes to the old folder. The settle command copies the context folder again after publication, to catch such a file.
- **Problem:** An attachment upload that still runs when the settle command copies can miss that second copy.
- **Impact if no action:** A chip of that attached file in the chat points to a file that is only in the old folder. The file is not lost.
- **Root question:** How does each file attached during a change reach the new context folder?
- **Options:**
  - **A.** Hold attachment uploads while a change runs, as new turns are held. Effort: Small.
  - **B.** Write each attachment to the folder of the record at the time of the write, and copy the missed file at the next start. Effort: Small.
- **Left out:** A third copy later, because any fixed time can still miss a slow upload.
- **Wider fix:** A. It removes the race instead of copying again.
- **Previous examples:** None found.
- **Recommendation:** A. It removes the race with one hold.
- **Action:** fix after merge, apply A, because the file is not lost and the case is rare.
