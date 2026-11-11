# Ages of two weeks differ between mockups and app

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from branch `calummoore/routines-feature-brainstorm`, item 3 of the Milestone 7 report of `plans/routines.md`.
- **Location:** `src/app/time.ts:9` (`formatAgo`), and the routine mockups under `docs/mockups/src/fixtures/routineRows.ts`, `routineRuns.ts`, and `runLists.ts`.
- **Reason:** The mockups and the app disagree, and only the user decides which side is right.

- **Terms:**
  - **Short age:** the time since an event, written as one number and one letter, such as "5m" or "3d", in a list row.
  - **`formatAgo`:** the one function of the web app that writes each short age, for workspace rows, the chat, the files panel, and routines.
- **Background:**
  - `formatAgo` writes minutes, then hours, then days. A run from two weeks ago shows "14d".
  - The routine mockups draw "2w" and "3w" for such ages, but one Runs list mockup draws "17d".
  - The Routines page of the app shows "14d" where the mockup draws "2w".
- **Problem:** The mockups do not settle one format, and the app follows neither in full.
- **Impact if no action:** The routines pages differ from their mockups in each age of two weeks or more.
- **Root question:** How does the app write an age of two weeks or more in a list?
- **Options:**
  - **A.** Keep days everywhere, and change the routine mockups to days. Effort: Small.
  - **B.** Show weeks from 14 days in the routine lists only. The app then has two formats. Effort: Small.
  - **C.** Show weeks from 14 days in every short age of the app, and change the mockup's "17d" to "2w". It also changes the workspace rows and the chat. Effort: Small.
- **Left out:** A calendar date, such as "27 Oct". The column needs a short age.
- **Wider fix:** C. One format for every list.
- **Previous examples:** None found.
- **Recommendation:** C. The app keeps one format, and it matches the newest mockups.
- **Action:** ask the user, because the options decide which side of a mismatch between the mockups and the app is right.
