# Firefox text direction keys can be recorded

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-17, from `calummoore/delete-outstanding-plans-status-f01f`, an open decision of the deleted keyboard shortcuts plan (decision 201). Its source was the key research of `calummoore/keyboard-shortcuts-settings`.
- **Location:** `src/shared/shortcut-text-keys.ts` (the `mac` and `other` lists) and `docs/protocol/keyboard-shortcuts-fixed-keys.md`, section "Text keys".
- **Reason:** Option A adds a new rejection to the shortcut recorder and the Worker, which needs the user's approval.

- **Terms:**
  - **Text key:** a key that a text field keeps. The recorder refuses it, the Worker rejects it, and in a text field no shortcut runs on it.
- **Background:** Firefox switches the text direction of the focused text field on ⇧⌘X on a Mac, and on Ctrl+Shift+X on Windows and Linux. The source is `key_switchTextDirection` in Firefox's `browser-sets.inc.xhtml`, and a live check on Linux confirmed it. For this reason, the default key of Fix checks is ⌥⌘X, not Conductor's ⇧⌘X. The user's requirement of 2026-11-10 says that the shortcuts never take the keys of a text field.
- **Problem:** The text key lists do not name ⇧⌘X or Ctrl+Shift+X, so a person can record them. A recorded ⇧⌘X then runs its command in a Firefox text field, in place of the direction switch.
- **Impact if no action:** A person who records one of these keys loses Firefox's direction switch in the message field.
- **Root question:** How does a text field keep Firefox's text direction keys, also after a person records them?
- **Options:**
  - **A.** Add ⇧⌘X to the Mac text keys and Ctrl+Shift+X to the Windows and Linux text keys, with the protocol list and tests. This adds a rejection. Effort: Small.
  - **B.** Change nothing. Only the default keys avoid the two keys. Effort: Small.
  - **C.** Count the two keys as text keys only in a Firefox text field, as Ctrl+U counts only in a single-line field on Linux. They stay recordable. Effort: Medium.
- **Left out:** A text key rule for each browser and each key, because no other browser key edits text today.
- **Wider fix:** None. The text key lists are the structural fix in force.
- **Previous examples:** Ctrl+/ of Firefox on Linux and ⌥⇧⌘V of the Mac app joined the text key lists.
- **Recommendation:** A. It applies the text field requirement with the existing lists, which already hold keys of one browser or host.
- **Action:** ask the user, because A adds a new rejection.
