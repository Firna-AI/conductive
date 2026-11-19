# The E2B restored-image computer probe fails sometimes

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-19, from the live E2B checks of Milestone 6a on branch `calummoore/e2b-backup-sandbox-provider`.
- **Location:** `checkComputer` in `image/e2b/live-probes.ts`, and the page wait of `check_page` in `image/e2b/computer-probe.py:103`.
- **Reason:** The failure did not repeat in four later attempts, and the probe hides its raw output, so the source is not proven.

- **Terms:**
  - **Live check:** `node image/live-check.mjs --provider=e2b`, a manual check against a real E2B project. CI does not run it.
  - **Restored image:** a sandbox that starts from a filesystem-only snapshot. It boots from disk, and its services start again.
  - **Computer probe:** `image/e2b/computer-probe.py`. It starts the `computer` entry as Codex does, opens a test page in a separate Chrome profile on display `:0`, and takes a screenshot through the Cua Driver's MCP server.
- **Background:**
  - On 19 November 2026, the live check ran five times against template `legx77llbioq1vfbvsck` in the Conductive E2B project on `e2b.app`.
  - The probe passed on the fresh template sandbox in every run.
  - On the image restored after a release install, it passed in runs 3 and 5, and failed in run 4 with "An E2B image probe failed. Its raw output was suppressed."
  - Before the probe, the check waits until `conductive-e2b-computer-config.service` is active. Run 4 passed that wait, so the probe itself failed.
  - Two separate diagnostics restored an image without the release install, and the probe passed both times. A cold boot starts the computer services in about 5 seconds.
  - The probe waits at most 10 seconds for the test page's load signal. A restored image that also starts the release's services can be slower.
- **Problem:** The probe fails sometimes on a restored image, and the check cannot say which step failed.
- **Impact if no action:** A real-provider run can fail for no product reason, and the next person cannot tell the cause.
- **Root question:** How does the probe of a restored image pass every time it should, and say which step failed when it fails?
- **Options:**
  - **A.** Make the probe catch each step's failure and print its flags with a safe step name, such as `mcpStart` or `pageLoad`, in place of a crash. Run the live check until a failure names its step, then fix that step with a readiness signal. Effort: Small.
  - **B.** Raise the page-load wait of the probe from 10 to 30 seconds. It adds a longer time limit, which the testing rules allow only with the user's approval. Effort: Small.
- **Left out:** A retry of the probe, because the testing rules forbid a retry as a fix for a flaky check.
- **Wider fix:** A. A named step turns each later failure of any probe step into evidence.
- **Previous examples:** Milestone 6a's live runs found two other faults by their visible output: the ready check and the missing system D-Bus.
- **Recommendation:** A. It finds the source first, and it adds no longer time limit.
- **Action:** ask the user, because the source is not proven, and the testing rules send an unreproduced flake to the user.
