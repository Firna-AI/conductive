# Mac and cloud disagree on imported tree facts

- **Severity:** High. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from pull request #223, branch `calummoore/conductor-import-option`, review round 3 of head `cfbf916c6a4c4da3c953f0df368ea858fa2a8fb2`, findings 10 and 11. It includes both independent finding checks and the root outcome of the same day, which joined the two findings in one wider fix. It also records the open observation about the stricter desktop LFS pointer form that the child review of head `d6bd4fbf` left for this review.
- **Location:** `desktop/src/import/disk.ts:52-97`, `measureGitDisk`, with the gitlink count at `:67` and the pointer reader at `:75-87`. `runner/src/import-git.ts:71-134`, `verifyImportTree`, with its count at `:112-119` and its comparison at `:124-133`. `runner/src/import-lfs.ts:11-22`, the restore pointer reader, and `:52-98`, the LFS count and comparison. `desktop/src/import/inventory-lfs.ts:11-21`, the inventory reader, and `:74-88`, its entry filter. `runner/src/import-git-tree.ts:12-50`, the runner tree parser. `src/shared/conductor-import.md:71-80`, the Git disk facts contract.
- **Reason:** The import review used both of its fix rounds, and this Rare failure is not critical: the stored work stays, the gitlink case recovers at the next activation after a runner fix, and the wrong pointer file is recoverable.

- **History:** 2026-11-11, root integration record. The Location field now points to `16a4f76c`. The detailed static trace keeps its reviewed source citations. The reviewed Location field was:

> `desktop/src/import/disk.ts:52-97`, `measureGitDisk`, with the gitlink count at `:67` and the pointer reader at `:75-87`. `runner/src/import-git.ts:71-134`, `verifyImportTree`, with its count at `:112-119` and its comparison at `:124-133`. `runner/src/import-lfs.ts:11-22`, the restore pointer reader, and `:52-98`, the LFS count and comparison. `desktop/src/import/inventory-lfs.ts:11-21`, the inventory reader, and `:74-88`, its entry filter. `runner/src/import-git-tree.ts:12-50`, the runner tree parser. `src/shared/conductor-import.md:57-66`, the Git disk facts contract.

- **Source:** Review. **Category:** Product bug.
- **Grade reasons:**
  - Likelihood is Rare. The gitlink case needs a committed submodule, a minority repository setup, though a standard Git feature. The pointer case needs an unusual pointer blob, such as a pre-release Git LFS pointer or a CR LF pointer. No usage data exists.
  - Confidence is High. Reads of the code, of Git's `tree-walk.c`, `entry.c`, and `git-ls-tree` manual, and of the Git LFS reference parser show each step. No run reproduced either failure.
  - Harder later is Yes for the pointer part. A fixed reader cannot repair a stored package whose LFS facts came from the old Mac disk reader. The gitlink part has no such cost, because a runner fix that keeps the Mac rule repairs published imports at their next activation.
- **Terms:**
  - **Gitlink:** a Git tree entry with mode `160000`. It names one commit of a submodule, not its files.
  - **Git LFS pointer:** a small Git blob that names separate working bytes by their SHA-256 and size.
  - **Checkout facts:** the `gitDisk.checkout` counts of the import snapshot: files, file bytes, directories, links, link bytes, and path bytes of the HEAD tree.
  - **LFS facts:** the `gitDisk.lfs` counts of the snapshot: the distinct LFS payloads, their bytes, and their paths in the worktree.
  - **Reference reader:** the pointer parser of Git LFS, `DecodeFrom` in `lfs/pointer.go` of the `git-lfs/git-lfs` repository. Git LFS wrote the working files on the Mac.
- **Background:**
  - Conductive's Mac app imports local Conductor workspaces. It measures the checkout facts and the LFS facts of the imported HEAD tree in one loop, `measureGitDisk`, and puts them in the snapshot.
  - At activation, the runner in the cloud computer checks the tree ID, then measures the same tree again and compares, before it changes the checkout. Only the runner compares. The Mac produces the counts.
  - `src/shared/conductor-import.md:62` says that each path of the full target tree counts. It does not name the counter of a gitlink.
  - Three readers recognize LFS pointers. The inventory reader selects working bytes and asks GitHub for availability. The disk and restore readers calculate and verify the LFS facts.
  - `docs/protocol/conductor-import.md:140` says: "A file that GitHub holds in Git LFS comes from GitHub at the activation." `docs/protocol/conductor-import.md:197-199` says that the activation must restore the work exactly.
  - The agent call of 10 November 2026 classifies an unchanged LFS working file only from its staged HEAD pointer, matching payload hash, size, and mode, and positive availability on GitHub.
- **Problem:** The Mac and the runner calculate different facts for the same imported HEAD tree.
- **Problem, gitlink counts:**
  - `desktop/src/import/disk.ts:67` adds one directory for each `tree` row and for each mode `160000` row. `runner/src/import-git.ts:112` adds one only for mode `040000`. A `160000` row matches no branch of the runner.
  - So one committed gitlink gives unequal checkout facts, also when its submodule is clean or not initialized. `import-git.ts:133` throws "The imported checkout facts do not match."
  - Nothing else blocks a gitlink after the count. `prepareImportLfs` skips rows that are not regular files. `git checkout --force` makes an empty folder for a gitlink, and `git checkout-index` leaves it alone.
- **Problem, pointer grammar:**
  - The forms, side by side, from the code and from `lfs/pointer.go` and `docs/spec.md` of Git LFS, read on 2026-11-11:

    | Pointer form | Git LFS | Inventory | Disk | Restore | Effect now |
    | --- | --- | --- | --- | --- | --- |
    | Canonical, LF | Yes | Yes | Yes | Yes | Works |
    | CR LF on every line | Yes | Yes | No | No | Silent pointer text |
    | `hawser` version line | Yes | No | No | Yes | Failed activation |
    | Blank line inside, or white space around the blob | Yes | No | No | Yes | Failed activation |
    | `size` line before the `oid` line | No | No | No | Yes | Failed activation |
    | Extra line after the `size` line | No | No | No | Yes | Failed activation |
    | `git-media.io/v/2` version line | Yes | No | No | No | Uploads as a changed file |

  - The reference reader trims white space around the blob, ends each line at LF and drops one CR, skips empty lines, and needs the keys `version`, `oid`, and `size` in that order, with valid `ext-N-name` keys between them. It accepts three exact version lines: `http://git-media.io/v/2`, `https://hawser.github.com/spec/v1`, and `https://git-lfs.github.com/spec/v1`. It needs `sha256:` with 64 lowercase hex digits, and it refuses an extra line after `size`.
  - The Mac regexes do not escape the dots of `git-lfs.github.com`, so they accept a look-alike version line. The restore trims a UTF-8 byte order mark, which Go's `bytes.TrimSpace` does not.
  - Trace A, failed activation: HEAD holds a pointer that only the restore reads. The Mac leaves it out of the LFS facts, and `runner/src/import-lfs.ts:92-98` throws "The imported LFS facts do not match."
  - Trace B, silent pointer text: HEAD holds a CR LF pointer whose payload GitHub advertises. The inventory gives the path its LFS facts, so the package writes no record for it. The disk and restore readers both skip the blob, so the facts agree. The path gets no download, and the raw checkout writes the pointer text there. Nothing reports it.
- **Impact if no action:**
  - Gitlink: the upload publishes the workspace, and each activation fails. The person sees "The stored work could not be restored. Your stored work is kept. Try again." The text names no cause, and each Try again fails in the same way, because each one builds a new job from the same snapshot.
  - Trace A: the activation of the whole workspace fails, and Try again repeats it. The row shows as imported, so the person cannot import it again.
  - Trace B: a path restores as pointer text in place of its working bytes, with no notice. It loses no data, because GitHub advertises the payload and the Mac keeps the source.
- **Root question:** How do the Mac and the cloud computer reach the same facts for one imported HEAD tree, so that activation accepts each valid tree and restores each Git LFS file exactly?
  - It serves two questions that the review of 11 November 2026 asked separately. The gitlink question: "How can activation accept each imported tree with a committed gitlink, while its disk check still uses facts that fit the restored tree?" The pointer question: "How should the Mac and the cloud computer agree on which HEAD paths are Git LFS files, so that activation restores each one exactly?"
  - Option E answers both. Each other option answers only one of them.
- **Options:** A to E keep the letters that the review gave the pointer question. F, G, and H are the gitlink options of the review, whose letters A, C, and D were taken. The gitlink option B of the review is part of E.
  - **A.** Align the three local pointer readers, and add regressions for their current mismatches. It keeps three copies of the grammar. Pointer part only. Effort: Small.
  - **B.** Put one portable pointer reader in the shared import contracts, for the inventory, the disk measure, and the restore. It keeps the union of today's forms. Pointer part only. Effort: Medium.
    - The union counts blobs that Git LFS does not read as pointers, and it misses the `git-media` line.
  - **C.** Declare every LFS path and object in the manifest, and make the restore use that declaration in place of its own reader. It changes the stored boundary format, and it still needs one Mac reader, because the inventory and the disk reader disagree in trace B. Pointer part only. Effort: Large.
  - **D.** Put one shared Git LFS pointer reader in `src/shared/`, beside `conductor-import-lfs.ts`. Pointer part only. Effort: Medium.
    - It takes the entry mode, the entry size, and the blob bytes. It applies the mode check, only `100644` or `100755`, and the cutoff below 1024 bytes.
    - It follows the reference reader: trim white space around the blob, but not a byte order mark. End each line at LF and drop one CR before it. Skip empty lines. Need `version`, `oid`, and `size` in that order, with valid `ext-N-name` lines. Accept the three version lines by exact comparison. Need a lowercase SHA-256 and a safe-integer size. Refuse an extra line.
    - The inventory, the disk measure, and the restore all call it. `src/shared/conductor-import.md` states the rule.
    - Packaging needs no change. `desktop/electron-builder.yml:13` unpacks `src/shared/**`, and the runner build bundles its imports.
    - Behaviour change: the restored bytes change only at a trace B path. The trace A forms then activate, and a `git-media` file then comes from GitHub, as `docs/protocol/conductor-import.md:140` says.
  - **E.** One shared Git disk facts calculator in `src/shared/`, with the reader of D and one tree-record classifier. Effort: Medium.
    - It takes the HEAD tree rows and the pointer results, and returns the `checkout` facts and the `lfs` facts.
    - It names each of the five Git tree modes in one place, as `runner/src/git-entries.ts:5` does for index entries. It keeps the current rule that a gitlink counts as one directory, because the checkout makes an empty folder for it. It owns the totals, the size parse, and the path-byte rule, not only the mode test.
    - `measureGitDisk` writes the snapshot facts with it. `verifyImportTree` and `prepareImportLfs` compute the same object with it and compare the whole object. The inventory takes its pointers from the same reader.
    - Read the tree through `importTreeEntries` in `runner/src/import-git-tree.ts:12-50`, and drop the inline parser at `runner/src/import-git.ts:83-121`.
    - Add one sentence under Git disk facts in `src/shared/conductor-import.md`: a gitlink counts as a directory.
  - **F.** Count gitlinks as directories in the runner, as the Mac already does, and add a gitlink regression. Gitlink part only. Effort: Small.
  - **G.** Add a separate gitlink count to the snapshot contract, and update its producer, readers, disk checks, and restore. It changes the stored format, so published snapshots need a compatibility read. Gitlink part only. Effort: Medium.
  - **H.** Let the cloud own the checkout facts of the tree that it holds. Keep the tree ID check. `verifyImportTree` measures the fetched tree, and the second disk check uses that measure, as it already does for LFS. A difference from the Mac facts gives a runner warning, not a failure. Gitlink part only. Cost: two calculations stay, and drift shows only as a warning and an imprecise disk check before the transfer. Effort: Medium.
- **Left out:**
  - Change nothing. Activation fails for some trees, and a trace B path restores pointer text.
  - A Mac-side mirror of F that drops gitlinks from `directoryCount`. F is better on every point: it keeps "Each path counts", the disk block of the empty folder, and the repair of published snapshots.
  - Skip the count check while the second disk check still reads the Mac facts. Understated facts would pass both disk checks. H is the safe form.
  - Refuse a workspace whose HEAD holds a gitlink. It fails the goal, and it is a new rejection.
  - Restore submodules as repositories. That answers the submodule question, not this count.
  - Drop the Mac checkout facts. The disk check before the transfer runs before the cloud holds the tree.
  - A canonical-only pointer rule. `hawser` and CR LF files would then upload as changed files, and such a file over 100 MiB would stay on the Mac although GitHub holds its payload, against `docs/protocol/conductor-import.md:140`.
  - Bypass the LFS facts check. A trace B path still restores pointer text.
  - Git LFS itself as the cloud reader. D is better on every point. The Mac still needs a reader, and the program reads endpoints from `.lfsconfig`, while the restore sends the activator's token only to the fixed GitHub endpoint at `runner/src/import-lfs-transport.ts:94-98`.
  - Classify by the `filter=lfs` attribute. It misses a file that Git LFS wrote through an attribute rule outside HEAD, such as a global attributes file.
  - A guard that compares the omitted paths with the downloads. It only turns trace B into a failed activation, and it is a new rejection.
  - A parity test that runs each reader over a set of forms. It is a test for the class, and one reader needs no parity test.
  - The Worker as the classifier. It never reads the HEAD blobs and runs no Git.
- **Wider fix:** E. One calculator keeps the facts of both sides equal by construction, also when a detail changes shape. D alone is the wider fix of the reader class. The review first named B for each question.
- **Previous examples:** Commit `66ad57da` made the runner's index entry reader name mode `160000` in one closed mode type, at `runner/src/git-entries.ts:5`. `desktop/src/import/disk.test.ts` covers trees, files, links, and LFS pointers, but no committed gitlink. The LFS tests use only canonical LF pointers: `desktop/src/import/disk.test.ts:18`, `desktop/src/import/package-lfs.test.ts:53,61,73`, and `runner/src/import-lfs.test.ts:20`. The child review of head `d6bd4fbf` saw the `hawser` and order drift and left it for this review. That is the same seam, not a second occurrence.
- **Related:**
  - [conductor-import-omitted-lfs-head-pointer.md](conductor-import-omitted-lfs-head-pointer.md): the same code. Both use the pointer set of `selectedLfsPointers` and the download loop at `runner/src/import-lfs.ts:100-122`. That item also occurs with a canonical LF pointer, so neither waits. Its chosen fix works with A, B, D, or E here. If this item ever takes C, its dispositions should feed that manifest declaration.
  - [conductor-import-submodule-working-content.md](conductor-import-submodule-working-content.md): the same trigger, with separate causes. An answer there that keeps importing a workspace with a submodule cannot activate end to end until this item is fixed. This item needs no answer from there. One fixture with a committed gitlink can serve the regressions of both.
  - [conductor-import-sparse-checkout-deletions.md](conductor-import-sparse-checkout-deletions.md): the same code, with no conflict. This item changes how a pointer is read. That item changes which pointer paths can become deletions, at `inventory-lfs.ts:94`.
  - [conductor-import-small-blob-reads.md](conductor-import-small-blob-reads.md): the same code, and a shared implementation. Its B gives the three consumers one bounded raw blob reader. Build it in the same unit as E here, as one tree pass. Its B keeps the current parsers, so it does not wait for the grammar here. Its D waits for that grammar. If this item takes C, the runner part of its B loses its purpose.
  - [conductor-import-intel-guard-expiries.md](conductor-import-intel-guard-expiries.md): the same code. E changes `measureGitDisk`, which each of the six expiring Intel cases runs. No evidence links this item to the expiries. Keep its regressions in separate cases.
- **Recommendation:** E. One shared calculator makes the checkout facts and the LFS facts equal on both sides, with a reader that counts as LFS exactly the files that Git LFS reads.
  - Keep the grammar of the Git LFS reference reader, not the union of today's readers.
  - The table test of literal forms is the regression of the requirement at `docs/protocol/conductor-import.md:140`. It is not a test for the class, and it adds no gate.
  - The review first recommended B for each question. The finding checks of 2026-11-11 kept B for the gitlink question, and recommended D for the pointer question, with E as the one fix for both. The root chose E the same day, with the gitlink B inside it.
  - H is the fallback if no facts difference may fail an activation. H gives up the exact check.
- **Action:** fix after merge, apply E, because the import review used both of its fix rounds and this Rare High product bug is not critical. Trace B loses no data, because GitHub advertises the payload and the Mac keeps the source. Land it before the first Mac release that imports, because a fixed reader cannot repair a stored package whose facts came from the old disk reader.
  - The review's Actions were: "fix after merge, apply B, because the two authorized source fix rounds are used. The review owner makes the final outcome call." for the gitlink question, and "ask the user, because the CRLF case can omit working bytes from the restored import after the two authorized fix rounds. The review owner must decide whether to request another fix round." for the pointer question. The check found that trace B loses no data.
- **Validation of the fix:**
  - One table test of literal pointer forms, with each expected result worked out by hand from the reference reader. Include the three version header lines, the forms that Git LFS refuses, CR LF, blank lines, white space around the blob, the byte order mark, and the unescaped look-alike version line.
  - One regression at each consumer for trace A and for trace B: the inventory, the disk measure, and the restore.
  - One gitlink regression through both consumers, in `desktop/src/import/disk.test.ts` and in the runner restore tests. Keep it out of `desktop/src/import/inventory-nested.test.ts`, which fails on the Mac CI jobs for another reason.
  - Put each new desktop assertion in a separate small case. Do not grow the package cases that already meet the Intel 5,000 ms guard.
  - No runtime reproduction of either failure exists. The traces come from source reads only, so the regressions are the first runtime proof.
  - Keep every current assertion, guard, and time limit. Record pass counts on Linux, Apple silicon, and Intel.
