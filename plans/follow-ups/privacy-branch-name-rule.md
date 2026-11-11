# Privacy notice misstates existing branch names

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from pull request #223, branch `calummoore/conductor-import-option`, review round 3 of head `cfbf916c6a4c4da3c953f0df368ea858fa2a8fb2`, finding 25. It includes the independent finding check and the root outcome of the same day. After the supplementary review of the same day, the root folded the branch and name claims of the comparison notes into this item.
- **Location:**
  
  - `src/marketing/privacy-recipients.ts:44-48`, the current branch-name clauses at `16a4f76c`. The notice now also names the target branch and later updates of both names. Its prefix claim says: "Each workspace branch starts with the GitHub login of the workspace owner when that branch is created."
  - `src/marketing/privacy.ts:28-29`, the effective date.
  - `src/marketing/from-conductor/areas/workspaces-and-branches.ts:45`, `:60`, and `:74`, the comparison claims. Preserve their feature statuses.

- **Reason:** The primary review used both of its fix rounds, and the approved branch behaviour needs no change.

- **History:** 2026-11-11, root integration record. The Location field now points to `16a4f76c`. The detailed static trace keeps its reviewed source citations. The reviewed Location field was:

> - The Privacy sentence: "They also get the name of the workspace branch, which starts with the GitHub login of the first owner of the workspace." On this branch it is at `src/marketing/privacy.ts:81-83`. On the main branch of 11 November 2026, commit `80401a06` moved it to `src/marketing/privacy-recipients.ts:44-46`. Find it by its words after the merge.
>   - The effective date: `src/marketing/privacy.ts:28` on this branch, and `src/marketing/privacy.ts:27` on that main.
>   - The comparison notes: `src/marketing/from-conductor/areas/workspaces-and-branches.ts:45`, `:60`, and `:74` on this branch. That main changed three comparison notes, so find them by their claims.

- **History:** 2026-11-11, root integration record. Main changed the live Privacy words and added target-branch and later-name facts. The earlier proposed example of A was:

> - Example: "They also get the name of the workspace branch. The name of a new branch starts with the GitHub login of the first owner of the workspace. A workspace on an existing branch, and an imported workspace, keep the name of that branch." The fix can also say that such a kept name can hold the login of another person.

- **Source:** Review. **Category:** Docs or spec. A docs finding has no likelihood grade.
- **Grade reasons:**
  - Severity is Low. The notice still says correctly that providers get the branch name. Only the description of the name is wrong.
  - Confidence is High. A read of the notice, the code, and the protocol shows the false claims.
  - Harder later is No. The edit costs the same later, and it needs no new Terms agreement.
- **Terms:**
  - **Continue a branch:** the New workspace choice that starts a workspace on a branch or an open pull request that already exists on GitHub.
  - **Imported workspace:** a workspace that the Mac app creates from a local Conductor workspace. It keeps the branch and the name of that Conductor workspace.
  - **First owner:** the member who created the workspace. An admin can later give the workspace another owner.
  - **Comparison page:** the public page at `conductive.build/from-conductor`, which gives each listed Conductor feature a status. Its rows and notes live in `src/marketing/from-conductor/`.
- **Background:**
  - The Privacy notice says which personal data Anthropic and OpenAI get. Providers get the name of the workspace branch, because the agent instructions name it, at `docs/protocol/agent-instructions.md:42` and `:74`.
  - Before this change, every workspace got a new branch built as `<GitHub login>/<city>-<suffix>`. This change adds two ways to keep an existing branch name: Continue a branch, and Import from Conductor.
  - A workspace on an existing branch keeps the name of that branch, at `docs/protocol/continue-a-branch.md:67-68`. An imported workspace has the branch of its Conductor workspace, at `docs/protocol/imported-workspaces.md:21-22`, and takes the name of its Conductor workspace, at `docs/protocol/conductor-import.md:75-80`. The user chose this import of the branch for the import design.
  - The change narrowed the protocol rule at `docs/protocol/create-a-workspace.md:150` to "The name of a new branch starts with". Commit `2a83761e` made that change and changed the public workspace guide to "A new branch's name", at `src/marketing/docs/workspaces.md:74`. It left the Privacy sentence.
  - The repository rules say that a change to a protocol fact updates each legal-page sentence that restates the fact, after a full read of both legal pages. They also say that the comparison rows follow the claim rules of `docs/protocol/conductor-comparison.md#statuses`.
- **Problem:**
  - At `16a4f76c`, the Privacy notice says that each workspace branch starts with the owner's login when that branch is created. An existing or imported branch can have any kept name, such as `release/payments`. A continued pull request branch such as `alice/fix-totals` gives providers the login of its author, not of the first owner.
  - The comparison notes at `workspaces-and-branches.ts:45`, `:60`, and `:74` say that each workspace creates its own branch with a city name and gets its name from its first message. That is false for a continued branch and for an imported workspace.
- **Impact if no action:** The public notice gives a false explanation of the branch data sent to providers. The comparison page gives false product facts. No data handling is wrong.
- **Root question:** How should the notice describe branch names sent to model providers?
  - The first review asked this question, and the finding check of 2026-11-11 kept it. The root fold of the same day applies the same answer to the branch and name claims of the comparison notes.
- **Options:**
  - **A.** State that providers receive the branch name. Limit the owner-login naming rule to new branches that Conductive creates. Effort: Small.
    - Example: "They get the names of the workspace branch and the branch that a pull request targets. Later messages give the current names when either branch changes. A branch that Conductive creates starts with the GitHub login of the workspace owner when it creates that branch. A workspace on an existing branch, and an imported workspace, keep the name of that branch." Keep every current data-recipient fact.
    - Folded: give the comparison notes the same scope. A new branch gets its generated name with a city. A continued or imported workspace keeps its branch, and an imported workspace keeps its Conductor name.
  - **B.** Remove the owner-login attribution, and keep only the true statement that providers receive the branch name. Effort: Small.
  - **C.** State the kind of data, not the naming rule: providers get the name of the workspace branch, and that name can contain personal data, such as a GitHub login. It stays true when the naming rule changes, but it no longer says whose login goes, and that the first owner's login reaches providers also in the sessions of other members. Effort: Small.
- **Shared assumptions checked:**
  - Kept branch names stay, by the protocol rules above and the user's import design. Kept.
  - Providers get the name of the workspace branch. Kept.
  - The notice keeps a statement about the branch name, because a name that holds a login is personal data. Kept.
  - A change of the Privacy text alone needs no new Terms agreement at sign-in. `docs/protocol/access-and-security.md:55-56` ties a new agreement to a changed Terms revision, and the Privacy-only commits `076ce5c1` and `8eaf4b21` kept `TERMS_VERSION`. Kept.
- **Left out:**
  - Rename kept branches to the login form. It breaks the kept-name rules and the user's import design.
  - Keep the universal claim. It fails the goal.
  - Stop the branch name in model requests. It breaks `docs/protocol/agent-instructions.md:42`, and the Git output of the agent still shows the name.
  - A test or a lint of the legal text. Doc prose never gets a test, and a lint is a new gate that needs the user.
  - The comparison row statuses at `workspaces-and-branches.ts:16` and `:33-37`, which call the Mac app import and the start from a branch or pull request in progress. They are not part of this item. The existing shipping audit updates them in the change that ships those features, as the repository rule for the comparison page says.
- **Wider fix:** None. The `documentation` skill, the legal-page rule, and the comparison-page rule of the repository are in force. A full read of both legal pages does not depend on the words of a fact, so it still prevents the class.
- **Previous examples:** None found. The public workspace guide already says "A new branch's name".
- **Related:**
  - [workspaces-guide-archive-claims.md](workspaces-guide-archive-claims.md): the same cause. One docs-only branch can fix both, with one full read of the guides and the legal pages. No conflict.
  - [attachment-bucket-unused-inputs.md](attachment-bucket-unused-inputs.md): a shared wider fix that is already in force, the `documentation` skill. One docs-only branch can carry all three items.
  - [privacy-internal-decision-reference.md](privacy-internal-decision-reference.md): the same notice, another sentence. The same docs-only branch can carry it.
  - [legal-pages-doc-misses-recipients-file.md](legal-pages-doc-misses-recipients-file.md): the same module. On `main` at `89ff2747`, the sentence that A here corrects lives in `src/marketing/privacy-recipients.ts:44-46`, which that item names in the legal page docs. One docs-only branch can carry both.
  - [conductor-import-terms-message-state.md](conductor-import-terms-message-state.md): the same class, and a shared follow-up branch. One full read of both legal pages can fix both. A Privacy correction alone needs no new Terms revision, but that item changes the Terms. When both ship together, one Terms revision covers the change.
  - [legal-agent-message-state.md](legal-agent-message-state.md): the same full read of both legal pages. That item also changes the Terms, so it can share the same Terms revision.
  - [conductor-import-comparison-base-docs.md](conductor-import-comparison-base-docs.md): the same cause. A claim that was written when each create made a new branch is false for an existing branch. One docs-only branch can carry both. No conflict.


- **Recommendation:** A. It is the only option that keeps each personal-data fact that a reader needs, and it gives the notice the scope that the guide already has. B drops the fact that the first owner's login goes to providers. C no longer says whose login goes. A adds only facts that the protocol docs state.
  - The first review recommended A, and the finding check of 2026-11-11 kept it. The root kept A the same day, and added the comparison notes after the supplementary review.
- **Action:** fix after merge, apply A, because the primary review used both of its fix rounds and the approved branch behaviour needs no change.
  - Update the effective date of the notice on the day that the fix ships, as the notice promises in its section "Changes to this notice": `src/marketing/privacy-closing.ts:58-59` on this branch, `src/marketing/privacy.ts:195-196` on the main branch of 11 November 2026.
  - Change no `TERMS_VERSION`. A Privacy correction alone needs no new Terms consent.
  - The first review's Action was: "fix after merge, apply A, because the two historical primary fix rounds are used and the approved branch behavior needs no change."
- **Validation of the fix:**
  - Read both legal pages and every public guide in full, and correct each sentence that restates the branch-name fact.
  - `docs/mockups/src/screens/LegalScreen.tsx` renders the same Privacy document, and no site picture shows the Privacy page, so no mockup or picture changes.
  - Check each relative link of the changed files by hand. Add no prose test.
