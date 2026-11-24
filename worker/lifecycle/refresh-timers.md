# Refresh timers

This page belongs to [Image builds](image-builds.md). It gives the refresh
of an org image after a push, the daily refresh, and the wake of the image
coordinator after a repository change on GitHub.

`refreshImagesForPush` in [`image-timers.ts`](image-timers.ts) starts a
refresh for each org whose current image holds the pushed repository, and
that has an admin who is not suspended. It
acts on a push to the default branch, at most once in 30 minutes for each
org. A push during a running job waits for a later refresh. Only the
verified GitHub webhook receiver may call it. The
[GitHub backend](../github/README.md) owns that receiver. The image
coordinator starts the daily refresh by itself.
A daily refresh sets the saved daily deadline 24 hours after its start.

`imageHoldsOldValues` in
[`org-image-refresh-data.ts`](org-image-refresh-data.ts) is true when the
published image holds a repository name or default branch that differs from
the saved one, and the newest build succeeded. `readImageSchedule` then makes
the next alarm due at once, and `runImageAlarm` and `refreshImagesForPush`
start a build in place of a refresh. So a build follows each job or failed
start that leaves old values in the image. The check reads no GitHub data,
so it cannot find a change whose webhook never saved it.
`wakeImagesForRepositoryChange` in
[`repository-change-builds.ts`](repository-change-builds.ts) wakes the
coordinator of each such org after the GitHub webhook receiver saves a
repository change. Its discovery reads the image of each org's current account.
It calls `scheduleIdleImage` in [`image-schedule.ts`](image-schedule.ts),
which reads that account and schedules from the saved job and refresh deadlines.
It reads the software release only when an org needs a wake.
[Repository changes on GitHub](../../docs/protocol/repository-changes-on-github.md)
states the rules.

Both refreshes start with the first admin who is not suspended, from
`firstActiveOrgAdmin` in [`settings-data.ts`](settings-data.ts). An org
without such an admin gets neither refresh. Its push uses no part of the
30-minute limit, and a recorded push refresh stays pending. Without a
waiting switch, the image coordinator sets no new alarm. A waiting switch
keeps its eligibility alarm.
[Operator actions](../../docs/protocol/operator-actions.md#starts-stops-and-builds)
states the rule.
