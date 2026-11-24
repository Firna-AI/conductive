# Phone tabs open web workspace pages on a tablet

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from pull request #671, branch `calummoore/universal-expo-app-milestone-1-mockups-emjd`, a problem that the second fix round of its review found inside the scope after the last review round.
- **Location:** `docs/mockups/src/components/workspace/MobileTabBar.tsx`, `docs/mockups/src/components/workspace/tools.ts`, and the sidebar rows of the phone pages under `phone-app/`.
- **Reason:** the branch that found it had used its two fix rounds.

- **Source:** Review. **Category:** mockup.
- **Terms:**
  - **Phone mark:** the `PhoneApp` context of the mockups, which the registered tab parts also take as the optional `phoneApp` prop.
- **Background:**
  - The phone mockups follow one rule, in `docs/mockups/phone-app.md`: on a phone page, a link opens a phone page, or a shared page that the phone apps show in the same way, or it has no link.
  - On a phone page, the Preview tab opens the phone Preview tool, and Keyboard shortcuts has no link.
  - The Chat, Files, and Terminal tabs and the sidebar rows of a phone page open the shared workspace pages under `app`. On a phone those pages look the same in both apps. In the desktop layout of a tablet, they draw the Preview tabs of the web app in the centre row. The phone apps have no Preview tabs, because each preview opens in the in-app browser.
- **Problem:** On a tablet, these links open pages that the phone apps do not show in the same way.
- **Impact if no action:** a reader of the tablet views sees Preview tabs that the phone apps do not have.
- **Root question:** Which page do the shared tabs and rows of a phone page open in the desktop layout of a tablet?
- **Options:**
  - **A.** Under the phone mark, give these tabs and rows no link where the shared page draws Preview tabs. Effort: Small.
  - **B.** Draw phone versions of the workspace pages that these links open, without Preview tabs. Effort: Medium.
- **Left out:** a client field in the shared workspace state, because each web page would then offer a phone-only state.
- **Wider fix:** None. The rule of `docs/mockups/phone-app.md` already covers the class.
- **Previous examples:** the Preview and Preferences tabs of phone pages opened web pages until the review of pull request #671.
- **Recommendation:** A. It applies the existing rule at a Small cost.
- **Action:** fix after merge, apply A.
