import type { Routine, RoutineRunTrigger } from '../../src/shared/routines'

export function routineRunText(
  routine: Pick<Routine, 'prompt' | 'name'>,
  trigger: RoutineRunTrigger,
): string {
  const label =
    trigger.kind === 'run-now'
      ? 'Run now'
      : trigger.kind === 'schedule'
        ? {
            hourly: 'Hourly',
            daily: 'Daily',
            weekdays: 'Weekdays',
            weekly: 'Weekly',
            custom: 'Custom (cron)',
          }[trigger.schedule]
        : `PR ${trigger.event}`
  const facts = [`Routine: ${routine.name}`, `Trigger: ${label}`]
  if (trigger.kind === 'pull-request')
    facts.push(
      `Pull request: #${trigger.number} ${trigger.url}`,
      `Head: ${trigger.headBranch} (${trigger.headSha})`,
      `Merges into: ${trigger.baseBranch}`,
      `Your work goes to: ${trigger.event === 'merged' ? trigger.baseBranch : trigger.headBranch}`,
    )
  return `${routine.prompt}\n\n---\n${facts.join('\n')}`
}
