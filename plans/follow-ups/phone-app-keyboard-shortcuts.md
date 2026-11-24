# Phone apps and keyboard shortcuts are undecided

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Needs decision.
- **Added:** 2026-11-24, from pull request #671, branch `calummoore/universal-expo-app-milestone-1-mockups-emjd`, review item 16.
- **Location:** `docs/protocol/keyboard-shortcuts-tab.md`, `docs/mockups/src/components/settings/AccountTabs.tsx`, and `docs/mockups/src/fixtures/shortcutHosts.ts`.
- **Reason:** the recommended option narrows a rule of `docs/protocol/keyboard-shortcuts-tab.md`, and the user decides each change of a requirement.

- **Source:** Review. **Category:** docs or spec.
- **Terms:**
  - **Shortcut host:** the browser tab, the installed app, or the Mac app that sets which keys the Keyboard shortcuts tab of the Account page shows. `src/app/shortcuts/host.ts` knows these three.
  - **Phone apps:** the iOS app and the Android app that the universal Expo app plan builds. A tablet shows them in the phone layout or in the desktop layout, by its width.
- **Background:**
  - `docs/protocol/keyboard-shortcuts-tab.md` says that the Keyboard shortcuts tab shows in every host and in every layout, because the phone layout also serves a narrow desktop window.
  - The phone apps never run in a desktop window. A phone keyboard has no ⌘, ⌥, or ⌃ key, and no milestone of the plan builds key handling for the phone apps. A tablet can have a hardware keyboard.
  - The phone mockups of 23 and 24 November 2026 show the Keyboard shortcuts tab on the phone Account pages without a link, because no phone page exists. Their tablet views show the key hints of the web app, such as Search ⌘K and Create PR ⇧⌘P, because the shortcut host knows only the Mac app as a client of its own.
- **Problem:** No requirement says whether the phone apps have a Keyboard shortcuts tab, or which keys and key hints they show.
- **Impact if no action:** the milestones that port the Account page and build the phone apps port a tab and key hints whose content in the phone apps no doc gives.
- **Root question:** Do the phone apps take keyboard shortcuts, and what does their Account page show about them?
- **Options:**
  - **A.** Leave the Keyboard shortcuts tab and the key hints out of the phone apps. A person changes the keys in a browser or in the Mac app, because the changes follow the account. Effort: Small.
  - **B.** Keep the tab in the phone apps without a page, until a later change adds keyboard support. Effort: Small.
  - **C.** Support hardware keyboards on tablets: a phone host with its own keys, its own tab, and its own key hints. Effort: Large.
- **Left out:** the keys of a browser or of the Mac app in the phone apps, because they name keys that the phone apps do not handle.
- **Wider fix:** None, because this is one requirement.
- **Previous examples:** None found.
- **Recommendation:** A. No milestone builds key handling for the phone apps, and a hint of a key that does nothing misleads the person.
- **Action:** ask the user, because A narrows the rule of `docs/protocol/keyboard-shortcuts-tab.md` that the tab shows in every host.
