# Codex gets unsupported image types as image input

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-14, from the review of the branch `calummoore/lisbon-ogce`, the check of review finding 201.
- **Location:** `runner/src/providers/codex.ts:30`, `worker/chat/attachment-multipart-routes.ts:82`, `docs/protocol/attachment-transfers.md:154`.
- **Reason:** `main` already sent every image file as image input before that branch, and the branch only added a size limit.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Image input:** an image that the runner puts in the model message as a `localImage` entry, so that Codex sees it without opening its file.
  - **Kind:** the `kind` of an attached file. The Worker gives the kind `image` to every file whose media type starts with `image/`.
- **Background:**
  - The runner gives Codex each attached image of at most 25,000,000 bytes as image input, right after its file line. The protocol says so in `docs/protocol/attachment-transfers.md:154`.
  - The kind comes only from the media type (`worker/chat/attachment-multipart-routes.ts:82`), so an SVG, a TIFF, or an HEIC file is an image too.
  - The bundled Codex 0.167.0 holds the text "Codex cannot attach image at `<path>`: unsupported image `<type>`". This was found in the strings of its binary, not in a run of Codex.
- **Problem:** The runner can send Codex an image type that Codex cannot attach. The read line then says that the image is in the message, though Codex replaces it with a text.
- **Impact if no action:** Codex can skip reading such a file, because the read line says that it already has it. The answer can then miss what the image shows.
- **Root question:** Which attached images does Codex get as image input?
- **Options:**
  - **A.** Give image input only for the image types that Codex supports, such as PNG, JPEG, GIF, and WebP, in the shared helper `runner/src/providers/attachment-description.ts`. Other images get only their file line. Update the protocol line. Effort: Small.
  - **B.** Change nothing, and rely on the fixed read line, which says that only an image right after its file line is in the message. Effort: Small.
- **Left out:** Convert each unsupported image to PNG in the runner: it adds a converter and a file write for a rare case.
- **Wider fix:** A. One list of supported types in the shared helper decides each image input.
- **Previous examples:** None found.
- **Recommendation:** A. It sends Codex only what it can read, with one list.
- **Action:** fix after merge, apply A, because the behaviour is older than the branch that found it.
