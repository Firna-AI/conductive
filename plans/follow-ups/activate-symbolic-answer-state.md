# Activate symbolic answer state after the reader deploy

- **Severity:** High. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-19, from branch `calummoore/follow-up-held-answer-text-keeps-an-36oq`, the rollout of the combined fix of `plans/follow-ups/held-answer-text-keeps-ended-secret.md` and `plans/follow-ups/old-secret-values-in-filter-state.md`.
- **Location:** the control at `wrangler.jsonc:37` and `worker/env.ts:20`. Its reads at `worker/chat/output-filter-state.ts:69` and `src/shared/output-sanitizer.ts:69`. Also `docs/protocol/answer-text-secrets.md:50`, the job `deploy` in `.github/workflows/deploy.yml:87`, and `docs/automatic-deploys.md:11`.
- **Reason:** the switch is safe only after production runs a Worker that reads both saved formats. Only the deploy of the merged change gives that Worker.

- **Category:** Security.
- **Terms:**
  - **Answer filter:** the exact-copy filter of agent answer text in the Durable Object of each workspace. `OutputSanitizer` in `src/shared/output-sanitizer.ts` holds it, and `filterRunnerOutput` in `worker/chat/runner-output.ts` runs it.
  - **Held end:** the end of an unfinished answer that the answer filter holds back, because later text can still make it a copy of a secret value. `worker/chat/output-filter-records.ts` saves it, encrypted.
  - **Earlier format:** saved filter state that keeps each held end as raw text. It lists each secret value that a held end or a shown answer end can still start.
  - **Symbolic format:** saved filter state that lists no value. It keeps a whole copy in a held end only as hidden symbolic state, and it names possible longer values without their text.
  - **The control:** the Worker variable `CONDUCTIVE_SYMBOLIC_ANSWER_STATE` in `wrangler.jsonc`, false by default. While it is false, new and earlier records keep the earlier format. Already-symbolic records stay symbolic. While it is true, the Worker saves the symbolic format.
- **Background:**
  - The orchestrator of the change that added the control owns this task. It opens the activation pull request after the merge.
  - In the earlier format, a held end can be a whole copy of a shorter secret value, when a longer active value starts with it.
  - When that shorter value ends, the next text of that answer, or its turn end, shows the copy in stored chat.
  - A temporary value ends at its expiry, at its removal, or at an archive. An org secret value ends at a replace or a delete. An env value ends at a new start with other env values.
  - Synthetic example: the active values `short-token` and `short-token-longer`. A delta `short-token` shows nothing. After `short-token` ends, a delta `!` shows `short-token!`.
  - In the earlier format, a replace or a delete of an org secret leaves the old value in each saved list that names it.
  - That encrypted old value stays until a runner event or a cleanup of a temporary value writes the record again.
  - `docs/protocol/answer-text-secrets.md` states the rules that end both gaps. A whole copy in a held end stays hidden after its value ends.
  - Later text that completes a longer value also stays hidden, so that value can show as two masks. The saved state lists no value.
  - Rollout decision of 19 November 2026: the change ships in two deploys. The deploy of its merge reads both formats and still saves the earlier format.
  - A later deploy turns the control on. It does this only when the Worker before it reads both formats.
  - Reason: the Worker from before the change reads the symbolic format only in part. It drops each saved answer end whose list is empty.
  - A check against the code of `main` at `664462e43` showed that a rollback to that Worker can show a whole active value across answer events.
  - In that check, a synthetic value `private-value` first showed as `private-[redacted]value`. After one unrelated event, it showed as `private-value`.
  - Rejected on the same date: one deploy with no rollback past it, because the previous Worker must keep working.
  - Also rejected: a mask of each shown start of a value, because it hides text that is not an exact copy.
  - Rule of 19 November 2026 for the control off: it holds before the switch and after a rollback of it. State that is already in the symbolic format stays in it.
  - With the control off, the Worker puts no other state, new or saved, into the symbolic format. No Worker turns a hidden whole copy back into its text.
  - Until the switch deploys, the shorter-copy leak and the old values in saved lists stay in production, as they were before the change.
  - After the switch, a record in the earlier format keeps its value list until the Durable Object writes that record again.
  - A receipt that reaches the answer filter writes its runner stream record and the workspace record of answer ends. Private tool-detail parts do not rewrite answer records. A cleanup of a temporary value can write any record.
  - So the record of an older runner stream can keep its list with no time limit. So can each record of a stopped, archived, or removed workspace.
  - The deletion of the org removes such a record. The user accepted this retention. This task makes no sweep over all workspaces.
- **Task:**
  1. Run `git fetch origin main`.
  2. Find the commit that added the control: `git log origin/main --first-parent --reverse --format=%H -S 'CONDUCTIVE_SYMBOLIC_ANSWER_STATE' -- wrangler.jsonc | head -n 1`.
  3. Check with `git show <commit>:wrangler.jsonc` that this commit sets the control to `"false"`.
  4. Find the push run of the Deploy workflow for that commit: `gh run list -R Firna-AI/conductive --workflow deploy.yml --commit <commit> --event push --json databaseId,status,conclusion,url`.
  5. Wait until that run completes. Then check its job `Deploy`: `gh run view <run ID> -R Firna-AI/conductive --json jobs --jq '.jobs[] | select(.name == "Deploy") | .conclusion'` must print `success`.
  6. A run of a commit that is no longer the head of `main` deploys nothing. Its job `Deploy` shows `skipped`, and the run starts a new run on `main`, as "When it runs" in `docs/automatic-deploys.md` says.
  7. GitHub can also drop a waiting run when a newer one arrives. In these cases, list the runs: `gh run list -R Firna-AI/conductive --workflow deploy.yml --branch main --json databaseId,headSha,event,status,conclusion,url`.
  8. Then use the first later run whose `headSha` contains the commit, as `git merge-base --is-ancestor <commit> <headSha>` shows. Its job `Deploy` must show `success`.
  9. Do not switch before such a job `Deploy` succeeds. A failed or skipped job `Deploy` does not count.
  10. Create a branch from the latest `main`. Change the control in `wrangler.jsonc` from `"false"` to `"true"`. The Worker treats only the exact string `"true"` as on.
  11. Update each doc line that states the value of the control. `git grep -n CONDUCTIVE_SYMBOLIC_ANSWER_STATE -- '*.md'` finds them.
  12. Change nothing else. Keep the reader of both formats and the reads of the earlier format. Keep the rule that state already in the symbolic format stays in it with the control off.
  13. `docs/protocol/answer-text-secrets.md` already states this step in its section Rollout. So the switch needs no protocol change.
  14. Run these targeted checks with `npm run test -- <files>`:
      - Old reader and control off: with the control false, the Worker saves the earlier format, which the Worker from before the change reads in full. It reads both formats, and it puts no new or saved state into the symbolic format.
      - Files for that check: `worker/chat/runner-output.test.ts`, `worker/chat/runner-output-context.test.ts`, `worker/chat/runner-output-legacy.test.ts`, `worker/chat/runner-output-durability.test.ts`, and `worker/secrets/output-filter.test.ts`. They run with the control off.
      - Rollback from on to off: save state with the control true, then go on with the control false. State that is already symbolic stays symbolic. No hidden whole copy shows or becomes text. A value that answer events or runner streams split stays hidden.
      - File for that check: `worker/chat/runner-output-symbolic.test.ts`.
      - Released copies: a turn end or a refused completion releases a held mask. Its later exact longer continuation stays hidden, across a restart or another stream. Completion input keeps matching references from its own source. These cases run in `worker/chat/runner-output-symbolic-release.test.ts`.
      - Storage security with the control on: the decrypted saved state holds no synthetic secret value. No held end in it holds a whole copy of an active value. Each identity of a possible value is a keyed hash under the app key, with its own purpose. The identities and their salt stay inside the encrypted state.
      - Files for that check: `worker/chat/runner-output-symbolic-held.test.ts`, `worker/chat/runner-output-symbolic-durability.test.ts`, and `worker/secrets/output-filter-symbolic.test.ts`.
      - The Worker tests do not read the `vars` of `wrangler.jsonc`. Each test that needs the control on sets it itself.
      - Also run each later test of the control. `git grep -lE 'CONDUCTIVE_SYMBOLIC_ANSWER_STATE|enableSymbolicAnswers' -- '*.test.ts'` finds them.
  15. Run the complete gate: `npm ci`, `npm --prefix desktop ci`, `npm ci --prefix runner`, and then `npm run check`.
  16. Commit, push, and open the pull request. Its final head needs green `Complete gate` and `Rust gate` checks.
  17. Agent merges are off in `AGENTS.md`, so a member merges it. Its push to `main` then deploys it. Check that the job `Deploy` of a run that contains the switch succeeds, with the same commands.
  18. Out of scope: a production setting, a secret, and a sweep over all workspaces. Also out of scope: the literal-marker rule of `plans/follow-ups/split-literal-marker-in-answers.md`, and the growth of answer ends of `plans/follow-ups/worker-output-contexts-grow-across-answers.md`.
- **Impact if no action:** the rules of `docs/protocol/answer-text-secrets.md` never take effect in production. A whole copy of an ended secret value can still show in stored chat, and old org secret and env values stay in saved lists.
- **Needs:** the merged change that adds the control, and a successful job `Deploy` of a Deploy run that contains it. Write access to the repository, and `gh` with read access to the Actions runs of `Firna-AI/conductive`. No production setting, no secret, and no other credential.
- **Done when:** a merged pull request sets the control to true. Its targeted checks, the complete gate, and the `Complete gate` and `Rust gate` checks of its final head passed. The job `Deploy` of a Deploy run that contains it succeeded. The reader of both formats, the reads of the earlier format, and the rule for the control off are still in the code.
