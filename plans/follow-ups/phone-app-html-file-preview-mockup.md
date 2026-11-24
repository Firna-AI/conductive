# Phone mockups still frame HTML file previews

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from pull request #671, branch `calummoore/universal-expo-app-milestone-1-mockups-emjd`, a problem that the second fix round of its review found inside the scope after the last review round.
- **Location:** `docs/mockups/src/screens/phoneToolState.ts` and the `phone-app` folder of the mockups.
- **Reason:** the branch that found it had used its two fix rounds, and the fix needs a new mockup page.

- **Source:** Review. **Category:** mockup.
- **Terms:**
  - **HTML file preview:** the Preview of the tab of an HTML file, which shows the page in a frame from the files preview of the workspace, on the preview domain.
  - **In-app browser:** the browser view of the system that opens over a phone app, with Done.
- **Background:**
  - A design call of the universal Expo app plan says that the phone apps open each port preview in the in-app browser, because code in a preview never runs with the app session.
  - A design call of 24 November 2026 extends that rule to the Preview of an HTML file tab, because its files preview also runs code on the preview domain. Milestone 21 of the plan has a TODO for it.
  - The phone mockup `phone-app/browser/tool` has its own schema, which leaves out the Preview states that only the web app draws. It still offers `tab: html`, which draws the file preview in a frame in the desktop layout of a tablet.
- **Problem:** No phone mockup draws an HTML file preview in the in-app browser, and the phone tool page can still draw it in a frame.
- **Impact if no action:** Milestone 21 builds the HTML file preview of the phone apps with no mockup to follow.
- **Root question:** How do the phone mockups show the Preview of an HTML file tab?
- **Options:**
  - **A.** Leave `tab: html` out of the schema of the phone tool page, and add a page under `phone-app/browser` that shows an HTML file preview in the in-app browser, with Done back to the file tab. Effort: Medium.
  - **B.** Only leave `tab: html` out of the schema. Effort: Small.
- **Left out:** a frame in the phone apps, because it breaks the design call.
- **Wider fix:** None, because the phone schemas already limit the states of their pages.
- **Previous examples:** the Preview tool of the phone apps showed the web frame until the review of pull request #671.
- **Recommendation:** A. It removes the frame and draws the state that Milestone 21 builds.
- **Action:** fix after merge, apply A.
