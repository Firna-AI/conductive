# A box can clip a desktop menu

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Large. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from branch `calummoore/command-palette-mockups`, review round 1, the wider fix of finding 1.
- **Location:** `src/shell/ui/Menu.tsx` (the desktop menu of `MenuButton`), `src/members/ui/PopoverSurface.tsx:52`, `src/chat/ui/Menu.tsx`, and `src/chat/device/CommandChoices.tsx:58`.
- **Reason:** the shared surface reaches the menus of the members UI and of the chat, outside the diff of the command palette, and other open branches add menus too.

- **Terms:**
  - **Top layer:** the browser layer above every box of the page, which the Popover API and `showModal()` use. A box with `overflow: hidden` can not clip an element there.
  - **Desktop menu:** a list of choices that opens beside its button, such as the repository filter of the command palette.
- **Background:** The app has three UI kits, each with its own menus:
  - The shell: `MenuButton` in `src/shell/ui/Menu.tsx`.
  - The members UI: `ChoiceMenu`, drawn on `PopoverSurface` in `src/members/ui/PopoverSurface.tsx`.
  - The chat: `src/chat/ui/Menu.tsx`, and the Allow menu in `src/chat/device/CommandChoices.tsx`.
  - The members surface and the Allow menu open in the top layer. Where the browser has no Popover API, such as happy-dom in tests, they open in place. The shell menus and the other chat menus always open in place, with absolute positions inside their parent box.
- **Problem:** A box with `overflow: hidden` or its own scroll clips each menu that opens in place inside it. The command palette met this case. Its card clipped the repository filter menu when the results were short. Chrome measured the card bottom at 290 px, and the `acme/marketing-site` choice at 318 px. The palette branch removed the clip from its card as a direct fix. Every other in-place menu keeps the problem.
- **Impact if no action:** Each new box with a clip or a scroll can hide part of a menu. The person then can not choose the hidden items.
- **Root question:** How does every desktop menu of the app show all its choices, whatever box holds its button?
- **Options:**
  - **A.** Move `PopoverSurface` into shared UI, and draw the shell and member menus on it. Keep the in-place fallback of `CommandChoices.tsx:58` for a browser without the Popover API. Check each shell menu in a real browser, because each one then flips or gets shorter to fit the window. Effort: Medium.
  - **B.** A, plus the chat menus of `src/chat/ui/Menu.tsx` and the Allow menu of `src/chat/device/CommandChoices.tsx` on the same surface. So every desktop menu of the app uses one surface. Each chat menu needs a check in a real browser. Effort: Large.
  - **C.** Remove the clip from each box that holds a menu, as the palette did. Effort: Small for each box, and the work repeats for each new box.
- **Left out:** A portal of our own with fixed placement, because A is better on every point. A portal moves the menu out of the DOM of its layer, so the press-outside checks, the dismiss checks, and the focus trap each need a new rule. The `DropdownMenu` of `@firna/ui`, because it breaks the user's choice of 8 November 2026 to keep the local menu copies until the library can draw the mockups. `plans/follow-ups/firna-ui-missing-parts.md` records that choice.
- **Wider fix:** B. It removes the class for every menu of the app.
- **Previous examples:** Commit `5171e3b` moved the member menus to `PopoverSurface`. Commit `714ecb9` bounded the chat request region and moved the Allow menu to the top layer. The command palette branch removed the clip of its card.
- **Recommendation:** B. One surface for every desktop menu removes the class.
- **Action:** fix after merge, apply B, because it reaches the members and chat menus outside the diff of the command palette.
