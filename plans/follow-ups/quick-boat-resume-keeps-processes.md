# Docs say a stop ends every process

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from the branch `calummoore/resuming-agent-on-timeout-fg44`, item 4 of the Milestone 2 report.
- **Location:** `docs/protocol/stop-and-resume.md` ("The stop"), `docs/architecture/components.md`, `src/marketing/docs/terminal-and-previews.md`, and the reason in `docs/protocol/agent-runner.md` for the Stop of a turn that a provider stop ended.
- **Reason:** the wrong statement existed before the branch, and a fix needs a check in a real Boat sandbox first.

- **Terms:**
  - **Quick resume:** a resume of a Boat sandbox within about 10 minutes of its stop.
- **Background:** Each workspace runs in a sandbox on Boat or E2B. Boat's docs say that a quick resume usually gets the same machine, with its memory and its running programs. The docs of this repository say that a stop ends every process. The agent runner doc now names the exception as the reason for the Stop of an old turn before a continuation turn.
- **Problem:** Three docs, one of them a public guide, still say that each stop ends every process. The app has not checked Boat's claim in a real sandbox.
- **Impact if no action:** A reader can trust the general rule and remove the Stop of the old turn. The Terminal guide can tell a user that a shell ended while it still runs.
- **Root question:** What should the docs say about processes after a quick resume on Boat?
- **Options:**
  - **A.** Change nothing. The agent runner doc names the exception. Effort: Small.
  - **B.** Check a quick resume in a real Boat sandbox. Then add a Risk line to "The stop", a clause to the components page, and a sentence to the Terminal guide. Effort: Small.
- **Left out:** A delay of each resume until 10 minutes after its stop, because it makes each quick resume slower.
- **Wider fix:** B.
- **Previous examples:** None found.
- **Recommendation:** B. A public guide should not state a claim that is false.
- **Action:** ask the user, because B changes a stated fact of a protocol doc and a guide.
