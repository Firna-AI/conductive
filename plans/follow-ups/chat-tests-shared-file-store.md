# Chat tests hand-write a fixed file store

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from branch `calummoore/screenshots-prompts-imnj`, the wider fix of review finding 1.
- **Location:** `src/chat/links/AnswerText.dom.test.tsx:27`, `src/chat/links/MessageFileChips.dom.test.tsx`, `src/chat/components/SentFileChips.dom.test.tsx`, and `src/chat/components/MessageLine.dom.test.tsx`.
- **Reason:** The branch fixed its own picture tests, and this wider fix changes four test files that are already on `main`.

- **Terms:**
  - **WorkspaceFiles:** the production store of the workspace file tree in `src/files/model/files-store.ts`. It reads the tree and follows its changes.
  - **Fixed store:** a test object with a fixed snapshot and a subscription that does nothing, in place of `WorkspaceFiles`.
  - **Tree lookup:** `useEntryLookup` in `src/chat/links/LinkedText.tsx`. It gives the entries of the tree to the file chips, the file links, and the pictures of chat text.
- **Background:** Chat text shows a file chip, a file link, or a picture only for a path that is an entry of the file tree. The protocol says that a chip shows when the tree loads, so a chip can appear after the message. The `testing` skill and the review prompt call a hand-written fake store a weak test. Since 30 October 2026, four chat test files added a fixed store: `MessageLine.dom.test.tsx` and `SentFileChips.dom.test.tsx` on 11 November, and `AnswerText.dom.test.tsx` and `MessageFileChips.dom.test.tsx` on 16 November. The screenshots branch moved its picture tests to the production store, and added one test of a picture whose file reaches the tree late.
- **Problem:** The four tests start with every entry already in a fixed store. No test of answers or sent messages proves that a chip shows when the tree loads after the message. A review check changed the tree lookup to read the tree once, and all 2,094 tests under `src` still passed.
- **Impact if no action:** A change that breaks late chips in answers and sent messages passes the gate. New chat tests keep copying the fixed store.
- **Root question:** How do the chat display tests use the production file store, so that a late tree stays tested?
- **Options:**
  - **A.** Add one late-tree case to `AnswerText.dom.test.tsx` with the production store, and leave the other tests as they are. Effort: Small.
  - **B.** Add one shared test helper that starts `WorkspaceFiles` over `FakeApiServer` with a given list of entries, and that can hold the tree reply. Build it from `filesAfterHistory`, `heldTree`, and `realFiles` in `src/chat/components/chip-field/mention-field-test-kit.tsx`. Use it in the four tests, and keep one late-tree case at the owner, `AnswerText.dom.test.tsx`. Effort: Medium.
- **Left out:** A browser spec, because the `testing` skill keeps browser specs for layout, frames, focus, navigation, and real hosts. A changeable fake store, because it is still a hand-written fake.
- **Wider fix:** B. One shared helper removes the reason to hand-write a store.
- **Previous examples:** `plans/boat-native-remote-workspaces.md` moved five hand-written test stores to the shared `diskFixture`. The picture tests of the screenshots branch had the same fixed store until review finding 1.
- **Recommendation:** B. It fixes the four tests and stops the pattern.
- **Action:** fix after merge, apply B. It changes four test files outside the screenshots change.
