# Stale terminal rule and paths in preview item

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the branch `calummoore/betterstack-implementation-brainstorm`, the link check after its merge of `main`.
- **Updated:** 2026-11-10, after the merge of `main` at `4b74089a`. `main` had fixed the two dead links of the preview item, so this item now covers only its stale words and paths.
- **Location:** `plans/follow-ups/preview-polling-activity.md:59` (its **Previous examples**), `:60` (its **Related**), and `:6`, `:16`, and `:18` (the paths of moved sections).
- **Reason:** The stale words and paths come from `main`, and the Better Stack error reporting change does not touch the preview item.

- **Source:** Implementation. **Category:** Docs or spec.
- **Terms:**
  - **Preview item:** the open follow-up `plans/follow-ups/preview-polling-activity.md`, "A polling preview keeps its sandbox running". Its kind is Needs decision, and the user deferred its choice on 8 November 2026.
  - **Terminal item:** the deleted follow-up `plans/follow-ups/terminal-replies-count-as-activity.md`, "Automatic terminal replies count as activity".
  - **Live content:** a term of the `git-commit` skill. An open follow-up is live content. A change that removes or renames something updates each stale reference to it in live content. History content keeps its words.
- **Background:**
  - The preview item asks which use of a port preview counts as activity. Its options A to D, its recommendation C, and its action stay open for the user. This item changes none of them.
  - Commit `517671ae` on 8 November 2026 added both items. Lines 59 and 60 of the preview item linked the terminal item. The terminal item recorded that each terminal input frame counted as activity, also an automatic reply of xterm.js. It recommended option C: count terminal input only through the input listener of the app page.
  - Commit `f4eb5351` on 8 November 2026 applied option C and deleted the terminal item, with the other applied follow-ups of its milestone. Its message says "Keep automatic terminal replies out of activity". `plans/boat-native-remote-workspaces.md:5572` ticks "Apply option C of `plans/follow-ups/terminal-replies-count-as-activity.md`". The commit reached `main` in `ab584679`.
  - The live rule is in "Input activity" of `worker/lifecycle/routes.md`: "Terminal frames report no activity, because an automatic reply of xterm.js can have the same bytes as a key". `worker/terminal/README.md:173-176` says the same.
  - History of the links: `f4eb5351` left the relative links of lines 59 and 60 dead. A check of every relative Markdown link, on 10 November 2026 at the merge commit `0866ce13`, gave this output for the file, then this total:

    ```text
    ./plans/follow-ups/preview-polling-activity.md: 2 relative links, 2 broken
      line 59: terminal-replies-count-as-activity.md -> missing file
      line 60: terminal-replies-count-as-activity.md -> missing file
    TOTAL: 1951 relative links checked, 2 broken
    ```

  - `main` fixed both links in commit `ebfc286b` on 10 November 2026, "feat(workspaces): add right-click workspace actions (#139)". Each link now points to a permalink of the terminal item at `517671ae`, and both lines kept their words. After the merge `4b74089a`, a check of all Markdown found 2,026 relative links, and none was broken.
  - Line 59 now says this:

    ```markdown
    - **Previous examples:** Automatic replies of the browser terminal also count as activity without input of the user, as [terminal-replies-count-as-activity.md](https://github.com/Firna-AI/remote-code/blob/517671aee868206b101912455f4f5802b5900130/plans/follow-ups/terminal-replies-count-as-activity.md) records. The options check of decision 29 kept open connections out for the same reason.
    ```

  - Line 60 now says this:

    ```markdown
    - **Related:** [terminal-replies-count-as-activity.md](https://github.com/Firna-AI/remote-code/blob/517671aee868206b101912455f4f5802b5900130/plans/follow-ups/terminal-replies-count-as-activity.md): the same activity rule, for the terminal. The two fixes do not conflict. Both change "Input activity" in `worker/lifecycle/README.md`.
    ```

  - So line 59 still says, in the present tense, that automatic terminal replies count as activity. `main` no longer counts them.
  - Line 60 still calls both rules fixes that change "Input activity" in `worker/lifecycle/README.md`. The terminal fix is applied, and that section now lives in `worker/lifecycle/routes.md`. `worker/lifecycle/README.md:40` keeps only a short pointer to it.
  - Lines 6 and 16 name "Stop and resume" at `docs/protocol/workspaces-and-sandboxes.md:202-209`. That section now lives at `docs/protocol/workspace-life.md:67`, and `docs/protocol/workspaces-and-sandboxes.md:160` keeps only a pointer.
  - Line 6 also names the activity paragraph at `worker/previews/README.md:171-175`. That paragraph is now at lines 175 to 179.
  - Line 18 names "Input activity" in `worker/lifecycle/README.md`, which now points to `worker/lifecycle/routes.md`.
  - These are words and paths, not links, so a link check does not catch them.
- **Problem:** The preview item is live content. Line 59 states an old terminal rule as current. Lines 6, 16, 18, and 60 name sections at places that moved.
- **Impact if no action:** A reader of the open decision sees a terminal rule that no longer holds, and looks for sections in the wrong places. A later choice of the preview rule can rest on that wrong picture.
- **Root question:** How does the open preview item give the current terminal rule and the current place of each section that it names?
- **Options:**
  - **A.** Update the stale words and paths in place. Line 59 then says in the past tense that terminal replies counted, and that `f4eb5351` stopped it. Line 60 points to the live rule. Keep the permalink history and the meaning of both fields. Effort: Small.
  - **B.** Update only the paths on lines 6, 16, 18, and 60, and keep line 59. It keeps a present-tense claim that is false. Effort: Small.
  - **C.** Remove the example of line 59 and the **Related** line. The item then loses its previous example and the link between the two rules. Effort: Small.
- **Left out:**
  - Restore the terminal item: it brings back finished work, which `f4eb5351` applied.
  - Change nothing: it fails the goal, because the false sentence and the old paths stay.
  - Change the options, the recommendation, or the action of the preview item: the user decides the preview rule, and this item covers only its words and paths.
  - A gate check for stale paths: it adds a new gate, which the user decides.
- **Wider fix:** None that this item applies. The `git-commit` skill already asks a change that removes or renames something to update its stale references in live content.
- **Previous examples:** The dead links of the same two lines, which `main` fixed in `ebfc286b`, as the Background says.
- **Recommendation:** A. It follows the rule for live content, keeps the meaning of both fields and the permalink history, and removes the false statement. B is smaller, but it keeps that statement.
- **Action:** fix after merge, apply A, because the preview item is unchanged against `main`, and the Better Stack error reporting change does not touch it.

Proposed text for A, with paths relative to `plans/follow-ups/`. Line 59:

```markdown
- **Previous examples:** Automatic replies of the browser terminal also counted as activity without input of the user, as the deleted [terminal item](https://github.com/Firna-AI/remote-code/blob/517671aee868206b101912455f4f5802b5900130/plans/follow-ups/terminal-replies-count-as-activity.md) records. Commit `f4eb5351` applied its option C on 8 November 2026, so terminal frames now report no activity, as [Input activity](../../worker/lifecycle/routes.md#input-activity) says. The options check of decision 29 kept open connections out for the same reason.
```

Line 60:

```markdown
- **Related:** [Input activity](../../worker/lifecycle/routes.md#input-activity) holds the same activity rule for the terminal, which commit `f4eb5351` applied. A fix of this item changes the same section, and it does not conflict with that rule.
```

In the same edit, correct the paths:

- On lines 6 and 16, name "Stop and resume" in `docs/protocol/workspace-life.md:67`.
- On line 6, name the activity paragraph at `worker/previews/README.md:175-179`.
- On line 18, name "Input activity" in `worker/lifecycle/routes.md`.
- Check the other line numbers of its **Location**, such as `worker/previews/proxy.ts:99-102`, because `main` changed files that it names.

Then check each relative link of the file. Change nothing else in the preview item.
