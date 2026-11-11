/**
 * The words of the jobs of the org image on the Cloud computer tab. A job
 * is a build or a refresh. Each refresh is a clean build with the install
 * script and the repositories of the newest good build, so the tab shows
 * each refresh with the builds, and names what started it. This module
 * imports no fixture, so that the app can share it.
 */

/**
 * The kind of a job: a build, which Build computer, Try again, Create org,
 * or an added repository starts, a refresh after a push to the default
 * branch of a chosen repository, or the daily refresh.
 */
export const jobKinds = ['build', 'push-refresh', 'daily-refresh'] as const

export type JobKind = (typeof jobKinds)[number]

/** A job in a sentence: its kind, and when it started. */
type JobTime = { kind: JobKind; when: string }

/** The name of each kind in the history, which says what started a refresh. */
export const jobLabels: Readonly<Record<JobKind, string>> = {
  build: 'Build',
  'push-refresh': 'Refresh after a push',
  'daily-refresh': 'Daily refresh',
}

/** The head of the card while a job of each kind runs, before its time. */
export const runningLabels: Readonly<Record<JobKind, string>> = {
  build: 'Building',
  'push-refresh': 'Refreshing after a push',
  'daily-refresh': 'Running the daily refresh',
}

/** "build" or "refresh", inside a sentence. */
function noun(kind: JobKind): string {
  return kind === 'build' ? 'build' : 'refresh'
}

/** The head of the card once the newest job ended. */
export function lastJobLabel(kind: JobKind): string {
  return kind === 'build' ? 'Last build' : 'Last refresh'
}

/**
 * The note under the log of a job that runs: the job that workspaces start
 * from until it finishes, and the 60-minute limit of each job.
 */
export function runningNote(kind: JobKind, lastGood?: JobTime): string {
  const from = lastGood
    ? `Workspaces start from the ${noun(lastGood.kind)} of ${lastGood.when} until this one finishes.`
    : `Workspaces start from this ${noun(kind)} when it finishes.`
  return `${from} Each ${noun(kind)} has a 60-minute limit.`
}

/** The note of a failed job: the good job that workspaces still start from. */
export function stillStartsFrom(lastGood: JobTime): string {
  return `Workspaces still start from the ${noun(lastGood.kind)} of ${lastGood.when}.`
}
