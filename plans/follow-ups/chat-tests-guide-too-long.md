# The chat test guide is too long

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-26, from branch `calummoore/needs-input-at-the-composer-milestones-3-j8a8`, the guide part of review finding 92 of round 2. That branch applied the protocol part of the finding: it moved two sections of `docs/protocol/secret-requests.md` to a linked page.
- **Location:** `src/chat/tests.md` (593 lines), and `src/chat/key-code.md`, the key-code guide of the chat, which is at the 300-line limit. The same change could not list its new file `src/chat/components/composer-place.tsx` there, so only `src/chat/README.md` names it. Split both guides into linked pages by area.
- **Reason:** A restructure of the whole guide is Medium work and outside the purpose of the change that found it, which only added three entries.

- **Source:** Review.
- **Category:** Repository rule.
- **Terms:**
  - **Chat test guide:** `src/chat/tests.md`, the page that says what each test file of the chat checks. It belongs to `src/chat/README.md`, whose line `[Chat tests](tests.md) says what each test file checks.` is the only link to it.
- **Background:**
  - The always-on rules say: keep files short, target about 200 lines, and split a file that passes 300. The lint checks only JavaScript, TypeScript, and Astro files, so it does not report a Markdown guide.
  - The guide had 571 lines at `main` commit `0b04e4d54` on 26 November 2026, and 573 at `0d2dc3db3` later that day. The needs-input change added three entries, so its branch has 589 lines.
  - The guide has no heading below its title. After a short intro, it has ten paragraphs, and one of them runs for 449 lines. The paragraphs name the test files and say what each file checks.
  - It names 95 test files: 54 under `components/`, 23 under `state/`, 8 under `links/`, 6 under `markdown/`, 2 under `mentions/`, and 2 under `dev/`.
  - No file links to an anchor of the guide.
- **Problem:** The guide is about twice the limit of 300 lines, and a reader must scan one long list to find one test.
- **Impact if no action:** Readers scan the long page for one test, and each later change adds its entries to the same list.
- **Root question:** How can a reader find what each chat test checks in short pages, while the link to the guide keeps working?
- **Options:**
  - **A.** Make `src/chat/tests.md` a short index of linked guides, grouped by area: the chat controller and its state, the tab row and the requests, and the composer and the transcript. Move each entry to the guide of its group, with no fact dropped. Effort: Medium.
  - **B.** Move each entry into the README or the test guide of its folder, such as `src/chat/state/` or `src/chat/components/`. More guides then hold test entries, and each area guide must stay short. Effort: Medium.
- **Left out:** Tighter line wrapping, because it only lowers the count, and the always-on rules forbid compacting text to meet a limit. A lint for Markdown length, because it is a new gate that needs the user, and it does not split the page. These two options are the only moves that keep each entry and give it a shorter home.
- **Wider fix:** None. The always-on rules and the `documentation` skill already require short, linked pages.
- **Previous examples:** Commit `713099cf1` split the mockup guide into linked pages. `plans/follow-ups/shorten-existing-guides.md` records other guides that pass the target.
- **Recommendation:** A. Each area gets one short guide, and the one inbound link still reaches the index.
- **Action:** fix after merge, apply A, because the restructure of the whole guide is Medium work and outside the purpose of the change that found it.
