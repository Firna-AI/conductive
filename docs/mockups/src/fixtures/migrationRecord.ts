/**
 * The state of a page of the migration job on the Providers tab of the
 * operator (own computer decision 7 D), in two groups. The settings are
 * what the controls of the job set, and only a control changes them. The
 * facts are what the time of the page decides, and no control changes
 * them: a control keeps the facts of its page, so its action takes the
 * time of that page. The pages and the fixtures of the job read the same
 * groups.
 */
export const jobSettingValues = {
  /** No pause, or a pause that an operator asked for with Pause job. */
  pause: ['none', 'asked'],
  /**
   * No limit, the question before the limit, or the limit to Hexwave.
   * Whether the work of Hexwave ended is a fact.
   */
  limit: ['none', 'question', 'hexwave'],
  /** The saved pace: the default on each account, or a faster pace of boat. */
  savedPace: ['default', 'faster'],
  /**
   * No typed pace, the faster pace of boat that the operator typed and has
   * not saved, or that pace after a save that failed.
   */
  typedPace: ['none', 'faster', 'save-failed'],
} as const

export const jobFactValues = {
  /**
   * The time of the page, which decides the work that the job completed
   * and the times of the actions before it: the count, just after it, the
   * later job, the end of the steps that ran at the pause of the later
   * job, the end of the work of Hexwave under its limit, or the end of the
   * job.
   */
  at: ['counting', 'counted', 'later', 'drained', 'hexwave-done', 'done'],
  /** No wait, or the wait of boat after a refusal of its provider. */
  wait: ['none', 'rate-limit', 'capacity'],
} as const

type Values<Group> = {
  readonly [Part in keyof Group]: Group[Part] extends readonly (infer V)[]
    ? V
    : never
}

/** What the controls set: the pause request, the limit, and the pace. */
export type JobSettings = Values<typeof jobSettingValues>

/**
 * The steps that run now on each account: its restarts, its brief starts,
 * and its refreshes.
 */
type RunningSteps = { readonly boat: number; readonly e2b: number }

/**
 * What the time of the page decides: the time and its completed work, the
 * wait after a refusal, and the steps that run on each account.
 */
export type JobFacts = Values<typeof jobFactValues> & {
  readonly running: RunningSteps
}

/** The state of a page of the job: its settings and its facts. */
export type JobRecord = {
  readonly settings: JobSettings
  readonly facts: JobFacts
}

/**
 * The result of a control: the record with the settings that the control
 * changes, and the same facts. Each control of the job makes its result
 * here, so no control changes a fact.
 */
export function withSettings(
  record: JobRecord,
  settings: Partial<JobSettings>,
): JobRecord {
  return { settings: { ...record.settings, ...settings }, facts: record.facts }
}
