# Changes misses edits through React context

- **Severity:** Medium. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-20, from pull request #607, review finding 201.
- **Location:** None. The wider fix is in the Mokly repository, `mokly-ai/mokly`.
- **Reason:** The fix changes the comparison contract of Mokly, in another repository, and the user decides on that contract.

- **Terms:**
  - **Registered part:** a React part of the mockup catalogue in `docs/mockups/` that an entry module registers with Mokly's `defineComponent`.
  - **React context:** a value that an outer part gives to every part inside it, such as the Mac app state or the touch sizes.
- **Background:** Mokly 0.19.0 compares a registered part inside a screen by its path, its instance name, and a digest of its declared props, not by what it draws. Many registered parts of the catalogue read React context: the touch sizes, the Mac app state, and the workspaces of the chat. `docs/mockups/registered-parts.md` says under "What Changes can miss" that such a change can give no row.
- **Problem:** A visual change that reaches a registered part only through context gives no Changes row at all: none for the part, none for the screen, and no entry under Affected screens. For example, `ShortcutTip` draws its key by the Mac app state, and `ActionButton` takes its touch height from the touch sizes. A reviewer then sees no sign of the change.
- **Impact if no action:** A visual regression in a phone or Mac state can pass review with no Changes row.
- **Root question:** How does the Changes view show a change that reaches a registered part outside its props?
- **Options:**
  - **A.** Keep the gap, and keep the warning in `docs/mockups/registered-parts.md`. Effort: Small, done.
  - **B.** Make the renderer `docs/mockups/src/render.tsx` draw each mobile component page inside `TouchScreen`, so each part shows its touch state on its own page. This covers render edits of the touch sizes only. It can show a touch state that no screen draws. Effort: Medium.
  - **C.** Register the parts that supply a context, `MacScreen` with the Mac app state and `ChatWorkspaces` with the workspaces, with the value as data. A changed value then gives the screen a row. It does not catch a render edit inside a part that reads the value. Milestone 6 of the registered mockup parts plans this. Effort: Medium.
  - **D.** Give each registered part that reads a context a variant in that state, through a prop that only its own pages pass. A render edit in that state then gives the part a row. It does not catch a changed value. Many parts already have four variants, so this needs more than five entries. Effort: Large.
  - **E.** Change Mokly so that a registration declares the context values that it reads, and the wrapper adds them to the props digest. This catches changed values only. Effort: Large.
  - **F.** Change Mokly's comparison rule: when no entry of a component changed, a screen compares the rendered content of each instance, and a difference goes to the screen. This covers changed values and render edits for every input outside the props. It can add rows when React `useId` values shift. Effort: Large.
- **Left out:** Plain uses of the parts that read a context. They undo the attribution that user decision 519 A chose, for about 60 registrations.
- **Wider fix:** F. One rule in Mokly covers every input outside the props, in every catalogue.
- **Previous examples:** None found.
- **Related:** Decision 521 limits the variants that D needs.
- **Recommendation:** F. It closes the gap for every context and every catalogue. C protects this repository soonest, and Milestone 6 already plans it.
- **Action:** ask the user, because F changes Mokly's comparison contract, and no recorded decision covers that.
