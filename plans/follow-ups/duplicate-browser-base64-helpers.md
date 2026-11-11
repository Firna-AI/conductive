# Three browser copies of one base64 helper

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from branch `calummoore/composer-file-drag-and-drop`, item 2 of the report of its image file tab work.
- **Location:** `src/files/page/file-view.ts:25`, `src/app/screenshots/strip-metadata.ts:29`, and `src/files/dev/dev-fixtures.ts:49`.
- **Reason:** The three copies are correct today, and one shared helper edits the screenshot code and the development fixtures, two feature areas outside the change that added pictures to the file tab.

- **Terms:**
  - **File tab:** the page of one file of a workspace, `FilePage` in `src/files/page/`. It shows a PNG, JPEG, GIF, or WebP file as a picture from a `data:` address of its bytes.
  - **Development fixtures:** `src/files/dev/dev-fixtures.ts`, the sample files that the fake API serves to the development page of the Files screens.
- **Background:**
  - Three browser modules turn bytes into base64 with `btoa`.
  - `toBase64` in `src/app/screenshots/strip-metadata.ts` builds the binary string in steps of 32,768 bytes, `0x8000`, so that each `String.fromCharCode` call stays short.
  - `src/app/screenshots/screenshot-intake.ts` imports `toBase64` for each screenshot of the Feedback dialog, after it strips the metadata of the screenshot.
  - `base64Of` in `src/files/page/file-view.ts` is the same function. The file tab uses it when a read gives UTF-8 text under a picture name, such as text bytes under a `.gif` name. The `data:` address then holds the bytes of the read.
  - `base64Of` in `src/files/dev/dev-fixtures.ts` is a simpler copy that adds one character at a time. It gives the base64 content of each sample file that is not UTF-8 text.
  - `src/shared/utf8.ts` already holds one small byte helper, `decodeUtf8`, that the browser and the Worker both import.
- **Problem:** Three modules hold one function. A fix in one copy does not reach the others.
- **Impact if no action:** Little. The copies are short and correct.
- **Root question:** Where does the app keep the base64 form of bytes?
- **Options:**
  - **A.** Keep three copies. Effort: Small.
  - **B.** Move `toBase64` to one shared browser module, and import it in the three places. This edits `src/app/screenshots/` and `src/files/dev/`. Effort: Small.
  - **C.** Import `toBase64` from the screenshot module in the file page. The Files code then depends on the screenshot feature. Effort: Small.
- **Left out:** `Uint8Array.prototype.toBase64`: the app type library is ES2023, so it is not available. `tsconfig.base.json` and `tsconfig.app.json` set `lib` to ES2023, and the app adds only the DOM libraries.
- **Wider fix:** B. One module owns the function.
- **Previous examples:** `toBase64` in `src/app/screenshots/strip-metadata.ts` and `base64Of` in `src/files/dev/dev-fixtures.ts`. Two more copies of the class live outside the browser screens. `imageBase64` in `worker/mail-sender.ts:77` gives the base64 of each screenshot that an email attaches, in steps of 8,192 bytes. `fakeRequestKey` in `src/test-support/fixtures/devices.ts:75` makes an unpadded base64url key in one step.
- **Recommendation:** B. It removes the copies without a new dependency between features.
- **Action:** fix after merge, apply B, because it changes modules outside the change that added pictures to the file tab, and the copies are correct today.
