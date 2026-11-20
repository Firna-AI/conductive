# Expanded preview window leaves the app active

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/expand-modal-preview-3fjj`, the wider fix of its review finding on focus that escapes the window.
- **Location:** `src/shell/workspace/previews/ExpandableFrames.tsx`.
- **Reason:** the change needs a check in Chromium, Electron, Safari, and Firefox that the frame keeps its page, and it changes how toasts sit over the window, which the Expand branch did not need.

- **Source:** Review. **Category:** code structure.
- **Terms:**
  - **Expanded window:** the large window over the whole app that Expand opens from the bar of a Preview tab, or from the header of an HTML file in Preview, on desktop.
  - **Kept frame:** the frame of the page of a tab, which stays loaded and hidden under the chat while another tab shows.
  - **`trapTab`:** the shared key handler in `src/shell/ui/Sheet.tsx` that keeps Tab inside a dialog or a sheet.
- **Background:** The expanded window shows the kept frame of the shown tab in its place in the page. Its container gets a fixed position and the dim layer of a dialog. A frame that moves in the page loads its page again, so the window does not use the app's dialog layer, which renders into a portal and makes the rest of the app inert. The user asked for Expand on 20 November 2026. A design call of the same day keeps the same frame, so the page keeps its address, scroll place, and sign-in. The window uses `trapTab` with a list that adds the frame, and a mark after the frame sends the focus that leaves the page back to the header. It counts as a modal layer for the shortcuts and the palette.
- **Problem:** Nothing makes the app under the window inert. The key handler covers each key that starts inside the window, and the mark covers Tab out of the frame. Focus that reaches the app by another route, such as a script of the app that moves the focus, still lands on controls under the window.
- **Impact if no action:** A keyboard or screen reader user can rarely reach a control under the dim layer while the window shows. No such route is known today.
- **Root question:** How should the expanded window keep the app behind it out of reach while its frame stays in place in the page?
- **Options:**
  - **A.** Listen for `focusin` on the document while the window shows, and move focus that lands outside the window back to its first control. Effort: Small.
  - **B.** Make the container a native `<dialog>` and call `showModal()` at Expand and `close()` at Close. The browser puts it in the top layer without moving it in the page, makes everything else inert, and keeps Tab inside. `::backdrop` draws the dim layer. Remove the local tab list and the mark. Check in each browser that the frame does not load again at each switch. Toasts of the app then sit under the window and are inert while it shows. happy-dom only sets `open` at `showModal()`, so a browser check must prove the trap. Effort: Medium.
- **Left out:** A portal for the window, because the frame then loads its page again.
- **Wider fix:** B, because the browser shuts off the background whatever route the focus takes.
- **Previous examples:** Commit `be73a1188` fixed a focus escape from the container of a sheet in `trapTab`.
- **Recommendation:** B, after a browser check of the frame state.
- **Action:** fix after merge, apply B, because it needs checks in each browser and changes how toasts layer.
