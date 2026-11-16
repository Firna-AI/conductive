import type {
  Automation,
  AutomationRunTrigger,
} from '../../src/shared/automations'

export function automationRunText(
  automation: Pick<Automation, 'prompt' | 'name'>,
  trigger: AutomationRunTrigger,
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
  const facts = [`Automation: ${automation.name}`, `Trigger: ${label}`]
  if (trigger.kind === 'pull-request')
    facts.push(
      `Pull request: #${trigger.number} ${trigger.url}`,
      `Head: ${trigger.headBranch} (${trigger.headSha})`,
      `Merges into: ${trigger.baseBranch}`,
      `Your work goes to: ${trigger.event === 'merged' ? trigger.baseBranch : trigger.headBranch}`,
    )
  return `${automation.prompt}\n\n---\n${facts.join('\n')}`
}
