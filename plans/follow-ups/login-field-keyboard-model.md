# The login field's suggestions need a keyboard model

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from branch `calummoore/routines-feature-brainstorm`, finding 105 of its review.
- **Location:** `src/shell/routines/LoginField.tsx:106`, `:141`, and `:163`, `src/shell/routines/LoginSuggestions.tsx:68`, and `src/shell/routines/refused-login.test.tsx:112`.
- **Reason:** The best option sets a keyboard model for the field that no requirement covers.

- **Terms:**
  - **Author filter:** the two lists of GitHub accounts of a pull request trigger of a routine, "Author is" and "Author is not". The owner adds accounts by login.
  - **Login field:** the text box of the author filter. As the owner types, it shows suggestions: org members with their avatars, a divider, and the entry "Members of <org>".
  - **Combobox model:** the focus stays in the text box. Up and Down move a highlight over the suggestions, and Enter adds the highlighted row. The command palette works this way, as `docs/protocol/command-palette.md` ("Keys inside the palette") says.
  - **Menu model:** Down moves the focus from the text box into the suggestion buttons, and Escape closes them.
- **Background:**
  - `LoginField` draws the text box. A separate component, `SuggestionMenu`, draws the suggestions as a `menu` of buttons.
  - `LoginField` finds the buttons of `SuggestionMenu` with `querySelectorAll('button')` and reads `document.activeElement` to move the focus.
  - The `@firna/ui` text input calls `stopPropagation` on each keydown (`node_modules/@firna/ui/dist/node/primitives/dom/TextInput.js:99`). A probe showed that ArrowDown and Escape typed in the text box reach `onKeyPress` and `onKeyDownCapture` of the wrapper, but never its `onKeyDown`.
  - No protocol doc, plan, or mockup sets the keys of this field. The mockup sets only the look of the rows.
- **Problem:** One component depends on the markup of another for its keys. Also, ArrowDown and Escape in the text box never reach the handler at `LoginField.tsx:141`, so keyboard users cannot reach the suggestions or the members entry. The text box also has no `aria-expanded` or `aria-controls` (`LoginField.tsx:163`), so a screen reader does not say that suggestions opened.
- **Impact if no action:** Keyboard users must use the pointer to pick a suggestion, and a change to the markup of the suggestions can change the keys.
- **Root question:** How can the keys move between the login text box and its suggestions, without one component depending on another's markup or events?
- **Options:**
  - **A.** Keep the menu model. `SuggestionMenu` exposes focus actions through its ref and keeps its button refs. Take the keys from the `onKeyPress` of `InputFrame`, as `src/shell/list/SectionHeader.tsx:49` does. Effort: Small.
  - **D.** Use the combobox model of the palette. `LoginField` keeps the highlighted suggestion in state and takes ArrowDown, ArrowUp, and Escape from the `onKeyPress` of `InputFrame`. Enter adds the highlighted suggestion, or the typed login when nothing is highlighted. The text box gets `role="combobox"`, `aria-expanded`, `aria-controls`, and `aria-activedescendant`, as `SearchField` in `src/shell/palette/PaletteControls.tsx:40` does. The suggestions become a `listbox` of `option` rows with the highlighted style of the mockup menu. Delete `items`, the `list` ref, and the `document.activeElement` checks. Change the `[role="menu"]` count of `refused-login.test.tsx:112` to count the listbox, and add a test that ArrowDown and Enter add the first suggestion. Effort: Medium.
  - **E.** Keep the menu model with explicit interfaces. `LoginField` takes the keys from the `onKeyPress` of `InputFrame`. `SuggestionMenu` hands its rows to `LoginField` through a callback ref and reports the focused row through a callback. Add `aria-expanded` and `aria-controls`. Add a test that ArrowDown focuses the first suggestion and that Escape closes the list. Effort: Small.
- **Left out:** New selectors or class names, because they keep the same dependency. `ComboboxMultiSelect` of `@firna/ui/dropdown`, because it adds only listed options, so it cannot add a bot login, mark a refused login, or hold the members entry. `useComboboxNavigation` with `DropdownList`, because it makes the first row active, so Enter picks a member when the user wants the typed login. The shared `MenuList` of `src/shell/ui/Menu.tsx`, because it takes the focus when it opens and closes after each press. A native `datalist`, because it cannot show the avatars, the divider, or the members entry.
- **Wider fix:** Already in force: the `typescript` skill says that product code does not find another component's elements through selectors, class names, or globals.
- **Previous examples:** None found.
- **Recommendation:** D. It removes each focus call across the component boundary, makes the keys work, and follows the palette and `@firna/ui`. If the user keeps the menu model, E.
- **Action:** ask the user, because D sets a keyboard model for the field that no requirement covers.
