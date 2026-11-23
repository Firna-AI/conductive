/**
 * The state of a page of the migration job on the Providers tab of the
 * operator, in five parts (own computer decision 7 D). Each control of the
 * job changes one part only: Pause job and Continue job change the run,
 * Limit to one org and Remove limit change the limit, and Save pace turns
 * the typed pace into the saved pace. The pages and the fixtures of the
 * job read the same parts.
 */
export const jobRecordValues = {
  /**
   * The count of the job, the moment just after it, or the later job. The
   * progress tells only these apart, so a page of the later job keeps its
   * progress when a control changes another part.
   */
  progress: ['counting', 'counted', 'later'],
  /**
   * The job runs, an operator paused it, it waits after a refusal of boat
   * for its rate limit or for its capacity, or it is done.
   */
  run: ['running', 'paused', 'refused', 'capacity', 'done'],
  /**
   * No limit, the question before the limit, the limit to Hexwave, or that
   * limit after the work of Hexwave ended.
   */
  limit: ['none', 'question', 'hexwave', 'hexwave-done'],
  /** The saved pace: the default on each account, or a faster pace of boat. */
  savedPace: ['default', 'faster'],
  /**
   * No typed pace, the faster pace of boat that the operator typed and has
   * not saved, or that pace after a save that failed.
   */
  typedPace: ['none', 'faster', 'save-failed'],
} as const

type RecordValues = typeof jobRecordValues

/** The state of a page of the job: one value for each part. */
export type JobRecord = {
  [Part in keyof RecordValues]: RecordValues[Part][number]
}
