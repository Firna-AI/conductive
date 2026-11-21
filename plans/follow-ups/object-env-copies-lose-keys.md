# Object env copies lose later env keys

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from the branch `calummoore/record-step-times-for-builds-and-2nqj`, review finding 11.
- **Location:** `worker/lifecycle/start-job-records.ts:81`, `worker/sandbox/client.ts:43`
- **Reason:** The direct fix is merged and CI is green. The wider fix waits, because the two fix rounds of that branch were used.

- **Terms:**
  - **Object env:** the env that `StartJobRecords` gives the workspace controller. It is a Proxy that reads the live env with a timed D1 binding. Its target is a copy made when the workspace object starts.
- **Background:**
  - The native test entry `worker/test-support/native-workspace-entry.ts` adds env values, such as `SANDBOX_PROVIDER_ACCOUNTS`, after the object starts.
  - A read through the object env gets the live value. Its list of keys is the list from the start, so `{ ...env }`, `Object.keys`, and `in` miss later keys.
  - A spread in `providerForAccount` dropped the second provider account and failed 8 CI test files. The fix gives the provider a live Proxy that replaces only `DB`.
- **Problem:** any other code that copies or lists the object env can still miss a later key.
- **Impact if no action:** a later change that spreads the env fails only in tests with a second account, or with another late key. Production adds no env key after the start.
- **Root question:** how does every copy of the object env keep every live key?
- **Options:**
  - **A.** Change nothing. The provider path already uses a live view. Effort: Small.
  - **B.** Add `has`, `ownKeys`, and `getOwnPropertyDescriptor` traps to the object env, so that a copy keeps every live key. The Proxy invariants hold, because the target is extensible and its keys are configurable. Effort: Small.
  - **C.** Make the native test entry set its env values before the object starts. Effort: Medium.
- **Left out:** a plain copy of the env, because tests set values after the start.
- **Wider fix:** B.
- **Previous examples:** the spread in `providerForAccount`, fixed in commit `fad887f50`.
- **Recommendation:** B. It fixes the key list where the object env is made.
- **Action:** fix after merge, apply B, because the two fix rounds of the branch were used.
