import type {
  BackgroundTaskSummary,
  SessionCronSummary,
} from '@anthropic-ai/claude-agent-sdk'

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** Named work stays with its turn, including a provider handoff. */
export class ClaudeBackgroundNote {
  private readonly named: Set<string>
  private readonly ambient: (id: string) => boolean
  private readonly warn: (message: string) => void

  constructor(
    ambient: (id: string) => boolean,
    warn: (message: string) => void,
    named = new Set<string>(),
  ) {
    this.ambient = ambient
    this.warn = warn
    this.named = named
  }

  context(
    backgroundTasks: readonly BackgroundTaskSummary[],
    sessionCrons: readonly SessionCronSummary[],
  ): string | undefined {
    const tasks: string[] = []
    for (const task of backgroundTasks) {
      if (
        (task.status !== 'running' && task.status !== 'pending') ||
        this.ambient(task.id) ||
        this.named.has(`task:${task.id}`)
      )
        continue
      this.named.add(`task:${task.id}`)
      tasks.push(`- Task ${task.id}: ${oneLine(task.description)}`)
    }
    const wakeUps: string[] = []
    for (const cron of sessionCrons) {
      if (this.named.has(`cron:${cron.id}`)) continue
      this.named.add(`cron:${cron.id}`)
      this.warn('Claude reported an unexpected in-process wake-up.')
      wakeUps.push(
        `- Wake-up ${cron.id} (${oneLine(cron.schedule)}): ${oneLine(cron.prompt)}`,
      )
    }
    if (tasks.length === 0 && wakeUps.length === 0) return undefined
    return [
      ...(tasks.length
        ? [
            'Background work still runs:',
            ...tasks,
            'This turn stays open while it runs, for up to 30 days from the first wait.',
            'A member message during a wait starts the count again.',
            'You get a notification when each task ends.',
            'Stop each task that you do not need with TaskStop.',
          ]
        : []),
      ...(wakeUps.length
        ? [
            'In-process wake-ups:',
            ...wakeUps,
            'This turn does not wait for these wake-ups.',
            'Set each wake-up again with schedule_wake_up.',
          ]
        : []),
      'Run temporary check servers as tracked background work.',
      'Stop each temporary check server with TaskStop before your reply.',
      'Run each server that must continue after your reply as a service.',
      'For example: conductive services start --name web -- npm run dev.',
      'Report the service name and port in your reply.',
      'Say that it runs until Stop, its own process ends, or the cloud computer stops.',
      'Say that preview use adds no awake time.',
      'Services add no activity and hold no turn open.',
      'Keep builds, tests, and CI waits that must finish in this turn.',
      'Then end your reply.',
    ].join('\n')
  }
}
