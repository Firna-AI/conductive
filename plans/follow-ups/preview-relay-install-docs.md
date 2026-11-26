# Docs say the relay waits for a start

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from the docs review of the branch `calummoore/terminal-tabs-implementation-l5ml`.
- **Location:** `docs/protocol/sandbox-software.md:148`, `src/marketing/docs/cloud-computer.md:250`, `image/install-system.sh:21`, `image/install.md:197-198`, `image/README.md:105`.
- **Reason:** The conflict already exists on `origin/main`, and the terminal tabs change does not touch the relay.

- **Source:** Review.
- **Category:** Docs or spec.
- **Terms:**
  - **Preview relay:** the service in the cloud computer that forwards preview requests to a port.
  - **Install at idle:** the runner installs a downloaded release while the workspace has been idle for 2 minutes, without a stop.
- **Background:** PR #406 made the system installer restart a running preview relay at each install, so the relay runs the active release. The installer runs at each install at idle too.
- **Problem:** "Installs at idle" in the sandbox software protocol says that the install restarts neither the preview relay nor the terminal service. The public guide says that terminal and preview software update when Conductive restarts its software, or at the next cloud computer start. Both contradict the installer for the relay. Two developer guides say the same: `image/install.md` says that the apply at idle runs the installer, "which restarts no unit", so the relay keeps its running release until it starts again. `image/README.md` says that the relay processes keep their release until they start again. `image/README.md:91` already says that the installer restarts a running relay. A review of branch `calummoore/lima-djh5` found the two guide sentences on 18 November 2026.
- **Impact if no action:** Readers and agents believe that a new relay needs a stop, and the protocol states a rule that the code breaks.
- **Root question:** What do the docs say about when the preview relay runs a new release?
- **Options:**
  - **A.** Change the protocol sentence, the public guide sentence, and the two developer guide sentences: the install restarts a running preview relay, and the terminal service runs the new release from its next start. Read the legal pages and the guides for other sentences that restate the fact. Effort: Small.
  - **B.** Stop the restart of the relay at an install at idle, so the docs hold. This undoes the fix of PR #406 for idle installs. Effort: Small.
- **Left out:** None.
- **Wider fix:** None. The `documentation` skill already says that docs change with the behaviour.
- **Previous examples:** PR #406 changed the installer and some docs, but not these two sentences.
- **Recommendation:** A. The restart fixed stale previews, and the docs should state it.
- **Action:** fix after merge, apply A, because the problem is outside the diff of the terminal tabs change.
