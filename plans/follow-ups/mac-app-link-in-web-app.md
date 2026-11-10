# The web app gives no way to get the Mac app

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the brainstorm of the branch `calummoore/desktop-app-website-mention`, which adds the Mac app downloads to the marketing site.
- **Location:** `src/shared/transcript/command-words.ts:112`, and the line about the web app in `docs/mockups/mac-app.md:46`.
- **Reason:** the user asked for the Mac app on the marketing site, and a link in the web app adds behaviour that needs its own mockup and decision.

- **Terms:**
  - **Mac command:** a request from an agent to run a shell command on the Mac of the person who sent the turn. Only the Mac app can allow it.
  - **Latest release:** the newest published release of the public repository `Firna-AI/remote-code`. It holds a notarized DMG for each chip.
- **Background:** When an agent asks to run a command on the Mac, the web app in a browser shows the request without the choices, because only the Mac app can allow it. When no Mac app runs, the command card says "The Mac is asleep, or the Mac app is closed." The marketing site at `conductive.build` links the DMG of each chip from the latest release. `src/marketing/links.ts` holds those download addresses.
- **Problem:** A user of the web app who has never installed the Mac app learns that a Mac app exists, but the web app gives no way to get it.
- **Impact if no action:** The user must find the download on the marketing site alone, so a Mac command request stays without an answer.
- **Root question:** How does a user of the web app who meets a Mac command get the Mac app?
- **Options:**
  - **A.** Add "Get the Mac app" to the command card in the browser, when no Mac app can answer. It links the Mac app section of the marketing site. Draw it in the mockups first. Effort: Medium.
  - **B.** Add a Mac app section to the account page of the web app, with both downloads from the shared module. Draw it in the mockups first. Effort: Medium.
  - **C.** Do A and B. Effort: Medium.
- **Left out:** A banner on every page of the web app: it interrupts each user who does not need the Mac app.
- **Wider fix:** None. The gap is one place in the web app, not a class.
- **Previous examples:** None found.
- **Recommendation:** A. The command card is where the user meets the need for the Mac app.
- **Action:** ask the user, because the link adds user-visible behaviour to the web app that no requirement covers.
