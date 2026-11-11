# Workspace guide promises unavailable Archive recovery

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from pull request #223, branch `calummoore/conductor-import-option`, review round 3 of head `cfbf916c6a4c4da3c953f0df368ea858fa2a8fb2`, finding 24. It includes the independent finding check and the root outcome of the same day.
- **Location:** `src/marketing/docs/workspaces.md:207`, "It asks no confirmation question.", and `src/marketing/docs/workspaces.md:214-215`, "The notification after Archive names the workspace and offers **Restore**. Use that action if you archived the workspace by mistake." On the main branch of 11 November 2026, the same sentences are at `:214` and `:221-222`. Find them by their words.
- **Reason:** The primary review used both of its fix rounds, and this Low docs finding is not critical.

- **History:** 2026-11-11, root integration record. The Location field now points to `16a4f76c`. The detailed static trace keeps its reviewed source citations. The reviewed Location field was:

> `src/marketing/docs/workspaces.md:166`, "It asks no confirmation question.", and `src/marketing/docs/workspaces.md:173-174`, "The notification after Archive names the workspace and offers **Restore**. Use that action if you archived the workspace by mistake." On the main branch of 11 November 2026, the same sentences are at `:173` and `:180-181`. Find them by their words.

- **Source:** Review. **Category:** Docs or spec. A docs finding has no likelihood grade.
- **Grade reasons:**
  - Severity is Low. The Archive question warns at the action, the notification shows no Restore, and Archive deletes no stored work. Guide readers cannot import before a Mac app release.
  - Confidence is High. A read of the guide, the code, and the protocol shows both false claims.
  - Harder later is No. The edit costs the same later.
- **Terms:**
  - **Public guide:** a Markdown page of the product docs on the marketing site, under `src/marketing/docs/`. Each guide is for users of the product.
  - **Never-started import:** a workspace imported from Conductor that never got a cloud computer. It shows Not active, or a failed activation.
  - **Kept cloud computer:** a cloud computer that Conductive keeps for 14 days after Archive. Restore needs one.
- **Background:**
  - Conductive gives each workspace a cloud computer. Archive stops it and keeps it for 14 days, and Restore brings the workspace back in that time.
  - Archive asks no question and runs no check, at `docs/protocol/workspace-life.md:149-150`. An imported workspace with no successful activation is the one exception: its Archive asks a question with no check, at `docs/protocol/workspace-life.md:151-156` and `docs/protocol/imported-workspaces.md:131-146`.
  - Restore needs a kept cloud computer. An archived workspace without one offers no Restore, and the app refuses it with HTTP 409, at `docs/protocol/workspace-life.md:217-220`.
  - A guide describes only what the current product offers, and it promises no capability that the product does not have, at `docs/protocol/website-docs.md:145-151`.
  - Guide readers cannot import yet. `src/shell/import/ImportSection.tsx:10-15` shows the import entry only in the Mac app. Publishing a Mac app release with the import is still open after the merge. The comparison page at `src/marketing/from-conductor/areas/workspaces-and-branches.ts:16` calls the import through the Mac app in progress. No public guide mentions an import, an activation, or Not active.
- **Problem:**
  - The guide says that Archive asks no confirmation question. A never-started import asks one: `src/shell/workspace/useArchiveActions.tsx:87-92` opens it when `awaitsActivation` is true, and `src/shell/workspace/imported/ImportedArchiveDialog.tsx:19-35` shows "Archive <name>?" with Cancel and Archive.
  - The guide says that the notification offers Restore, and tells readers to use it after a mistake. The notification adds Restore only when a cloud computer is kept, at `src/shell/workspace/useArchiveActions.tsx:59-86`. A never-started import has none, and the Worker refuses its Restore, at `worker/lifecycle/restore-workspace.ts:43` and `:51-59`.
  - The Restore claim was already false before this change after a failed first start. `worker/lifecycle/failed-workspace-data.ts:2-15` removes the sandbox of a failed first start, as `docs/protocol/create-a-workspace.md:175-176` says.
- **Impact if no action:** Readers expect an action that the product does not offer.
- **Root question:** How should the public guide describe the Archive question and the Restore offer, so that each statement is true for every workspace that its readers can archive?
  - The first review asked how the guide explains Archive for imported workspaces. The finding check replaced it on 2026-11-11, because the Restore claim is also false after a failed first start, and guide readers cannot import yet.
- **Options:**
  - **A.** Add the import exception to the confirmation statement. Limit the Restore promise of the notification to a kept cloud computer. Effort: Small.
  - **B.** Split the Archive section into ordinary and imported-workspace cases, and keep their shared steps. Effort: Small.
  - **C.** Add an import guide, and link the Archive exception to it from this section. It adds more public documentation to maintain. Effort: Medium.
  - **D.** Correct both claims without import words. Effort: Small.
    - Limit the confirmation sentence to a workspace after a successful start, or remove it.
    - Say that the notification offers Restore when Conductive keeps the cloud computer, as lines 169 and 180 of the guide already say.
    - Leave the import question and its missing Restore to the change that publishes the Mac app release with the import.
- **Shared assumptions checked:**
  - A, B, and C put import words in a public guide now. It does not hold, because guide readers cannot import before the Mac app release, and a guide describes only what the current product offers. D drops it.
  - All options keep the built Archive behaviour: the question before a successful activation, and no Restore without a kept cloud computer. Kept.
- **Left out:**
  - Change nothing. It keeps two false claims.
  - A product change, such as a Restore that returns a never-started import to Not active. It fails this goal alone, and D is better on every point for this question.
  - Change nothing now and add import words with the Mac app release. D is better on every point, because it also corrects the failed-first-start case now.
  - A test of the guide prose. Doc prose never gets a test.
- **Wider fix:** None. The `documentation` skill and the repository rule for public guides already require a full read of each guide when a protocol fact changes.
- **Previous examples:** None found beyond [privacy-branch-name-rule.md](privacy-branch-name-rule.md). Commit `8eaf4b21` added Archive at once and these two claims. Commit `8567cfb6` added the guide.
- **Related:**
  - [privacy-branch-name-rule.md](privacy-branch-name-rule.md): the same cause. In both, a change of a protocol fact left one public text that restates it. One docs-only branch can fix both, with one full read of the guides and the legal pages. No conflict.
  - [attachment-bucket-unused-inputs.md](attachment-bucket-unused-inputs.md): a shared wider fix that is already in force, the `documentation` skill. One docs-only branch can carry all three items.
  - [conductor-import-unstarted-archive.md](conductor-import-unstarted-archive.md): work that waits for an answer, and the same text. D states the current truth now. Each option there then changes the Archive section of the guide again in its own change.
  - [conductor-import-terms-message-state.md](conductor-import-terms-message-state.md): the same class, and a shared follow-up branch. A public text does not restate an import fact of this change. The current-product rule keeps import words out of the guides, but it does not reach the Terms, which already describe the import. No conflict.
  - [conductor-import-public-guide-access.md](conductor-import-public-guide-access.md): the same current-product rule. That task adds the import limits of messages, files, and tools to two guide lines when a Mac app release ships the import. This item corrects the Archive claims now, without import words. Keep the two apart.
  - [conductor-import-comparison-base-docs.md](conductor-import-comparison-base-docs.md): a shared wider fix that is already in force, the `documentation` skill. The same docs-only branch can carry both.


- **Recommendation:** D. It has the same effort as A, and it is true before and after the Mac app release. It also corrects the older failed-first-start case, and it keeps the guide within the current-product rule.
  - The first review recommended A. The finding check of 2026-11-11 changed the recommendation to D, because A is right only after the release. The root chose D the same day.
  - When a Mac app release makes the import available, that change can add the import question and its missing Restore to a guide.
- **Action:** fix after merge, apply D, because the primary review used both of its fix rounds. Without that limit, the fix rule gives fix now, because a doc contradicts the changed code.
  - The first review's Action was: "fix after merge, apply A, because the two historical primary fix rounds are used and this correction needs no product or protocol change."
- **Validation of the fix:**
  - Read every public guide and both legal pages in full, as the repository rule requires, and correct each sentence that restates these facts.
  - Check each relative link of the changed Markdown by hand.
  - Add no prose test.
