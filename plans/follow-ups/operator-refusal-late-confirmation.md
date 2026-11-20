# Operator refusal outlives a newer account read

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, finding 1 of review round 1 on branch `calummoore/follow-up-keep-the-account-data-current-ipit`, found in commit `6e83a54d6`.
- **Location:** `refuseOperator` at `src/app/account-preferences.ts:68-75`. `write` at `src/app/resource.ts:127-146`, `answered` at `src/app/resource.ts:163-171`, and `confirm` at `src/app/resource.ts:113-120`. `SendQueue.run` in `src/app/send-queue.ts`. The rule at `src/shell/operator/README.md:26-29` and `src/app/login-data.md:75-78`.
- **Reason:** The defect needs a restored operator setting and a waiting preference save at the same time, and the next account read repairs it.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Operator role:** the `operator` field of the account reply, which lets the person open the operator section at `/operator`.
  - **Account read:** one `GET /api/account` that `AccountLoginReads` in `src/app/account-login-reads.ts` sends, with its complete reply.
  - **Resource:** the browser model in `src/app/resource.ts` that orders the reads, the confirmed changes, and the waiting writes of one value.
  - **Count:** the number that `Resource` gives each read when it starts, and each confirmed change and each write answer when it arrives.
  - **Operator refusal:** the HTTP 403 with the code `operator_required` that the Worker gives to an operator request of a person who is not an operator.
- **Background:**
  - The rail shows Operator above the account only while the account reply names the person as an operator. The operator section shows its pages only then, and the not-found page otherwise.
  - `isOperator` in `worker/operator/access.ts` gives the role from the Worker setting `OPERATOR_GITHUB_IDS` alone. So the role changes only when the deployment changes that setting.
  - At an operator refusal, `AccountModel.refuseOperator` at `src/app/account-model.ts:150` calls `AccountPreferences.refuseOperator`. The rail must drop Operator at once. The test "an operator request that the API refuses shows the not-found page, and the rail drops Operator" at `src/shell/operator/OperatorAccess.test.tsx:85` checks that drop.
  - `AccountPreferences` in `src/app/account-preferences.ts` keeps the account fields other than the logins in a `Resource`. Each account read gives its answer to that `Resource` in the order in which its GET went out. This also holds for the reads after a change of a login.
  - The required behaviour is in `src/shell/operator/README.md`, under "Access", and in `src/app/login-data.md`, under "Rules". The refusal hides Operator at once. An account read that started before the refusal cannot bring Operator back. A read that starts after the refusal shows the role of its reply. So it brings Operator back when the setting names the person again. No protocol doc states this rule.
  - `Resource.confirm` takes its count at once. `Resource.write` shows its change at once, but its layer takes a count only after its send settles. The send waits in the `SendQueue` of the value, which sends one request at a time, after each earlier write and save.
  - `answered` keeps each layer whose count is still unset, or newer than the count of the read.
  - The saves of Model and effort, of the New workspace view, and of the shortcuts are writes of the same `Resource`: `setDefaultChoice`, `setNewWorkspaceView`, and `saveShortcuts`.
  - `refuseOperator` sends the refusal through `write`, with a send that does nothing and a commit that sets `operator` to false. It is the only `Resource.write` in `src` whose send does nothing.
  - A check on 2026-11-20 reproduced the defect with the real `AppModel` of `src/app/app-model.ts`, the `FakeApiServer` of `src/test-support/fake-api.ts`, and held replies:
    1. The app starts with an account whose `operator` is true.
    2. `setNewWorkspaceView('page')` sends a `PUT`, and the fake API holds its answer.
    3. `refuseOperator` runs. The account shows `operator: false` at once.
    4. The server account now has `operator: true`. `AccountModel.refreshLogins` sends an account read, and the read answers. The account still shows `operator: false`.
    5. The held `PUT` answers. The account still shows `operator: false`.
    6. One more `refreshLogins` shows `operator: true`.
  - In the same check, a read in the same task as the refusal, with no waiting save, also kept `operator: false`. Real read triggers start in later tasks, so without a waiting save the window lasts only a few microtasks.
  - The tests of `src/app/account-preference-refresh.test.ts` and `src/shell/operator/OperatorAccess.test.tsx` pass on this code, so no test covers a read after the refusal. The test "an older account reply keeps each successful local preference write and operator refusal while updating unrelated fields" covers only a read from before the refusal.
  - The check also replaced only the body of `refuseOperator`, in memory, with `this.resource?.confirm((account) => ({ ...account, operator: false }))`. Then the read after the refusal showed `operator: true`, with no waiting save and with the held save. The held save still committed the view `page`. The role still dropped at once, and a read that started before the refusal still kept it. The 13 tests of `account-preference-refresh.test.ts`, `OperatorAccess.test.tsx`, and `src/app/account-read-races.test.ts` passed with that change.
- **Problem:** The refusal layer has no count until its empty send settles in the send queue, so `answered` keeps it over each read until then. A waiting preference save holds that send, and the count that the layer gets later is newer than the read. So an account read that goes out after the refusal can answer `operator: true` and still show no Operator.
- **Impact if no action:** The app can keep Operator hidden after a newer account reply names the person as an operator again. A waiting preference save makes that state last until the next account read after the save ends, or a reload.
- **Root question:** How does operator access follow a refusal and the next complete account read?
- **Options:**
  - **A.** Apply the refusal through the existing `Resource.confirm`. Put `this.resource?.confirm((account) => ({ ...account, operator: false }))` in place of the `write` in `AccountPreferences.refuseOperator`. The layer then takes its count at once. So a read that started before the refusal keeps it, and a read that starts after the refusal clears it. Add two regressions with held replies to `src/app/account-preference-refresh.test.ts`: a read right after the refusal with no waiting save, and a read during a held preference save. Each read answers `operator: true`, and the account must show it. Keep the test of the older read and the test of the drop at once. Effort: Small.
- **Left out:**
  - A new write mode of `Resource` that takes its count at the call, because it repeats `confirm`. Used for the saves, it would also let a read that the Worker answers first clear a saved value.
  - A guard for the role in `AccountLoginReads`, because it gives the same order as A with more code and a second owner of the order.
  - A direct change of the account store in `AccountModel.refuseOperator`, as before `AccountPreferences`, because `AccountPreferences` copies the role of its `Resource` over the account at each change. So the next save or an older reply shows Operator again.
  - A change in the Worker, because a read that goes out after the refusal already reaches the Worker after the refused request.
  - An account read at each refusal with no local mark, because the rail then keeps Operator until that read answers. That breaks the drop at once that `OperatorAccess.test.tsx` checks.
  - A refusal that holds until a reload, because it breaks the rule that a read after the refusal can bring the role back.
  - A change of only the README to describe the late order, because the app then ignores a newer reply while an unrelated preference save waits.
- **Wider fix:** None. `Resource.confirm` already gives the shared order for a change that the server confirmed, and its comment names such changes.
- **Previous examples:** No earlier case of an operator refusal was found. Commit `13877b8ff` added `Resource.confirm`. `OrgModel.putWorkspace` at `src/app/org-model.ts:220` uses it for a newer workspace record that the server confirmed.
- **Recommendation:** A. It uses the existing order for a fact that the server confirmed, removes code, and keeps both doc rules true, so it needs no doc change.
- **Action:** fix after merge, apply A, because the timing is Rare, the next account read repairs it, and the fix costs the same later.
