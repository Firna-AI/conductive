# Protocol map omits requirements pages

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from pull request #223, branch `calummoore/conductor-import-option`. The documentation integration with `main` observed it outside the scope, and the root confirmed it the same day.
- **Location:** `docs/architecture/protocol-docs.md:6`, its complete-list claim, and `:87-89`, its Operator actions entry, at `16a4f76c`. `docs/protocol/suspension-workspaces.md` and `docs/protocol/link-previews.md`, the omitted pages. `docs/protocol/operator-actions.md:92-108`, its links to that page.
- **Reason:** The omission comes from `main`, and the import change does not touch the entry of Operator actions.

- **History:**
  - 2026-11-11, root integration record. The Location field now points to `16a4f76c`. The detailed static trace keeps its reviewed source citations. The reviewed Location field was:

> `docs/architecture/protocol-docs.md:5`, the intro, and `:77-79`, the entry of Operator actions, at head `cfbf916c6a4c4da3c953f0df368ea858fa2a8fb2`. On `main` at `89ff2747863f75f259f05716f3f6f2d0306f257c`, the same entry is at `:62-64`. `docs/protocol/suspension-workspaces.md`, the omitted page. `docs/protocol/operator-actions.md:92-108`, its links to that page.
  - 2026-11-11, root outside-scope triage: the same map omission also covers `link-previews.md`. The earlier title was "Protocol map omits the suspension workspaces page". A now adds both entries. No source doc was fixed.


- **Source:** Review. **Category:** Docs or spec.
- **Grade reasons:**
  - Severity is Low. A reader of the map can miss the page, but the parent page links to each of its sections.
  - Confidence is High. A read of the map and of the page shows the omission.
  - Harder later is No. The fix adds two entries.
- **Terms:**
  - **Protocol map:** `docs/architecture/protocol-docs.md`, the page that lists each protocol doc and what it covers.
- **Background:**
  - The protocol docs under `docs/protocol/` hold the requirements of each feature. The intro of the protocol map, at `protocol-docs.md:5`, says that "this page lists each protocol doc and what it covers".
  - The map gives a page that belongs to a parent page as a nested entry below the parent. The map at head `cfbf916c` has 21 nested entries.
  - `docs/protocol/suspension-workspaces.md` has the title "Workspaces during a suspension". It says: "This page belongs to Operator actions." It states the starts, stops, and builds, the sandbox access, the preview viewers, the owners and admins, and what other members keep during a suspension.
  - `docs/protocol/operator-actions.md:92-108` links to each section of that page.
  - `docs/protocol/link-previews.md` states the public sharing-card metadata, the shared image, excluded pages, and service caching. The map also omits this page at captured main `23628f77` and final source `16a4f76c`.


- **Problem:** The map names neither `suspension-workspaces.md` nor `link-previews.md`, although its intro says that it lists each protocol doc.
- **Impact if no action:** A reader who uses the map to find the requirements of a suspension misses the page. The reader can still reach it through the links of Operator actions.
- **Evidence:**
  - The omission holds on `main` at `31d7b3300c505983b7a1d8baad2785c6fe1f3035` and at `89ff2747863f75f259f05716f3f6f2d0306f257c`, on the import head `cfbf916c`, and on the earlier primary head `5795f429`.
  - At the first review, no existing follow-up item named `suspension-workspaces.md` or the protocol map.
  - No check, probe, or reproduction ran. This is a read of the two docs.
- **Root question:** How should the protocol map lead a reader to each protocol doc?
- **Options:**
  - **A.** Add the suspension page below Operator actions. Add a top-level entry for Public link previews. Keep every other entry. Effort: Small.
    - Proposed entry, as Markdown for `docs/architecture/protocol-docs.md`: `[Workspaces during a suspension](../protocol/suspension-workspaces.md): the starts, stops, and builds, the sandbox access, the preview viewers, the owners and admins, and what other members keep during a suspension.`
  - **B.** Change the intro so that it no longer claims every doc. Effort: Small. Cost: the map stops being a complete index, which is its purpose.
  - **C.** Change nothing. Effort: Small.
- **Left out:**
  - A check that each file under `docs/protocol/` has a map entry. It is a new gate, which the user decides. The documentation skill already covers the process.
  - A top-level entry for the suspension page. It says that it belongs to Operator actions, so a nested entry matches the map's own layout.
- **Wider fix:** None. The documentation skill already asks that a doc stays consistent with itself and with the pages that it claims to list.
- **Previous examples:** None found.
- **Related:** None.
- **Recommendation:** A. Two entries restore the complete index that the intro promises, with no requirement change.
- **Action:** fix after merge, apply A, because the omission comes from `main`, and it is outside the import change. No user decision is needed.
- **Validation of the fix:**
  - Check the relative link of the new entry by hand, because no command checks the links in Markdown.
  - Keep every other entry of the map.
