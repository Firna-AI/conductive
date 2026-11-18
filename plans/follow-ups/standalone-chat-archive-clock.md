# Standalone chat keeps an expired archive notice

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from branch `calummoore/quito-q38c`, review finding 3.
- **Location:** `src/chat/components/SandboxState.tsx:94`, `src/chat/WorkspaceChat.tsx:143`, `src/chat/ui/clock.ts:46`
- **Reason:** The review that found it came after the two fix rounds of the branch. The app screen is not affected, and the fix changes the shared clock of both chat entry points.

### 1. Standalone chat keeps an expired archive notice

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Review.
- **Category:** Product bug.
- **Location:** `src/chat/components/SandboxState.tsx:94`
- **Terms:**
  - **Removed workspace:** an archived workspace whose 14 days of Restore ended. It leaves the workspace list, and its chat stays readable by link. Cal chose this on 13 November 2026.
  - **Standalone chat:** `WorkspaceChat` or `WorkspaceChatView` without a `host` notice from the app. It draws its own archive notice. The chat dev page uses it.
- **Background:** The workspace screen of the app passes the chat a notice with its own removal timer (`src/shell/workspace/ChatArea.tsx`, `WorkspaceScreen.tsx`), so the app shows "Removed on <day>" at the moment the 14 days end. The standalone chat picks its notice from the time of `useNow` in `src/chat/ui/clock.ts`. That clock reads the time again only while it ticks: while a turn runs or a sandbox starts.
- **Problem:** While an archived workspace is open in the standalone chat, the clock does not tick. So the notice keeps "Archived on <day>" and the future removal day after the 14 days end. A test probe moved an injected clock from `1209599999` to `1209600000` and the notice stayed Archived, also after a render.
- **Impact if no action:** A standalone chat that stays open across the removal shows a stale notice until a reload or a remount. The app screen is correct.
- **Root question:** How does every chat show the removal when the 14 days end?
- **Options:**
  - **A.** Run the one-second clock while a standalone archived notice waits for its removal. Add a mounted test that moves an injected clock across the removal. Effort: Small. It renders once each second until the removal.
  - **B.** Give the standalone notice its own removal timer, with the same test. Effort: Small. It keeps two ways to time an archive.
  - **C.** Make one clock-injected hook for the archive deadlines of both the app notice and the standalone notice. It returns the removal state with its timer subscription. Add the standalone test and keep the app's deadline tests. Effort: Medium.
- **Left out:** A refresh on server events only misses the deadline. A reload-only approach leaves the notice stale.
- **Wider fix:** C. One hook owns the time-dependent state and the subscription that updates it, so no caller can read one without the other.
- **Previous examples:** Commit `8eaf4b21e` added `src/app/deadlines.ts` and the mounted Restore deadline test for a control that must change without another event.
- **Recommendation:** C.
- **Action:** fix after merge, apply C, because the app screen is correct and the hook changes the clock of both chat entry points.
