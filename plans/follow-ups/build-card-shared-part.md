# The app and mockup build cards drift apart

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-26, wider fix of finding 12 of review round 1, branch `calummoore/computer-build-not-working-i7cz`, plan `plans/build-after-refresh.md`.
- **Location:** `src/shell/settings/BuildCard.tsx`, `docs/mockups/src/components/settings/BuildSection.tsx`, `docs/mockups/src/components/settings/BuildHeadAction.tsx`.
- **Reason:** one shared part forces one History rule, so it waits for the answer to `plans/follow-ups/build-history-running-build.md`.

- **Source:** Review. **Category:** Mockup.
- **Terms:**
  - **Build card:** the card at the top of the Cloud computer tab of the org settings. It shows the newest build, Build computer or Try again, the log, and a History list.
  - **Mockup catalogue:** the Mokly pages under `docs/mockups/`. They draw each state of a screen or a part as the visual spec.
- **Background:**
  - The app draws the build card in `src/shell/settings/BuildCard.tsx`. The mockups draw it again in `docs/mockups/src/components/settings/BuildSection.tsx`.
  - `src/ui/README.md` says that a part that the app and the mockups both use lives in `src/ui/`, and that the mockups import it from there.
  - On 26 November 2026, the app showed the line "A build starts when this refresh ends." under a failed build, and the mockup did not. The review found the gap, and the branch fixed the mockup by hand.
- **Problem:** Each change of the build card must be made twice. A change that reaches only one side makes the visual spec wrong.
- **Impact if no action:** The mockups and the product keep drifting, as they did for the History list and for the request line.
- **Root question:** How do the app and the mockups show the same build card?
- **Options:**
  - **A.** Keep two cards, and check both in each review. Effort: Small.
  - **B.** Move the card into one part under `src/ui/components/settings/`. The part takes its state as props. The app passes its data, and the mockup passes its fixtures. Effort: Medium.
- **Left out:** A test that compares the two cards, because B removes the second card.
- **Wider fix:** B. One part cannot drift from itself.
- **Previous examples:** `plans/follow-ups/build-history-running-build.md`: the app and the mockups list different builds on the same card.
- **Related:** `plans/follow-ups/build-history-running-build.md`: B needs its answer first, because one part has one History rule.
- **Recommendation:** B. It ends the class of drift on this card.
- **Action:** fix after merge, apply B, because it moves code outside the change and waits for the answer to the History item.
