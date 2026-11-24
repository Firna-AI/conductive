# Mockup dialogs leave the page behind them live

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-23, from pull request #671, branch `calummoore/universal-expo-app-milestone-1-mockups-emjd`, the wider fix of review finding 6.
- **Location:** `docs/mockups/src/components/layout/`, the frames that hold a dialog, a sheet, or the palette, and `src/ui/components/common/ConfirmDialog.tsx` as their main user.
- **Reason:** the fix reaches about 100 existing views of the catalogue, outside the phone mockups of the branch that found it.

- **Source:** Review. **Category:** mockup.
- **Terms:**
  - **Modal layer:** a dialog, a phone sheet, a system alert, or the command palette that a view draws over a dimmed page.
  - **`inert`:** an HTML attribute. Content inside an inert element takes no focus and no click, and Mokly makes each link inside it inactive.
- **Background:**
  - The mockups are static HTML, and a view runs no script. In the app, `OverlayHost` in `src/shell/ui/Overlay.tsx` makes the content behind a modal layer inert, with a wrapper that has `display: contents`.
  - The phone system alerts of the mockups wrap the page behind them in one box-less `inert` wrapper, so their background is inactive.
  - The other modal layers of the catalogue do not. 104 of the 134 built desktop views that declare `aria-modal` leave links or buttons reachable behind the layer. Examples are the question of `app/account/deletion/confirm` and the Reset all question of Keyboard shortcuts.
  - React 19 writes `inert=""` into static HTML, as `docs/mockups/src/components/marketing/ScreenFrame.tsx:64` shows.
- **Problem:** A view that draws a modal layer keeps the page behind it live. A keyboard user can leave the layer through a background link without one of its choices.
- **Impact if no action:** the catalogue shows modal layers that do not act as the app does, and new mockups copy the pattern.
- **Root question:** How should a static catalogue view keep the keyboard on a modal layer that it draws, as the app does?
- **Options:**
  - **A.** Give each modal layer its own `inert` wrapper where a screen draws it. Effort: Medium.
  - **B.** Give mockup dialogs one common frame that makes the background inert, and move every modal layer to it: dialogs, phone sheets, and the palette. Effort: Medium.
  - **C.** Put the rule in the mockup frames, as the app does with `OverlayHost`. Each frame that takes a layer gets a slot for a modal layer, and while that slot holds a layer, the frame wraps its content in a box-less `inert` wrapper. Toasts and desktop menus stay outside the slot. Effort: Medium.
- **Left out:** a scripted focus trap, because the built views run no script. Removing `aria-modal`, because the controls stay reachable. A check of the built views alone, because it finds the gap but does not close it.
- **Wider fix:** C, because it matches the structure of the app and covers each layer that a frame holds.
- **Previous examples:** `plans/follow-ups/expanded-preview-native-modal.md` records a similar focus escape in the app.
- **Recommendation:** C. It keeps the rule in one place for each frame, as the app does.
- **Action:** fix after merge, apply C, because it reaches about 100 existing views of the catalogue.
