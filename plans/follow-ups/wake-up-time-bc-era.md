# Wake-up time labels lose the BC era

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-23, from `calummoore/agent-scheduling-wake-future-nlp0`, review finding 12.
- **Location:** `docs/mockups/src/components/chat/wakeUpCopy.ts:153`, `:170`, `:180`, `:230`, and `:249`.
- **Reason:** This affects unusual past dates, and the saved timestamp stays correct.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Wake-up:** An agent's request to continue its session at a chosen time.
  - **Unix milliseconds:** The number of milliseconds from midnight UTC on 1 January 1970, with negative values before that time.
- **Background:** Wake-ups accept safe-integer timestamps, including past times. Chat uses the reader's time zone. Schedule replies and transcript copies use UTC. The formatter moves timestamps outside JavaScript's date range by whole 400-year cycles to obtain calendar parts.
- **Problem:** For dates inside JavaScript's range, the formatter reads the year without its era. The UTC and local labels lose BC, and the local day comparison can match an AD date. `Date.UTC` also reads years 0 to 99 as 1900 to 1999 when `calendarDay` builds its day number.
- **Reproduction:** Use UTC for the reader and 24 November 2026 at 09:00 as the reader's current time. Create the wake-up date with `setUTCFullYear(-2025, 10, 24)` and `setUTCHours(9, 0, 0, 0)`. The date is 24 November 2026 BC. `wakeUpTime` returns `today at 09:00`. `wakeUpTimeUtc` returns `24 November 2026, 09:00 UTC`.
- **Impact if no action:** Chat, schedule replies, and copies can show the wrong era. Chat can also describe an old date as today.
- **Root question:** How can each accepted wake-up time keep its date and era in labels and day comparisons?
- **Options:**
  - **A.** Shift every BC date into the existing Gregorian cycle path and keep the far-date label rules. Add an in-range BC regression in `src/shared/wake-up-time.test.ts`. Effort: Small.
  - **B.** Decode the era and calendar parts once in a helper for both labels and the local day comparison. Build the day number with `setUTCFullYear`. Keep the cycle shift for times outside JavaScript's range. Add a regression for an in-range BC date in `src/shared/wake-up-time.test.ts`. Effort: Small.
  - **C.** Apply B and use `fast-check` to test round trips from timestamps to calendar parts and back at minute precision. Adding the new development dependency needs Cal's approval. Effort: Medium.
- **Left out:** The default date formatter still needs an era rule and a way to handle timestamps outside JavaScript's range.
- **Wider fix:** C covers the range of accepted dates with a round-trip property test.
- **Previous examples:** `src/shared/wake-up-time.test.ts` already checks the 400-year shift at both limits of the safe-integer range.
- **Recommendation:** B. One interpretation of the era serves both labels and the day comparison.
- **Action:** Fix after merge, apply B. Ask Cal before adding `fast-check` for C.
