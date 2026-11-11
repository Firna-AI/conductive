# Unstarted imports have a final Archive

- **Severity:** Medium. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-11, from pull request #223, branch `calummoore/conductor-import-option`, the supplementary review of round 3 of head `cfbf916c6a4c4da3c953f0df368ea858fa2a8fb2`, finding 36. It includes the independent finding check and the root outcome of the same day.
- **Location:** `docs/protocol/workspace-life.md:167-172`, the exception for an import that never started a sandbox, and `:233-236`, the Restore rule of `main`. `docs/protocol/imported-workspaces.md:132-146`, the Archive before activation. `docs/protocol/import-uploads.md:51-53`, the retention of the stored work. `docs/protocol/conductor-import.md:89-90` and `:95-96`, the imported-row rule. `worker/lifecycle/restore-workspace.ts:23-28` and `:51-58`, the refusal of Restore without a computer. `worker/conductor-import/scan-state.ts:15-21`, the scan state. `src/shell/workspace/imported/ImportedArchiveDialog.tsx:32-34`, the question. `src/marketing/privacy.ts:98-105`, the current retained-work and old-document clauses. The first review cited `worker/lifecycle/restore-workspace.ts:24-28` and `worker/conductor-import/scan-state.ts:15-22`.
- **Reason:** Every option changes a stated requirement that no user decision covers, and the options trade an undo against cost and retention.

- **History:** 2026-11-11, root integration record. The Location field now points to `16a4f76c`. The detailed static trace keeps its reviewed source citations. The reviewed Location field was:

> `docs/protocol/workspace-life.md:151-156`, the exception for an import that never started a sandbox, and `:217-220`, the Restore rule of `main`. `docs/protocol/imported-workspaces.md:132-146`, the Archive before activation. `docs/protocol/import-uploads.md:51-53`, the retention of the stored work. `docs/protocol/conductor-import.md:89-90` and `:95-96`, the imported-row rule. `worker/lifecycle/restore-workspace.ts:23-28` and `:51-58`, the refusal of Restore without a computer. `worker/conductor-import/scan-state.ts:15-21`, the scan state. `src/shell/workspace/imported/ImportedArchiveDialog.tsx:32-34`, the question. The first review cited `worker/lifecycle/restore-workspace.ts:24-28` and `worker/conductor-import/scan-state.ts:15-22`.

- **History:** 2026-11-11, root record correction. Project status alone does not prove that no deployed data exists. The earlier grade reason was:

> Harder later is No. The project is not in production, so no deployed data waits for this change. This record does not claim that B or F needs no new stored field.

- **Source:** Review. **Category:** Docs or spec. A docs or spec finding has no likelihood grade.
- **Grade reasons:**
  - Severity is Medium. It is a spec gap with a workaround: the Mac keeps the source, and a new workspace can continue a pushed branch. No stored data is deleted.
  - Confidence is High. Each claim has a source line at head `cfbf916c`. The trace is static, and no runtime reproduction ran.
  - Harder later is No. The resource-rule fix has the same expected scope later. New stored fields and migration costs remain unproved.
  - Effort is Large, the grade of F.
- **Terms:**
  - **Restore:** the action that returns an archived workspace to its org section without starting its cloud computer.
  - **Kept cloud computer:** the cloud computer that Conductive keeps for 14 days after Archive. Restore needs one today.
  - **Stored work:** the uploaded Git data, files, and native session memory that activation restores.
  - **Old documents:** the readable Markdown copies of the imported sessions, kept in the private object bucket.
  - **Never-started import:** a workspace imported from Conductor that has no successful activation. It shows Not active, or a failed activation.
- **Background:**
  - Conductive imports local Conductor workspaces into cloud workspaces. An imported workspace has no cloud computer until its activation, the first cloud start.
  - Archive keeps the stored work and the old documents of an import that never started. `docs/protocol/import-uploads.md:48-53` and the Privacy page at `src/marketing/privacy.ts:197-203` state that retention.
  - The existing Restore needs a kept cloud computer. The rule comes from `main`, at `docs/protocol/workspace-life.md:217-220`, with the reason "nothing is left to bring back". The import change adds `workspace-life.md:151-156`: "So an import that never started a sandbox offers no Restore."
  - `docs/protocol/imported-workspaces.md:133-146` blocks the activation of an archived workspace and keeps the stored work.
  - Ordinary archived workspaces have 14-day Restore while their computer is kept. The reason of that window is the cost of a kept computer, at `workspace-life.md:177-178`.
  - The import plan's call against Restore for this case, and the mockup call for its toast, are agent calls. No user decision chooses this final case.
- **Problem:**
  - Archive has no undo for a never-started import. It also cannot activate while archived.
  - Its local Conductor ID stays imported, so a new scan cannot import it again into the same org.
  - A failed activation reaches the same end, because it also leaves no computer.
  - The question says only "It cannot be activated while archived." Those words suggest a temporary block.
- **Source trace:**
  1. The person presses Archive. `awaitsActivation` at `src/app/first-start.ts:14-18` is true, because `conductorImport.activatedAt` is null. So `src/shell/workspace/useArchiveActions.tsx:87-91` shows the question.
  2. The question at `ImportedArchiveDialog.tsx:32-34` says "It cannot be activated while archived. Its old sessions stay readable."
  3. Archive calls the unchanged `archiveWorkspace` at `worker/lifecycle/archive-workspace.ts:23-37`. `markWorkspaceArchived` at `worker/app-api/archive-data.ts:35` sets `state = 'archived'` and keeps the row.
  4. The row has no computer, so `workspaceRestoreUntil` at `src/shared/workspaces.ts:9-16` returns null. The toast at `useArchiveActions.tsx:76-82` has no Restore. `mayRestore` at `src/app/permissions.ts:55-66` gives the row, the bar, and the palette no Restore.
  5. A direct Restore request fails at `worker/lifecycle/restore-workspace.ts:23-28` with HTTP 409, "No cloud computer is available to restore.", at `:51-58`.
  6. Activate fails at `worker/lifecycle/import-activation.ts:77-81` with HTTP 409 `workspace_archived`.
  7. A new scan returns `imported` at `worker/conductor-import/scan-state.ts:15-21`, with no `archived_at` filter. Publication refuses a second workspace for the same local ID at `worker/conductor-import/workspace-data.ts:46-48` and `:71-72`, and through the unique index at `migrations/202611101135_imported_workspace_records.sql:30-31`.
  8. The stored work stays. Only `deleteProvisionalWorkspace` at `worker/lifecycle/workspace-data.ts:231-245` and the org purge at `worker/members/purge-data.ts:15` delete a workspace. So the stored work stays until the org is deleted.
  9. A failed activation reaches the same end. `detachFailedSandbox` at `worker/lifecycle/failed-workspace-data.ts:2-14` clears the computer. `worker/lifecycle/import-activation-recovery.ts:3` and `worker/lifecycle/start-failure.ts:27` call it. `docs/protocol/imported-workspaces.md:126-127` states that end.
  10. An Archive during a running activation keeps its computer and offers Restore, as `worker/lifecycle/import-activation-archive.test.ts:24-53` shows.
- **Impact if no action:**
  - An importer can permanently remove the in-app path to activation while all stored work stays in the bucket.
  - A person can archive a Not active or failed import from the row menu, the palette, or the pull request bar. After the question, the workspace offers no Restore and no Activate.
  - The mockup rationale at `docs/mockups/src/entries/app/imported/archived/index.mockup.tsx:13` says "this Archive has no undo". The product does not tell the person.
- **Evidence:**
  - The import change adds the imported workspace, its stored work, the question, the imported-row rule after Archive at `docs/protocol/conductor-import.md:89-90`, and the exception at `workspace-life.md:151-156`.
  - The diff of `restore-workspace.ts` and `archive-workspace.ts` against `main` is empty. So the change applies an unchanged rule of `main` to a new kind of retained work.
  - `src/shell/workspace/imported/ImportedWorkspace.test.tsx:121-140` checks the question, Cancel, and Archive. Its expected words at `:130` change under A and E.
- **Root question:** How does a person get back, or knowingly give up, the stored work of an imported workspace that they archive before a successful activation?
  - The first review asked how Archive should handle an imported workspace whose stored work exists but whose cloud computer never started. The finding check replaced it on 2026-11-11, because a failed activation also leaves no computer, and a kept computer is the current mechanism, not the goal.
- **Options:**
  - **A.** Keep Archive final for that workspace. Say explicitly in its confirmation that it cannot return to activation. Align the guide when the import releases. This changes the words of the question. Effort: Small.
    - A must choose its words by the state before Archive. An Archive during a running activation keeps its computer and comes back through Restore. Otherwise A repeats a permanent claim that an earlier clarification removed for that reason.
  - **B.** Let the existing Restore action use the stored imported work during the ordinary 14-day window. Restore the state before activation without starting a computer. Keep a failed activation distinguishable from a never-started one. Define this resource eligibility once for routes and controls. Effort: Large.
    - The first review graded B Medium. The finding check corrected it to Large on 2026-11-11.
    - B changes the Worker Restore path, which assumes a computer, at `restore-workspace.ts:23-44` and `worker/lifecycle/archive-data.ts:32-64`, which writes `stopped` and requires a computer ID.
    - B must restore Not active or the failed state, because Archive overwrites `state` at `worker/app-api/archive-data.ts:35`.
    - B changes the source of `restoreUntil` for Worker replies and device events, at `src/shared/workspaces.ts:9-16`, `worker/lifecycle/workspace-data.ts:109`, and `worker/devices/state.ts:107`.
    - B changes the archived import words at `src/shell/workspace/notice-copy.ts:69-77`. The ordinary words at `:99` promise "files and sessions".
    - B redraws the archived import mockups, and it changes three protocol docs and the workspace guide.
  - **C.** Keep the archived record final, but offer continuation in a new workspace from its retained stored work. Keep the old record readable. This adds a copy workflow, storage ownership, and public actions. Effort: Large.
  - **D.** Free the local Conductor ID of an archived import that has no successful activation. A later scan then shows its row as importable again. Effort: Large.
    - The new import makes a new workspace from a new upload. The archived record keeps its old documents.
    - It changes the scan state, the publication guard, the unique source index with a migration, the imported-row rule, the import list words, and their mockup.
    - Cost: the Mac must still hold the source. Two records share one local ID. The old stored work stays, unless the deletion of E also applies.
  - **E.** A, and delete the stored work when that Archive makes activation impossible. Keep the old documents. Effort: Medium.
    - Use the existing work cleanup group of the import service. Change the retention rule, the Privacy page, and the guide.
    - Cost: a mistaken Archive loses the cloud copy at once. Only the Mac source remains, and the org still cannot import the row again.
  - **F.** B, and delete the stored work when its 14-day Restore window ends, as an ordinary Archive deletes its computer. Keep the old documents. Effort: Large.
    - Change the retention rule and the Privacy page, together with the changes of B.
    - Include a failed activation, which also has no computer.
    - Keep the exception for an Archive during a running activation: it keeps its computer and uses the existing Restore.
    - Cost: after 14 days, only the Mac source remains, as for the work on the computer of any archived workspace.
- **Shared assumptions checked:**
  - Archive deletes no stored work before a successful activation. Source: `docs/protocol/import-uploads.md:48-53` and the Privacy page at `src/marketing/privacy.ts:197-203`, both added by the import change. The import design copies the retention rule of chat attachments, as an agent design. Its reason is Try again after a failed activation, and parity with attachments. The reason is gone when no action can use the work: after the final Archive of A, and after the Restore window of B. E and F drop it.
  - An archived import keeps its local Conductor ID imported. Source: `docs/protocol/conductor-import.md:89-90` and `:95-96`, and the unique index of the migration, all added by the import change, as an agent design. Its reason is that each later scan finds the workspace and links to it. That reason holds, but the link ends at a workspace that can never activate. D drops it.
  - Restore needs a kept computer. Source: `docs/protocol/workspace-life.md:217-220` from `main`, and `:154-155` from the import change. Its reason, "nothing is left to bring back", is false for stored work. B and F drop it.
  - One question serves every Archive before a successful activation. Source: `src/shell/workspace/useArchiveActions.tsx:87-91`, `ImportedArchiveDialog.tsx:32-34`, and `docs/protocol/imported-workspaces.md:133-135`. Kept, with the limit on A above.
  - The original workspace stays permanently archived. No user choice establishes this for a never-started import. B drops it.
  - Archive works in each state of the workspace. Source: `docs/protocol/workspace-life.md:149-150`, from `main`. Kept.
  - B alone also assumes the ordinary 14-day window, whose reason is the cost of a kept computer. Stored work needs no restarts. Under the current retention rule, B keeps the stored work after its window, with no use. F closes that gap.
- **Left out:**
  - Change nothing. It fails the goal. The question suggests a temporary block, and the person cannot get the work back.
  - Activate from the archived state. An archived workspace on `main` has no tools, and its Restore starts nothing, at `docs/protocol/workspace-life.md:192` and `:207`. B gives the same result with the existing Restore and Activate.
  - A guide correction alone. [workspaces-guide-archive-claims.md](workspaces-guide-archive-claims.md) owns it, and it leaves the question and the policy open.
  - A block of Archive before activation. It fails the goal of clearing an unwanted import, and the rule that Archive works in each state stays.
  - A delete of the workspace at Archive. It breaks the rule that each archived workspace stays read-only in the Archived group, at `docs/protocol/workspace-life.md:147-148`. D with the deletion of E gives the same new import and release, and it keeps the record.
  - An operator restore. It gives the person no path in the app, and that path is the goal.
- **Wider fix:** F. It keeps the one Restore rule of B for each kind of retained resource. It also gives that resource one end, so the life of an Archive owns both the computer and the stored work. B stays the wider fix if the user keeps the current retention rule. The first review named B.
- **Previous examples:** Ordinary archived workspaces have 14-day Restore while their computer is kept. That is an existing design precedent. No earlier stored-import recovery case was found.
- **Related:**
  - [workspaces-guide-archive-claims.md](workspaces-guide-archive-claims.md): work that waits for the answer, and the same text. Both change the Archive section of `src/marketing/docs/workspaces.md`. That item states the current truth now. Each option here then changes those sentences again in its own change, as the repository rule for guides requires. No option conflicts with it.
  - [conductor-import-cleanup-scope-promotion.md](conductor-import-cleanup-scope-promotion.md): the same code. E and F request the existing work cleanup group at `worker/conductor-import/service.ts:267`. That item reports a race in the completion of that group. E and F must use the cleanup scopes that it fixes, or they add a new trigger of that race.
  - [conductor-import-mockup-destinations.md](conductor-import-mockup-destinations.md): the same code. B, D, and F redraw the archived import lists in `docs/mockups/src/screens/importedListViews.tsx:56-65`. B and F add Restore to the archived import row of `archivedWithImport`, at `docs/mockups/src/components/workspaces/importSections.ts:92-119`. That item's context record can carry the Restore destination, and its tile destinations stay valid.
  - [archived-computer-certainty.md](archived-computer-certainty.md): the same code. B and F change the source of `restoreUntil` in `src/shared/workspaces.ts` and in the Worker replies and device events. That item changes the same projection to report computer certainty apart from Restore. Change the projection once, so that both rules hold. No conflict.
  - [conductor-import-inactive-tool-writes.md](conductor-import-inactive-tool-writes.md): the same class of state rules for an import that never started. No conflict, and neither waits. Under B or F, the Restore of a never-started import must put it back in Not active, so that the write refusal of that item holds again. One later owner of the import phases could serve both rules.
  - [conductor-import-bar-before-activation.md](conductor-import-bar-before-activation.md): the same code. After a merge, the Archive of the pull request bar opens the Archive question that this item discusses. One option there hides that entry until a successful activation. No option there changes what Archive does, so no option conflicts, and neither item waits.


- **Recommendation:** F. It keeps the 14-day undo of B, then releases stored work that no action can use, as every archived workspace releases its computer.
  - The first review recommended B. The finding check of 2026-11-11 changed the recommendation to F. The root kept F the same day, with the effort Large, as a recommendation for the user.
  - Choose B if the current retention rule must stay.
- **Action:** ask the user, because every option changes a stated requirement that no user decision covers, and the options trade an undo against cost and retention.
  - A also needs the user, because it adds a fact to the question that `docs/protocol/imported-workspaces.md:134-135` states. Agent calls set the words of the question, so they are not approved words of a user decision.
  - Make no interim change before the answer: no new question words, no deletion of stored work, and no Restore.
  - Under B, D, E, or F, read both legal pages and each public guide in full, and update each sentence that restates the changed fact.
  - The first review's Action was: "ask the user, because final Archive versus recovery of retained import work is an unchosen product policy."
- **Validation of the fix, after the answer:**
  - Add a regression for each kept state: a never-started import, a failed activation, and an Archive during a running activation. Assert the offered actions and the Worker replies.
  - Under E or F, assert that the work cleanup removes the stored work and keeps the old documents, also when an org purge overlaps.
  - Update the mockups and run `npm run mockups:check`.
