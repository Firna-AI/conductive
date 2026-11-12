# "Older runner" has two meanings in the protocol docs

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from the docs work of the own endpoint change on branch `calummoore/cli-proxy-setup`, which did not change the page.
- **Location:** `docs/protocol/message-attachments.md`, lines 52 and 84, and `docs/protocol/version-pins.md`, which defines the older runner.
- **Reason:** The own endpoint change does not touch the attachments page.

- **Terms:**
  - **Runner:** the program in each cloud computer that starts the agents and reports their events to the Worker. Each build of the org image installs the newest runner.
  - **Version pin:** the lowest runner protocol version that a workspace accepts.
- **Background:**
  - `docs/protocol/version-pins.md` uses "an older runner" for a runner of protocol version 1, which gets the agent login itself, and "a newer runner" for a runner of protocol version 2 or later.
  - `docs/protocol/message-attachments.md` uses "an older runner" for any runner build that lacks a feature: "An older runner gives the agent no read line and no size."
  - The own endpoint protocol therefore says "a runner that does not support this request" for a runner without the prompt cache field, to avoid the clash.
- **Problem:** One term names two different things, so a reader of the attachments page can read it as a runner of protocol 1.
- **Impact if no action:** A reader can draw a wrong rule from the attachments page, such as that only a runner of protocol 1 lacks the read line.
- **Root question:** How do the protocol docs name a runner build that lacks a feature, apart from a runner of protocol 1?
- **Options:**
  - **A.** Reword the two sentences of `docs/protocol/message-attachments.md`, for example "a runner build without this feature". Effort: Small.
  - **B.** Define both terms once in the terms of the architecture doc, and link to them. Effort: Small.
- **Left out:** Renaming the term in `docs/protocol/version-pins.md`, because many pages already use it for a runner of protocol 1.
- **Wider fix:** B.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the page is outside the own endpoint change.
