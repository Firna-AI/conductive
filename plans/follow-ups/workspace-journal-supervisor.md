# Workspace command journals need one local owner

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Large. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-27, from branch `calummoore/failed-message-action-kssx`, review finding 8 (wider fix F of its check).
- **Location:** `worker/lifecycle/command-journal.sh`, `worker/lifecycle/command-intents.ts`, `worker/lifecycle/command-disk-lease.ts`
- **Reason:** the branch applies the direct fix; the wider fix is Large and changes how every workspace command runs.

- **Terms:**
  - **Workspace command:** a command that the Worker runs in a cloud computer for a start, the restart near day 14, Continue, or a repository change.
  - **Command journal:** files in `/run/conductive-lifecycle` that record a command's owner, output, and exit status, so the Worker can recover them after a lost reply.
  - **Lease:** a file in `/run/conductive-disk/leases` that keeps the disk hold released while a workspace command runs.
- **Background:** A shell script owns each journal. It runs the command, keeps both output streams in full, publishes the result, closes the lease, and sets the disk hold again. The direct fix truncates the output of journals settled for 30 minutes and pre-writes the result file, so a result can always be published.
- **Problem:** One command's own output has no bound, and programs that a startup script leaves running keep writing into the journal through inherited handles. A very verbose command can still fill `/run` between two commands. The lease, the result, and the hold steps live in shell, in three places.
- **Impact if no action:** A rare verbose start can fill `/run`, and other programs that write there can fail.
- **Root question:** Where, and within what bound, do workspace command journals keep their output, so that each command can always record its result and its lease, and the journals never fill storage that other programs need?
- **Options:**
  - **A.** A small separate memory filesystem for `/run/conductive-lifecycle`, mounted by the sandbox software. Effort: Medium.
  - **B.** One local supervisor, a `conductive` subcommand, owns each workspace journal: it stores the command's output until the command exits, reserves room for the result, keeps reading but no longer stores output from programs left running, opens and closes the lease for the root device only when a line applies, and records completion after the lease cleanup. The Worker keeps the shell journal for older software. Effort: Large.
- **Left out:** A larger `/run`, because it only moves the limit. A cap on one command's output, because it changes the log of a failed start, which needs a user decision.
- **Wider fix:** B.
- **Previous examples:** `worker/lifecycle/build-log-retention.ts` bounds build logs.
- **Recommendation:** B, because one program then owns the result, the lease, and the bound.
- **Action:** fix after merge, apply B, because it is Large and the direct fix removes the likely cause.
