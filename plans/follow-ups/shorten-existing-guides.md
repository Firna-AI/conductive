# Several guides exceed the file length target

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, during documentation integration on `calummoore/github-status-bar-actions`. Widened on 2026-11-26 by branch `calummoore/needs-input-at-the-composer-milestones-3-j8a8`, from the finding check of review finding 92 of its round 2, with four guides that passed 300 lines on `main` and that the branch grew.
- **Location:** `worker/app-api/README.md`, `src/app/screens.md`, `docs/mockups/catalogue.md`, `src/app/dev-fake.md`, `src/marketing/docs/security.md`, `src/marketing/docs/sessions-and-chat.md`, and `docs/architecture/protocol-docs.md` (264 lines on `main`, 266 after the needs-input change added one index entry, against the protocol doc target of about 250 lines).
- **Reason:** These guides already exceed the target on the incoming main branch. Their structure needs a separate documentation change.

- **Terms:**
  - **Pointer section:** A retained heading with a link to content moved to another page. It keeps an existing anchor valid.
  - **Public guide:** A Markdown page under `src/marketing/docs/` that the marketing site shows under Docs.
- **Background:**
  - The repository asks agents to keep files near 200 lines and split files that pass 300. These guides combine several topics.
  - The file-length rule of `npm run lint` checks JavaScript, TypeScript, and Astro files, so it does not report these Markdown files.
  - After integration with main at `d789f9e9`, `worker/app-api/README.md` had 317 lines and `src/app/screens.md` had 320. Both already passed 300 lines on that main snapshot. On 26 November 2026, at `main` commit `0b04e4d54`, they have 529 and 432 lines.
  - At the same commit, `docs/mockups/catalogue.md` has 313 lines, `src/app/dev-fake.md` 460, `src/marketing/docs/security.md` 442, and `src/marketing/docs/sessions-and-chat.md` 522. The needs-input change of that day takes them to 325, 475, 452, and 542 lines.
  - `docs/mockups/catalogue.md` is one table of 47 catalogue paths, and it already links 13 child pages, such as `catalogue-secrets.md`. `src/app/dev-fake.md` gives the query options of the development fake and what its fake routes do, with one heading, "Dev preview query options".
  - `src/marketing/docs/security.md` has ten sections, from "Choose people you trust" to "Keep the work you need". `src/marketing/docs/sessions-and-chat.md` has sixteen sections, from "Start a conversation" to "Recover from an error".
  - The two public guides follow `docs/protocol/website-docs.md`. It gives each guide one address, and its group and its order in the navigation. Each level-two heading gives its section an address of its own. So a split adds a guide to the navigation, and a moved section gets a new address.
  - Earlier observations of this item are closed. The deployment guide already passed 300 lines before the integration at `d789f9e9`. Main's provider-account work grew the sandbox guide from 219 to 304 lines. Its computer ledger work grew the member guide from 299 to 303 lines. Its software-image work grew the image guide past the target. The 405-line deployment guide and the 302-line image guide later had 259 and 223 lines. Captured main `6fd184c53e77dee208687512244ebcaf5fa120e9` shortened the sandbox guide to 251 lines and the member guide to 273.
- **Problem:** Six guides pass 300 lines on `main`, and no check reports them.
- **Impact if no action:** Readers must scan long guides. New changes must maintain several topics in each file. The files remain above the repository target.
- **Root question:** How can these guides stay short while keeping their facts and working links?
- **Options:**
  - **A.** Move cohesive topics to linked guides. Keep each current fact and each useful heading as a pointer section. Check all relative links and inbound anchors. For a public guide, give each new guide its group and its order, as `docs/protocol/website-docs.md` says. Effort: Medium.
- **Left out:** Dropping live content loses facts. Compacting lines does not improve the guides and breaks the file-length rule. A new Markdown gate would require approval and would not split the content.
- **Wider fix:** Already in force. The documentation skill gives content homes, short pages, and pointer sections. No new gate or test is needed.
- **Previous examples:** Main shortened `src/app/README.md` through `key-code.md`. It split mockup design into `design-chat.md` and `design-operator.md`, and the catalogue into `catalogue-operator.md`. It split `src/marketing/README.md` into linked picture, legal, comparison, and authoring guides. It also split `worker/operator/README.md` into overview, waitlist, and test guides. Those five earlier overlong-guide observations are closed. `docs/architecture/components.md` and `worker/chat/access.md` also preserve content moved from parent guides.
- **Related:** `plans/follow-ups/workspaces-guide-too-long.md` holds the third long public guide, `src/marketing/docs/workspaces.md`, with its own options. One branch can split the three public guides together, because each split changes the navigation of the public docs. `plans/follow-ups/chat-tests-guide-too-long.md` holds `src/chat/tests.md`.
- **Recommendation:** A. It preserves the documentation while giving each topic a shorter home.
- **Action:** fix after merge, apply A, because the long-guide structure is on `main` and outside the diff of each change that found it.

The app API guide holds request handling and its entry points. The screen guide holds the app's views and their models. Read each guide and its linked pages before choosing a split. A fixer can split each guide in its own branch. The earlier deployment, image, sandbox, and member guide cases are closed. Their linked pages keep the moved facts and entry points.

Keep requirements in protocol docs, component responsibilities in architecture docs, and code entry points in area READMEs. Preserve deployment setup, provider routing, public-text rules, and existing anchors. Do not add tests of prose or a stricter gate. Check changed Markdown links and inbound anchors after each move.
