# GitHub account age shows zero years

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, finding 4 of the waitlist branch review, `calummoore/waitlist-and-invite-system`.
- **Location:** `src/shell/operator/format.ts:74`, with callers in `WaitlistTab.tsx` and `UserDetails.tsx` in that directory.
- **Reason:** Only the first-year boundary meets the defect, and the operator can still inspect the GitHub profile and approve the account.

- **Terms:**
  - **Account age:** The elapsed time since GitHub created the account, shown on the operator Waitlist tab and user page.
- **Background:** The operator uses account age to assess a person before approval. `formatAge` shows the largest whole unit. It uses average month and year durations. It shows days from 1, weeks and months from 2, and years from 1.
- **Problem:** The function starts its year branch at 365 whole days but divides by 365.25. An account from 365 to just under 366 days old therefore shows `0 years`. At 364 days it shows `11 months`, and at 366 days it shows `1 year`.
- **Impact if no action:** Both operator screens show an incorrect account age during that one-day interval. The row still provides the GitHub profile link and the join date.
- **Root question:** How should the operator see a correct account age at every unit boundary?
- **Options:**
  - **A.** Start the year branch at 366 whole days. Keep the current divisions. Add the regression at 365 days. This keeps the threshold separate from the unit length. Effort: Small.
  - **B.** Define the 365.25-day year once. Use it for both selecting years and dividing the age. Add the boundary regression. Effort: Small.
  - **C.** Calculate calendar years and months from the creation date. Select a unit only after that many calendar units passed. Pass the operator's time zone at both callers. This needs more date handling and boundary cases. Effort: Medium.
  - **D.** Keep one list of units, with each unit's length and minimum count. Use 365.25 days from 1 year, 30.4375 days from 2 months, 7 days from 2 weeks, and days from 1. Show the first unit whose whole count reaches its minimum. Otherwise show `Under a day`. This removes separate unit thresholds and preserves the current approximate age policy. Add the boundary regression. Effort: Small.
  - **E.** Keep the year branch at 365 days and show at least 1 year. Most accounts then show `1 year` on their first calendar anniversary. The code keeps two year lengths and can conceal a later threshold error. Effort: Small.
- **Left out:**
  - A creation date instead of an age breaks the current age requirement.
  - Hiding ages removes information that the operator needs.
  - Rounding up can make an account seem older than it is.
  - Changing nothing leaves the wrong value.
  - Moving the calculation to the Worker changes its owner without removing the cause.
  - Other duration helpers outside this area do not have the defect.
  - A class test is unnecessary beside D and would need user approval.
- **Wider fix:** D. Each unit selects itself by the count it shows, so its threshold cannot disagree with its division.
- **Previous examples:** None found. Other format helpers in `src/app/time.ts`, `src/github/format.ts`, `src/shared/transcript/duration.ts`, and `src/members/time.ts` already start their units at a whole count.
- **Recommendation:** D. It removes the separate thresholds for every unit at the same Small effort as B.
- **Action:** fix after merge, apply D, because the Low/Rare defect affects one narrow interval and does not block approval.

Keep the existing approximate durations for D. They are an implementation policy, not a calendar-year requirement. Options A, B, and D show `11 months` on day 365 and `1 year` on day 366. Option E shows `1 year` on both days. Calendar option C handles actual anniversaries instead.

Add a focused unit regression for the exported `formatAge`. Use a fixed current timestamp and literal expected values: 364 days gives `11 months`, 365 gives `11 months`, and 366 gives `1 year` under D. `src/github/format.test.ts` provides the repository pattern. Do not change the mockup age fixtures to force this case. The screen tests already cover each display unit.

The review evaluated the real formatter across 0 to 40,000 whole days. Only day 365 gave a count below its unit's minimum. Options B and D differed on no day in that evaluation. Keep this as a one-time proof rather than a permanent class test.

The age requirements are in `docs/protocol/operator-section.md`, for the Waitlist tab and the user page.
