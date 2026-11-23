/**
 * The moments of the migration job of the host connection, as the pages of
 * the Providers tab draw them (own computer decision 7 D), and the facts
 * of each page. A moment is the time of a page. It decides the work that
 * the job completed and the times of the actions before it. An action on a
 * page takes the time of that page, because a control keeps the facts of
 * its page. So a pause after Save pace cannot show an earlier time than
 * the save.
 */
import type { JobFacts } from './migrationRecord'

/** A moment of the job, which the facts of a page name. */
export type JobMoment = JobFacts['at']

/**
 * The time of a moment, which each action on a page of that moment takes,
 * and the times of the actions that came before the moment.
 */
type Moment = { time: string; pausedAt?: string; savedAt?: string }

/** The time of the later job, when the operator paused it or saved a pace. */
const laterTime = '24 Nov at 11:46'

const moments: Readonly<Record<JobMoment, Moment>> = {
  counting: { time: '23 Nov at 06:03' },
  counted: { time: '23 Nov at 06:05' },
  later: { time: laterTime },
  /**
   * The steps that ran at the pause of the later job ended, so this moment
   * comes after that pause, and after a save of the pace on that page.
   */
  drained: { time: '24 Nov at 11:58', pausedAt: laterTime, savedAt: laterTime },
  'hexwave-done': { time: '24 Nov at 12:52' },
  done: { time: '26 Nov at 04:10' },
}

/**
 * When an operator asked for the pause of a page: at the time of the page,
 * or, after the steps of that pause ended, at the time of the pause.
 */
export function pauseTime(facts: JobFacts): string {
  const moment = moments[facts.at]
  return moment.pausedAt ?? moment.time
}

/**
 * When the operator saved the pace of a page: at the time of the page, or
 * before its moment, as for the pause.
 */
export function paceSaveTime(facts: JobFacts): string {
  const moment = moments[facts.at]
  return moment.savedAt ?? moment.time
}

/** When the job finished, on a page of its end. */
export function finishTime(facts: JobFacts): string | undefined {
  return facts.at === 'done' ? moments.done.time : undefined
}

/** The facts of a moment with no wait, and the steps that run on each account. */
function factsOf(at: JobMoment, boat: number, e2b: number): JobFacts {
  return { at, wait: 'none', running: { boat, e2b } }
}

/**
 * The facts of the drawn pages. Just after the count, boat restarts 3
 * machines at once and e2b refreshes its org image. In the later job, boat
 * runs 3 brief starts. After a refusal of its provider, boat runs 2, and
 * it starts no other step until the end of its wait. At the other moments,
 * no step runs.
 */
export const pageFacts = {
  counting: factsOf('counting', 0, 0),
  counted: factsOf('counted', 3, 1),
  later: factsOf('later', 3, 0),
  rateLimit: { ...factsOf('later', 2, 0), wait: 'rate-limit' },
  capacity: { ...factsOf('later', 2, 0), wait: 'capacity' },
  drained: factsOf('drained', 0, 0),
  hexwaveDone: factsOf('hexwave-done', 0, 0),
  done: factsOf('done', 0, 0),
} as const satisfies Readonly<Record<string, JobFacts>>
