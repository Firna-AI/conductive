# Late answer words have two sources

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from UI research on `calummoore/wake-a-session-when-a-turn-ends-b5kh`.
- **Location:** `src/shared/secret-late-answer.ts`, `src/chat/secrets/LateAnswerLine.tsx`, `src/ui/components/chat/secretRunCopy.ts`, and `docs/mockups/src/components/chat/LateAnswerLine.tsx`.
- **Reason:** The watch call can use one word builder without refactoring the existing secret-answer mockups and app components.

- **Terms:**
  - **Late answer line:** the app line that tells an agent about a secret answer after its tool call stopped waiting.
- **Background:** The app and agent share the late-answer words from `src/shared/secret-late-answer.ts`. The mockups build the same words separately in `secretRunCopy.ts`. The app and mockups also have separate late-answer line components.
- **Problem:** The same product words and line layout have two authored sources. A copy change needs edits in both.
- **Impact if no action:** Keeping mockups and product aligned continues to need duplicate edits.
- **Root question:** How should the app and mockups share the late-answer words and line layout?
- **Options:**
  - **A.** Keep both sources and check their alignment during each relevant change. Effort: Small.
  - **B.** Use one word builder and one reusable line component for the app and mockups. Keep current words, layout, attribution, and access. Effort: Medium.
- **Left out:** Generated source copies retain separate authored inputs or add an unnecessary generation step. Only retaining or removing the duplicate source offers a useful choice.
- **Wider fix:** B. One authored source removes the need for duplicate edits.
- **Previous examples:** The stop line already shares its mockup component and copy with the app.
- **Recommendation:** B. It preserves the current behavior and removes duplicate maintenance.
- **Action:** Fix after merge, apply B. This cleanup changes existing secret UI outside the watch-call scope.
