# The effort words exist in three places

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from branch `calummoore/claude-login-notice-removal`, pull request #75, a new problem of the check of review round 3, finding 5.
- **Location:** `src/chat/state/format.ts:4`, `src/shell/ui/ModelPicker.tsx:16`, and `docs/mockups/src/fixtures/agents.ts:12` (the effort words). `modelLabel` exists in `src/chat/state/format.ts` and in `src/shell/ui/ModelPicker.tsx`.
- **Reason:** Every copy is already on `main`, and pull request #75 changes none of them.

- **Source:** Review.
- **Category:** Code structure.
- **Terms:**
  - **Effort words:** the names of the effort levels that the model picker shows, such as "High" in "Opus 5.5 High".
- **Background:**
  - The model picker shows the model and its effort.
  - The chat picker reads the effort words from `src/chat/state/format.ts`. The picker of a new workspace, `src/shell/ui/ModelPicker.tsx`, has its own copy. The mockups read them from the fixture `docs/mockups/src/fixtures/agents.ts`.
  - `modelLabel`, the label of a model choice, also exists twice: in `src/chat/state/format.ts` and in `src/shell/ui/ModelPicker.tsx`.
- **Problem:** The same product words live in three places. A change of one word must change all three, and nothing checks that they agree.
- **Impact if no action:** The chat, a new workspace, and the mockups can show different words for the same effort level.
- **Root question:** Where do the effort words and the model label live, so that every picker shows the same words?
- **Options:**
  - **A.** Keep one copy of the effort words and of `modelLabel` in a shared app module, such as `src/shared/agents.ts`, and import it in both app pickers. The mockup fixture keeps its own sample copy. Effort: Small.
  - **B.** As A, and let the mockups import the same words from a pure module, so that the fixture keeps only sample data. Effort: Small.
- **Left out:** A check that the copies agree: it keeps the copies, so A and B are better on every point.
- **Wider fix:** B. One copy serves the app and the mockups.
- **Previous examples:** None found.
- **Recommendation:** B. The words are product text, not sample data, so one pure module fits both.
- **Action:** fix after merge, apply B, because every copy is on `main` and this branch changes none of them.
