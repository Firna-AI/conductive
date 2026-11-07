# The live build log reads the wrong format

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from PR #40, branch `conductor/boat-native-remote-workspaces-milestone-5b`, a problem outside the scope of round 1.
- **Location:** `src/app/api/read-settings.ts:107` and `worker/lifecycle/build-stream.ts:78`.
- **Reason:** the client and the endpoint are outside the diff of the branch that found it.

- **Background:** The org settings show the log of an image build while it runs. The browser polls the build log endpoint of the Worker.
- **Problem:** The client reads the reply as JSON, but the endpoint sends server-sent events. So the live log poll fails.
- **Impact if no action:** A member cannot follow a running image build. The log shows only after a reload, or not at all.
- **Root question:** How do the browser and the Worker agree on the format of the live build log?
- **Options:**
  - **A.** Make the client read the server-sent events of the endpoint. Effort: Small.
  - **B.** Make the endpoint answer each poll with JSON, as the client expects. Effort: Small.
  - **C.** Define the reply of the endpoint in `src/shared/`, so that both sides use one contract type. Effort: Medium.
- **Left out:** None.
- **Wider fix:** C.
- **Previous examples:** None found.
- **Recommendation:** C. One shared contract stops the two sides from drifting apart again.
- **Action:** fix after merge, apply C, because the code is outside the diff that found it.
