# Continue stop messages need approved words

- **Severity:** Medium. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-20, from the branch `calummoore/follow-up-continue-failures-name-the-6m1b`. That branch gave each stopped Continue a closed stored stop cause, option D of the item `plans/follow-ups/continue-failure-causes.md`, and deleted that item. This item keeps the words that the branch did not choose.
- **Location:** `continueFailed` in `worker/lifecycle/continue-failure.ts:5-16`. The mockup copy in `src/ui/components/workspace/barCopy.ts:98-99`, the bar model in `src/ui/components/workspace/barModel.ts:18-30` and `:200-201`, the screen state in `docs/mockups/src/screens/barState.ts:31`, and `BarMessage` in `docs/mockups/src/components/workspace/BarActions.tsx:180`. The drawn state `failed` in `docs/mockups/src/entries/app/banner/continue/index.mockup.tsx:36-42`, with its path in `docs/mockups/src/bannerPaths.ts:12`. For option C, `continueFetchCommand` in `worker/lifecycle/continue-commands.ts:17-30`. `serveContinue` in `src/test-support/fake-bar.ts:180-202`, and the `continue` values in `src/test-support/fake-bar-dev.ts:53-60`. The stop lines in `src/github/barView.test.ts:147-150`, `:169-174`, and `:227-228`. The exact texts in `worker/lifecycle/continue.test.ts:148-191` and `worker/lifecycle/continue-stop-causes.test.ts:33-209`. The section "Failures and recovery" of `worker/lifecycle/continue-failures.md`.
- **Reason:** The new stop lines are user-visible words that no drawn state gives, and only the user approves such words.

- **Source:** Implementation.
- **Category:** UX wording.
- **Terms:**
  - **Continue:** The action that moves a workspace to a new branch from the latest default branch after its pull request merged.
  - **Stop line:** The danger message under the pull request bar that shows the Worker text of a refused or stopped Continue, except a running turn.
  - **Stop cause:** One value of the closed type `ContinueStopCause` in `worker/lifecycle/continue-stop-causes.ts`, which a stopped job saves in its optional `stopCause` field.
  - **Branch comparison:** The Git ref `refs/remotes/origin/HEAD` and the setting `branch.<name>.gh-merge-base`, which give the runner and the GitHub CLI the base of the new branch.
  - **Safe app error:** An `HttpError` from `worker/http.ts`, whose code and text the poll returns to the browser as they are.
- **Background:**
  - Conductive gives each workspace one cloud computer and one branch at a time. Continue keeps the cloud computer, the files, and the sessions of the workspace.
  - Continue runs as a durable job in the phases `verify`, `resume`, `check`, `fetch`, `move`, and `publish`. `worker/lifecycle/continue.md` and `worker/lifecycle/continue-failures.md` describe the job.
  - `docs/protocol/github-banner-merge.md:108` says: "A Continue that stopped names its reason in a message under the bar."
  - `docs/protocol/continue.md:79-80` says that when Git cannot move the changed files, Continue stops, keeps the earlier branch, and names the reason.
  - `docs/protocol/github-banner.md:226-227` says: "The mockups at `app/banner` give the words of each label, each message, and each prompt." The mockups under `docs/mockups/` are part of the spec. A drawn state is one mockup screen.
  - The drawn state `app/banner/continue/failed` shows one danger line under the bar. Continue stays on the bar, so the member can try again. Its only words are the clash line: "Continue stopped: the changed files clash with the latest {base}. The workspace stays on {branch}."
  - The mockups choose that line from the one `appAction` value `continue-failed`, in `barModel.ts` and the screen state of `barState.ts`. `BarMessage` shows its text from `barCopy.ts`. No screen state carries a stop cause.
  - The mockups import nothing from `worker/`. The Worker imports mockup copy, as `worker/lifecycle/repository-change-errors.ts` imports `repositoryFailure`. So a shared copy function needs a key type in the mockups, and `continueFailed` maps each stop cause to that key.
  - A stopped job saves one of these stop causes: `cancelled`, `provider-preparation-failed`, `sandbox-start-failed`, `command-start-uncertain`, `checkout-clash`, `index-lock`, `comparison-metadata-failed`, or `unknown`. `worker/lifecycle/continue-failures.md` gives the stop site of each cause.
  - A missing or unrecognized stored cause reads as `unknown`. The poll reply holds no cause. A saved `outcome` keeps its saved text.
  - The move command keeps the Git text of a failed checkout only in a shell variable, and writes no output. It ends with status 80 for a clash, 81 for an existing `.git/index.lock`, and 1 for any other refusal.
  - Continue never removes `.git/index.lock`, because the lock can belong to another Git command, such as one in a terminal of a member.
  - `continueFailed` gives the current text of `workspace_continue_failed`:
    - The `checkout-clash` cause gets the drawn clash line, unchanged.
    - A stop in the `fetch` phase, with any cause, gets "Continue could not finish. Check GitHub access and try again."
    - Every other stop gets "Continue could not finish."
  - Before the stop causes, every stop outside the move got the text with the GitHub access hint. Every failed move got the clash line. The branch kept the hint only in the `fetch` phase, until the user chooses the words.
  - A code comment in `continueFailed` names this item.
  - A safe app error keeps its own code and text, before any of these lines. Examples are `workspace_not_merged`, and an access error that the job kept while a command ran.
  - The `verify` phase reads GitHub only with the token of the GitHub App installation, for its refresh and for the default branch. Its checks of the member read only stored rows. The fetch is the first step that uses the GitHub token of the member who pressed Continue.
  - So a member whose GitHub account cannot read the repository passes `verify`, and then the fetch fails. For that member, the access hint names the real reason. Every active member of the org may press Continue.
  - Git ends with status 128 for most fatal errors, such as an access refusal or a network failure. So the status of a failed fetch does not prove an access problem.
  - The repository change runs the same fetch command. `repositoryChangeFetchCommand` in `worker/lifecycle/repository-change-commands.ts:24-33` only calls `continueFetchCommand`.
  - The move writes the branch comparison only after a good checkout. A failed write gives status 82, and the read of the branch then runs.
  - A failure of the branch comparison after a good checkout does not stop the job. The read finds the new branch, writes the comparison again, and the step retries until the write works.
  - The job ends with the cause `comparison-metadata-failed` only when that read finds the earlier branch. Another Git command must then have moved the workspace back after the checkout.
  - `continueOutcome` in `src/github/barRuns.ts:114-119` takes the Worker text of each refused or stopped poll, except a running turn. `src/github/barView.ts` shows it as the stop line.
  - The browser fake `serveContinue` gives the stop replies of the development page, with the current texts. `src/shell/workspace/development-page.md:58-66` gives the address of that page, with values such as `continue=question`.
  - `worker/lifecycle/continue.test.ts:148-191` checks the clash line for status 80, and "Continue could not finish." for each other failed move.
  - `worker/lifecycle/continue-stop-causes.test.ts` checks "Continue could not finish." for a cancel, a failed preparation, a failed start, and an uncertain start. It checks the text with the GitHub access hint for a failed fetch.
  - `continue.ts` logs a safe warning through `warnWorker` when a stopped job ends. `worker/warning-continue.ts` builds its fields: only fixed fields, and the normalized stop cause and phase. No option changes it.
- **Problem:** The stop line names an established reason only for a clash. A lock, a cancel, a failed preparation, a failed start, and an uncertain command start show only "Continue could not finish." A stop in the `fetch` phase tells the member to check GitHub access, but no stop cause shows an access problem.
- **Impact if no action:** The member does not learn an established reason, so the stop line breaks the rule that it names its reason. After a cancel or a network failure in the `fetch` phase, the member checks GitHub access for nothing.
- **Root question:** How does the stop line name the established reason of each stop, without a guessed reason?
- **Options:**
  - **A.** Approve the complete lines below. Put them in one copy function in `src/ui/components/workspace/barCopy.ts`, keyed by the stop cause, and let `continueFailed` use it. Draw each new line on a child page of the Continue mockup page. Each line keeps the drawn assurance that the workspace stays on the earlier branch. Effort: Medium.
  - **B.** Approve only the first sentence of each proposed line below that is not the clash line. Keep the clash line unchanged. Use the same copy function and child pages. The branch stays visible in the workspace, but the stop line omits the assurance. Effort: Medium.
  - **C.** Do A, and add a stop cause for a proven access refusal. `continueFetchCommand` keeps the Git text of a failed fetch only in a shell variable. It matches the fixed Git messages of an authentication or permission refusal in the C locale, and ends with a reserved status. Only that cause gets an access line. Cost: a new stored cause value, a classification that the repository change shares, native Git tests, and one more line that needs approval. GitHub answers a missing private repository and a refused one with the same message, so the line must fit both. Effort: Large.
- **Proposed lines:** `{branch}` is the earlier branch of the workspace. `{base}` is the fetched default branch.
  - Index lock: "Continue stopped: a Git lock blocked the branch change. The workspace stays on {branch}."
  - Cancellation: "Continue was cancelled. The workspace stays on {branch}."
  - Provider preparation: "Continue could not prepare the cloud computer. The workspace stays on {branch}."
  - Failed start: "Continue stopped: the cloud computer could not start. The workspace stays on {branch}."
  - Uncertain result: "Continue could not confirm its result. The workspace stays on {branch}."
  - Unknown cause: "Continue could not finish. The workspace stays on {branch}."
  - Failed branch comparison, only when Continue ends after the read confirms the earlier branch: "Continue could not update the branch comparison. The workspace stays on {branch}."
  - Confirmed clash keeps its exact existing line: "Continue stopped: the changed files clash with the latest {base}. The workspace stays on {branch}."
  - Access refusal, only under C: "Continue could not fetch the latest {base} with your GitHub access. The workspace stays on {branch}."
  - Under B, each line except the clash line ends after its first sentence. The unknown line is then "Continue could not finish.", the current text.
  - Under A and B, a stop in the `fetch` phase gets the line of its cause, without the GitHub access hint. A fetch that ends with a status other than 0 and 125, or with a timeout, has the cause `unknown`. So a member without GitHub access then sees the unknown line.
  - Under C, a proven access refusal gets the access line. Each other stop in the `fetch` phase gets the line of its cause.
- **Constraints of every option:**
  - No line and no log holds raw Git output, a path of the member, a token, a secret, or a provider body. Source: the copy rules of the `product-ui` skill keep internal detail out of text that users read.
  - The drawn clash line stays exactly as it is. Source: the drawn state `app/banner/continue/failed`.
  - A safe app error keeps its priority over these lines. Source: `continue.ts` and `continue-progress.ts` on `origin/main`, which the branch kept.
  - No line names an actor or a cause that the stored cause does not prove. A lock does not prove that another command runs. A failed preparation does not prove that the cloud computer did not answer. Source: the rule that a stopped Continue names its reason.
  - Only a proven access refusal gets an access line, and only under C. Source: the same rule.
  - No option adds a recovery step, a raw diagnostic, or a lock removal. Source: the drawn clash line has no recovery step. Continue stays on the bar for a retry. A lock can belong to another Git command.
  - No option adds a stop for a failure of the branch comparison after a good checkout. The read keeps its repair and its retry. Source: the recovery rules of `worker/lifecycle/continue-failures.md`.
  - `stopCause` stays optional, and the stored shapes of `failure`, `outcome`, and `phase` stay. Source: `AGENTS.md` requires that a previous Worker and stored data keep working. Under C, a Worker of this branch reads the new cause as `unknown`.
- **Left out:**
  - Change nothing: it breaks the rule that a stopped Continue names its reason, because the general line hides established reasons.
  - Words only in the Worker: they break the rule that the `app/banner` mockups give each bar message.
  - One general line for every cause: it fails the goal, because it hides established reasons, such as a lock, a cancel, and a failed start.
  - Raw Git text in the stop line: it breaks the copy rules, which keep internal detail out of text that users read. A secondary details surface could hold such detail, but that is a separate question about a new surface.
  - Keep the access hint for every stop in the `fetch` phase, or after every failed fetch: it fails the goal. A cancel, a provider failure, or a network failure then also gets the hint.
  - Words that claim more than the cause proves: they fail the goal. Examples are "another Git command locked the repository" and "the cloud computer did not answer".
  - A recovery sentence, such as "Wait, then try again": it fails the goal, because it is false for a lock that an ended command left.
- **Wider fix:** A. One copy function, keyed by the stop cause, gives the Worker and the drawn states the same words. B and C use the same function.
- **Previous examples:** The drawn clash line already uses this shape of two sentences. The repository change takes its clash words from `repositoryFailure` in `src/ui/components/workspace/repositoryMoveCopy.ts:35-39`, but keeps its other failure words only in `worker/lifecycle/repository-change-errors.ts`. Commits `3f35ef98` and `2e6961f9` logged safe causes of failed image builds and workspace starts on 8 November 2026.
- **Related:** `plans/follow-ups/repository-change-fetch-access-hint.md` holds the same guessed GitHub access cause in the repository change. Both items depend on the shared `continueFetchCommand`. Option C of each item classifies an access refusal there, so one classification serves both. An answer here can guide the words there. Neither item waits for the other.
- **Recommendation:** C. It is the only option that keeps an access line for a proven access refusal. A is the lower-effort choice if that line is not worth the Large effort.
- **Action:** ask the user, because the new lines are user-visible words that no drawn state gives. `docs/protocol/github-banner.md:226-227` makes the `app/banner` mockups the source of each bar message, and they draw only the clash line. A and C also trade a smaller change against a true access line.
- **Design calls:** The agents of the branch made these calls on 20 November 2026. None is a choice of the user.
  - An ignored file that the base tracks gets the clash line. Git reports it as an untracked file that the checkout would overwrite, and the recovery is the same.
  - A failure of the branch comparison after a good checkout shows no stop line. The read repairs it, or the step retries.
  - A safe app error keeps its own words.
  - Every stop outside the clash and the `fetch` phase gets only "Continue could not finish.", the first sentence of the earlier text. It adds no new words, and it drops the false clash line and the guessed hint.
  - The `fetch` phase keeps the earlier text with the GitHub access hint. The fetch runs with the GitHub access of the member, so the hint can be right there. Its removal changes the meaning of the line, so it waits for this answer.
- **Work after the answer:**
  1. Add the approved lines to one function in `src/ui/components/workspace/barCopy.ts`. Key it by a cause type of the mockups, and keep the clash case exact.
  2. Let a screen state carry the stop cause, through `appActions` in `src/ui/components/workspace/barModel.ts` and the field `appAction` in `docs/mockups/src/screens/barState.ts`, or through a new field. Make `BarMessage` in `docs/mockups/src/components/workspace/BarActions.tsx` show the line of that cause.
  3. Draw each new line on a child page of `app/banner/continue`, in `docs/mockups/src/entries/app/banner/continue/`. Add its path to `docs/mockups/src/bannerPaths.ts`. Run `npm run mockups:check`.
  4. Make `continueFailed` map each stop cause to that function, as `worker/lifecycle/repository-change-errors.ts` uses `repositoryFailure`. Remove the `fetch` phase hint, and the code comment that names this item.
  5. Under C, add the classification to `continueFetchCommand`, its reserved status to `worker/lifecycle/continue-stop-causes.ts`, and the new cause. Add a native Git test to `worker/lifecycle/continue-native.test.ts`. Check that the repository change keeps its fetch text.
  6. Update the stop replies of `serveContinue` in `src/test-support/fake-bar.ts`, the `continue` values in `src/test-support/fake-bar-dev.ts`, and the stop lines in `src/github/barView.test.ts`.
  7. Update the exact texts in `worker/lifecycle/continue.test.ts` and `worker/lifecycle/continue-stop-causes.test.ts`. Keep each other check.
  8. In `worker/lifecycle/continue-failures.md`, say which causes have their own text, without exact copy. Remove the sentence "No other cause has text of its own yet." and the link to this item. Update the test entries in `worker/lifecycle/continue.md`.
  9. Open the development page with each stop value, as `src/shell/workspace/development-page.md` says. Check each new stop line in a browser, and save a screenshot.
- **Done when:** The stop line of each cause shows its approved words, and the mockups draw each line. No page and no code comment links this item. Now `worker/lifecycle/continue-failures.md` and the comment in `worker/lifecycle/continue-failure.ts` link it.
