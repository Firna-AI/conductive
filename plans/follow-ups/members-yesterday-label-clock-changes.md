# Yesterday labels fail across clock changes

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #7, branch `conductor/boat-native-remote-workspaces-milestone-15c`, finding 4.
- **Location:** `src/members/time.ts:56`.
- **Reason:** the wrong label shows only near a daylight-saving change, so a later branch fixes it.

- **Terms:**
  - **Build history:** the list of org image builds in the org settings, with a time label for each build.
- **Background:** The build history shows the elapsed time, "Yesterday", or a calendar date. The time helper takes the display time zone.
- **Problem:** The helper finds yesterday by subtracting 24 hours. In `America/New_York`, it labels 7 March 2026 at 23:00 as "Yesterday" on 9 March at 00:30. The correct label is "7 Mar".
- **Impact if no action:** Near a clock change, users can see the wrong build date.
- **Root question:** How do date labels stay correct across clock changes?
- **Options:**
  - **A.** Always show the date after 24 hours. This changes the drawn labels. Effort: Small.
  - **B.** Compare local calendar day numbers through a shared helper. Read the year, the month, and the day with `formatToParts`. Keep the elapsed-time code separate. Effort: Small.
  - **C.** Use a date library for calendar arithmetic in a time zone. This adds a dependency. Effort: Medium.
- **Left out:** UTC dates alone, because they give wrong labels in other time zones.
- **Wider fix:** B. Day numbers do not assume a day length.
- **Previous examples:** None found.
- **Recommendation:** B. It keeps the mockup's "Yesterday" label and adds no dependency.
- **Action:** fix after merge, apply B, because this defect occurs only near specific clock changes.
