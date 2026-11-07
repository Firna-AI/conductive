# A short provider error fails an image build

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from PR #40, branch `conductor/boat-native-remote-workspaces-milestone-5b`, a problem outside the scope of round 1.
- **Location:** `worker/lifecycle/image-builds.ts:269`.
- **Reason:** the build steps are outside the diff of the branch that found it.

- **Background:** An image build allocates a cloud computer, installs the software, copies the repositories, and saves the image. Each step calls Boat.
- **Problem:** After the allocation, a short Boat error, such as a timeout or a 503, fails the whole build.
- **Impact if no action:** A short outage throws away a build that was going well, and the org waits for a new build.
- **Root question:** How does an image build get through a short provider error?
- **Options:**
  - **A.** Retry each Boat call of a build step a few times with a backoff, for errors that the sandbox transport marks as transient. Effort: Small.
  - **B.** Save the progress of a build after each step, and resume from the last saved step on the next alarm. Effort: Medium.
- **Left out:** Retrying the whole build, because it repeats the slow install for one short error.
- **Wider fix:** B.
- **Previous examples:** None found.
- **Recommendation:** B. It also survives a Worker restart in the middle of a build.
- **Action:** fix after merge, apply B, because the code is outside the diff that found it.
