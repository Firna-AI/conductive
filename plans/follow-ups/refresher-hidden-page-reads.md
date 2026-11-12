# Timed reads of the app keep running on a hidden page

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-11, the wider fix of finding 107 of review round 2 on branch `calummoore/cli-proxy-setup`, which fixed the account login reads only.
- **Location:** `Refresher` in `src/app/refresh.ts`, the chat's own list at `src/chat/state/workspace-list.ts`, `AppServices.visible` in `src/app/services.ts`, and `docs/protocol/routine-runs.md`.
- **Reason:** The rule changes how the lists of `main` refresh, so the user decides.

- **Terms:**
  - **Refresher:** the shared owner of the timed reads of the app, such as the workspace list every 30 seconds.
- **Background:**
  - The own endpoint change reads the account logins once a minute while an own endpoint login exists, and stops that timer while the page is hidden. When the page shows again, it reads once and resumes.
  - `Refresher` keeps its timers on a hidden page. So a hidden org tab reads the workspace list every 30 seconds.
  - `AppServices.visible` says whether the page shows. A page without the focus can still show.
  - The ChatGPT sign-in form polls until its code expires, also while the page is hidden, because the user is often on the OpenAI page in another tab. So a rule for every timer of the app would break it.
- **Problem:** Hidden tabs keep sending timed reads of lists that nobody sees.
- **Impact if no action:** Forgotten tabs cost browser work and Worker and database calls.
- **Root question:** How does the app keep its lists current without timed reads on a hidden page?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **D.** `Refresher` holds its timer while `AppServices.visible` is false, and its focus read catches up when the page shows. Give the chat's own list a visibility default, and add a sentence to `docs/protocol/routine-runs.md`. Cost: it changes the refresh of the lists of `main`. Effort: Medium.
  - **E.** The Worker tells the open tabs of a user about each change, so the timers can go. Cost: a channel for each user, a Durable Object migration, a protocol section, and tests. Effort: Large.
- **Left out:** A visibility rule in `AppServices.delay` for every timer, because it stops the ChatGPT sign-in poll.
- **Wider fix:** D.
- **Previous examples:** `src/app/workspace-read-marks.ts`, which cancels hidden-page work, and the account login reads of the own endpoint change.
- **Recommendation:** D. It removes hidden-page reads at their shared owner.
- **Action:** ask the user, because D changes how the existing lists of `main` refresh.
