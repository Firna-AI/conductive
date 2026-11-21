# Keyboard cannot reach scrolling dialog text

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-21, from `calummoore/follow-up-dialog-content-can-leave-the-kc37`, implementation finding 1 and its second-pass check.
- **Location:** `docs/mockups/src/components/common/ModalCard.module.css:31`, the `overflow-y: auto` of `.body`. `src/shell/ui/Dialog.tsx:103-105` and `src/chat/ui/overlays.tsx:71-75`, the title, the body, and the actions of each desktop card. `src/shell/ui/Sheet.tsx:16-20`, `controlsOf`, and `src/shell/ui/Sheet.tsx:31-52`, `trapTab`. `src/chat/ui/dismiss.ts:74-81`, `FOCUSABLE`, and `src/chat/ui/dismiss.ts:87-115`, `useFocusTrap`. `src/shell/ui/Overlay.tsx:205-209`, the first focus of a shell question. `src/chat/ui/overlays.tsx:11`, `firstButton`. `src/members/ui/ConfirmDialog.tsx:79-97`, the native dialog of the members UI.
- **Reason:** The bug is Rare and not High, and its fix changes no stored data or wire format, so the fix rule puts it after the merge.

- **Source:** Implementation. **Category:** product bug.
- **Terms:**
  - **Modal card:** the card of a desktop dialog over the dimmed app. `docs/mockups/src/components/common/ModalCard.module.css` gives its parts: `.card`, `.head`, `.body`, `.foot`, and `.topLayer`.
  - **Text-only body:** a `.body` that holds no control that can take the focus, only text and lists.
  - **Focus trap:** the key handler that keeps Tab inside a dialog. The shell uses `trapTab` in `src/shell/ui/Sheet.tsx`. The chat uses `useFocusTrap` in `src/chat/ui/dismiss.ts`.
  - **Change repository question:** the question "Change repository?" of `src/shell/workspace/repository/RepositoryQuestion.tsx`. It asks before a workspace moves to another repository, and it lists the local work with `LocalWorkList`.
- **Background:**
  - The requirement comes from the follow-up item "Tall dialog content leaves the window", added on 2026-11-09. It asked how a desktop dialog keeps all its content and controls reachable when the content is taller than the frame. The branch above applied its option B, as its task asked, and deleted that item.
  - Option B adds shared bounded modal card parts and uses them for New workspace and the existing confirmation cards. It keeps menus outside the scrolling body and adds a browser regression. The task also asked that the cards stay reachable in a short window.
  - Each modal card now stays inside its layer. Its `.head` and its `.foot` keep their size, and only its `.body` scrolls when the content is taller. The shell `Dialog` in `src/shell/ui/Dialog.tsx` and the chat `ConfirmDialog` in `src/chat/ui/overlays.tsx` put their content in `.body`. They put their actions in `.foot`, a separate box after the body.
  - Both focus traps list only controls: links, buttons, fields, and elements with a `tabindex` that is not `-1`. The shell list is `focusableSelector` of `src/shell/ui/Overlay.tsx`, through `controlsOf`. The chat list is `FOCUSABLE`. A body has no `tabindex`, so neither list holds it.
  - Both traps act only at the first control, at the last control, and from outside the list. They leave the other Tab presses to the browser. The body comes before `.foot`. So a Shift+Tab from the first action does not reach the body, because the trap sends it to the last action.
  - A question takes its first focus on its first control, Cancel, in `.foot`. The shell does this at `src/shell/ui/Overlay.tsx:205-209`, and the chat does it with `firstButton`. Down and Page Down from a button of `.foot` do not scroll the body, because the body is a sibling of `.foot`, not a box around it.
  - The members question in `src/members/ui/ConfirmDialog.tsx` is a native `dialog` element that `showModal()` opens. It has no trap of its own: the browser keeps the focus inside. Chromium makes an overflowing scroll area without controls a Tab stop. So Tab reaches its body in Chromium and in the Mac app, which runs Electron 44.10.2. Nobody checked a scroll from the focused body there. Safari makes no scroll area a Tab stop by itself.
  - The phone sheets do not have this gap. Each confirm sheet puts its actions inside its scrolling content, so the arrow and page keys from a focused action scroll it. The sheets are these:
    - `src/shell/ui/Dialog.tsx:55-62`, in the body of `src/shell/ui/Sheet.tsx:90`.
    - `src/chat/ui/overlays.tsx:107-113`, in the body of `src/chat/ui/overlays.tsx:44`.
    - The sheet of `src/members/ui/ConfirmDialog.tsx`.
  - Before the branch above, a card had no height limit. Its layer centred it inside 24 px of padding. The app frame clips only at the window edge: `.frame` in `docs/mockups/src/components/layout/AppFrame.module.css` has `overflow: hidden` and the height `100dvh`. So a card up to the window height showed in full. The new card stops 24 px from each edge, and the spacing of each card did not change.
  - So the branch above causes the gap for a card that fitted the window. Such a card has a natural height above the window height minus 48 px, and at most the window height. A taller card lost its title and its actions for every user before that branch. Now they stay, but a keyboard-only user cannot scroll to the rest of a text-only body.
  - The questions of Continue, in `src/shell/workspace/ContinueDialog.tsx`, and of Change repository list each changed file with `LocalWorkList`, with no cap. `worker/lifecycle/local-work.ts:19-27` gives one entry for each changed file. So a long list overflows also at ordinary window heights.
  - No protocol doc and no product rule states the keyboard reach of app dialog content. `docs/protocol/website-docs.md:137-139` covers only the public guides. The comment at `src/chat/ui/overlays.tsx:84-85` says that the focus starts on the first action, the safe one, and that Tab stays inside.
- **Problem:** In the shell `Dialog` and the chat `ConfirmDialog`, a keyboard-only user cannot scroll a text-only body that overflows. Tab moves only between the actions, and the scroll keys from an action do not reach the body. In Safari, the members question has the same gap.
  - The browser checks of the branch above measured a real case at 1280 × 480 px, and its second-pass check confirmed it. 480 px is the minimum window height of the Mac app, in `desktop/src/window.ts:56`.
  - The Change repository question is 479 px high by nature, so it fitted the 480 px window before the branch above. Now its card is 432 px high, and its body shows 342 px of its 389 px.
  - The hidden part holds the last row, `src/invoices/refunds.ts — not committed`. It is the file that moves to the new branch. The body holds only paragraphs and `LocalWorkList` rows, with no control. Tab moves only between Cancel and Change repository.
- **Impact if no action:** A keyboard-only user cannot read all of the work list of an action that they cannot simply undo. An example is a file that moves to a new branch. A pointer user can still scroll the body.
- **Root question:** How should keyboard users reach scrolling dialog text?
- **Options:**
  - **A.** Keep the current behaviour. A keyboard-only user still cannot read the hidden part of a text-only body. Effort: Small.
  - **B.** Let the shared focus traps include a text-only body while it overflows, in every browser. Keep the first focus on the safe action, and keep the Tab order of a card that does not overflow. Safari makes no scroll area focusable. So the body needs focus from the code, such as `tabIndex={-1}`, and the trap must then move the focus on each Tab itself. The fix chooses these mechanics. B does not reach a body whose only control is a text field that uses the scroll keys, such as the message field of New workspace. Effort: Medium.
  - **C.** Make the body focusable only while it overflows, with a size observer that sets its `tabIndex`. The first focus must not move to the body. Effort: Medium.
  - **D.** Move the shell and chat cards to native modal `dialog` elements, as the members question uses. Chromium then gives an overflowing body a Tab stop. It reaches the layering work of the frame layer and the top layer of the browser, and Safari still needs the work of B. Effort: Medium.
  - **E.** Send the arrow, Page Up, Page Down, Home, and End keys from the title or an action to the body, in the key handler of the card. It adds no Tab stop and keeps the first focus. It must leave these keys to text fields and to menus, and no focus ring shows what scrolls. Effort: Medium.
  - **F.** Make each body a focusable region at all times, with `tabIndex={0}` and the title as its label. It needs no trap change and no size check. It adds a Tab stop and a focus ring at every size, also when nothing scrolls. The shell first focus then moves from Cancel to the body, through `src/shell/ui/Overlay.tsx:208`, so Cancel needs a `data-autofocus` marker. No mockup draws the ring. Effort: Small.
- **Left out:**
  - A scroll of the whole card. Option B of the requirement above keeps the title and the actions in view.
  - A smaller margin than 24 px at short heights. It only narrows the band of heights where the gap shows, and a body that overflows stays out of keyboard reach.
  - A test for the class, or a new lint or gate over every dialog. Each needs the approval of the user, and nobody approved one. The regression test for this defect is enough.
- **Wider fix:** B. It changes the two shared traps once, so every card on them gets the fix, and it keeps the normal focus.
- **Previous examples:** The public guides make each code block and each table a focusable region with a name, in `src/marketing/scroll-regions.ts`, for the rule in `docs/protocol/website-docs.md:137-139`. Those pages run no script, so every block takes the focus, as in F. The phone sheets avoid the gap, because their actions sit inside the scrolling content.
- **Related:**
  - `plans/follow-ups/shell-dialog-cancel-focus.md`: the same code. It asks how the focus stays in a shell question while its write runs. Its code includes the first focus at `src/shell/ui/Overlay.tsx:205-209` and the Cancel of `src/shell/ui/Dialog.tsx`. B keeps the first focus on Cancel, so each fix must keep the other working.
  - `plans/follow-ups/expanded-preview-native-modal.md`: the same code. The expanded preview window gives `trapTab` its own list of elements. B must keep that list working.
  - `plans/follow-ups/dialog-under-busy-menu.md`: options that conflict. That item waits for the user on how a dialog and a busy menu share the page. D moves the shell and chat cards into the top layer of the browser, which changes that question. B does not depend on its answer.
- **Recommendation:** B. It changes the two shared traps once, keeps the first focus on the safe action, and adds a Tab stop only while a body overflows. C protects the codebase as well, but it needs a size observer and care for the first focus.
- **Action:** fix after merge, apply B, because the bug is Rare and not High, and its fix changes no stored data or wire format.

## Reproduction

1. From the repository root, run `npx vite --config src/shell/workspace/dev/vite.config.js --port 5182`. This is the development page of the workspace screen, over the fake API.
2. Open `http://localhost:5182/src/shell/workspace/dev/?repository=question` in Chrome. Set the page to 1280 × 480 px, for example with the device toolbar of the developer tools.
3. Press the repository in the workspace header, and pick `acme/billing-service` in its menu. The question "Change repository?" opens, with the work of the mockups from `docs/mockups/src/fixtures/repositoryMove.ts`.
4. The focus is on Cancel. Press Tab and Shift+Tab: the focus moves only between Cancel and Change repository. Press Down and Page Down: the body does not scroll. The last row, `src/invoices/refunds.ts — not committed`, stays hidden.
5. Move the mouse wheel over the body: the row shows.

Do not use a Leave org question at 1100 × 190 px as the case. Its body overflows by 12 px, but these 12 px are the bottom padding of the body, not text.

## Acceptance criteria

- In the reproduction above, a keyboard-only user can bring the row `src/invoices/refunds.ts — not committed` into view, in Chromium and in Safari.
- The same holds for each text-only body that overflows in the shell `Dialog`, the chat `ConfirmDialog`, and the members `ConfirmDialog`.
- Keep each dialog's current initial focus target, including Cancel in a text-only question and the chosen field in a form.
- In a card that does not overflow, Tab moves between the same controls in the same order as before.
- Tab and Shift+Tab stay inside the question, and Escape still cancels it. The phone sheets keep their current behaviour.
- A browser regression in `desktop/tests/` checks the reproduction in Electron. The suite runs only Electron, so a person checks Safari by hand. The fix adds no gate, no lint, and no test for the class.
