# Long-limit card answers open another command

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-26, from branch `calummoore/needs-input-at-the-composer-milestones-3-j8a8`, outside the scope of review finding 87 of round 2, from its finding check.
- **Location:** `docs/mockups/src/entries/mac-app/commands/index.mockup.tsx:38` (the `long-limit` variant), `docs/mockups/src/screens/MacAppScreen.tsx:25`, `docs/mockups/src/fixtures/macConversations.ts:98`, `docs/mockups/src/fixtures/mac.ts:44` (`safariSuite`), and `docs/mockups/src/components/mac/CommandActions.tsx:19` and `:104`.
- **Reason:** The page and its links are on `main` since 6 November 2026, and the needs-input change does not touch them.

- **Source:** Review.
- **Category:** Mockup.
- **Terms:**
  - **Generic result links:** the fixed answer links of a Mac command card in `docs/mockups/src/components/mac/CommandActions.tsx`. Deny opens `app/mac-commands/denied`. Allow and Always allow open `app/mac-commands/done`. Allow all commands for 15 minutes opens `mac-app/commands/allow-all`, and Allow all commands until I stop opens `mac-app/commands/allow-until-stop`.
- **Background:**
  - `mac-app/commands/long-limit` shows a Mac command request that asks for a longer time limit. Its command is `npm run test:safari`, the whole Safari suite, for 10 minutes, with the reason "The whole Safari suite takes about 6 minutes." Its chat is `mac-waiting-suite`, from the request `safariSuite` in `docs/mockups/src/fixtures/mac.ts`.
  - The card draws the generic result links. Each result page draws the request `safariTest`: `npm run test:safari -- checkout`, with a limit of 60 seconds. A result card shows the command, its folder, its time limit, and its output.
  - The page came with these links in commit `4fd2ddca9` on 6 November 2026.
  - The other single Mac cards of the Mac app show `npm run test:safari -- checkout`, so their generic result links match. A browser shows only the state of a Mac command, with no answer.
- **Problem:** Deny, Allow, and each choice of the menu beside Allow on `mac-app/commands/long-limit` open a result of `npm run test:safari -- checkout` with a limit of 60 seconds. They do not open a result of the whole suite that the card asks for.
- **Impact if no action:** The visual spec shows another command and another time limit after the answer. A reader cannot tell what an answer to a request for a long limit gives.
- **Root question:** What should the answers of the long-limit card open, so that each shows the result of its own command?
- **Options:**
  - **A.** Draw no answer links on the `long-limit` card, as a card of a walk that names no answers does. It removes links that the mockups on `main` draw. Effort: Small.
  - **B.** Add the result pages of the suite: chats where `npm run test:safari` was denied or ran with its output, and the pages of the two grants with that chat. Give the `long-limit` card these pages as its answer links. Effort: Medium.
  - **C.** One table gives the result pages of each Mac command of the fixtures, and each Mac card reads its answer links from that table. A command with no row draws no answer link. B then adds the row of the suite. Effort: Medium.
- **Left out:** A long-limit example with the checkout command, because the result pages still show its limit of 60 seconds. Changing nothing, because the visual spec then keeps a wrong result.
- **Wider fix:** C. A card can then no longer inherit the result of another command. For the four cards of the Mac stack, its default either removes their answer links or needs their rows, so its reach waits for the answer of `plans/follow-ups/mac-stack-answers-open-other-command.md`.
- **Previous examples:** None found before 26 November 2026. The same review found the class in the Mac stack.
- **Related:** `plans/follow-ups/mac-stack-answers-open-other-command.md` holds the same class in the stack of `mac-app/requests`. Its option E keeps the links of this card, so this item needs its own fix. Its option C can take its result pages from the table of option C here.
- **Recommendation:** B. It fixes the one wrong page, keeps each link, and does not wait for the open item of the Mac stack. C best protects the catalogue, but its default changes the links of that stack, so it waits for the answer of that item.
- **Action:** fix after merge, apply B, because the page is on `main` since 6 November 2026, and the needs-input change does not touch it.
