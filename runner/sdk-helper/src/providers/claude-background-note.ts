import type { StopHookInput } from '@anthropic-ai/claude-agent-sdk'

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** Named work stays with its turn, including a provider handoff. */
export class ClaudeBackgroundNote {
  private readonly named: Set<string>
  private readonly ambient: (id: string) => boolean

  constructor(ambient: (id: string) => boolean, named = new Set<string>()) {
    this.ambient = ambient
    this.named = named
  }

  context(input: StopHookInput): string | undefined {
    const lines: string[] = []
    for (const task of input.background_tasks ?? []) {
      if (
        (task.status !== 'running' && task.status !== 'pending') ||
        this.ambient(task.id) ||
        this.named.has(`task:${task.id}`)
      )
        continue
      this.named.add(`task:${task.id}`)
      lines.push(`- Task ${task.id}: ${oneLine(task.description)}`)
    }
    for (const cron of input.session_crons ?? []) {
      if (this.named.has(`cron:${cron.id}`)) continue
      this.named.add(`cron:${cron.id}`)
      lines.push(
        `- Wake-up ${cron.id} (${oneLine(cron.schedule)}): ${oneLine(cron.prompt)}`,
      )
    }
    if (lines.length === 0) return undefined
    return [
      'Background work still runs:',
      ...lines,
      'This turn stays open while it runs, for up to 30 days from the first wait.',
      'A member message during a wait starts the count again.',
      'You get a notification when each task ends or each wake-up fires.',
      'Stop each task that you do not need with TaskStop.',
      'Run temporary check servers as tracked background work.',
      'Stop each temporary check server with TaskStop before your reply.',
      'Run each server that must continue after your reply as a service.',
      'For example: conductive services start --name web -- npm run dev.',
      'Report the service name and port in your reply.',
      'Say that it runs until Stop, its own process ends, or the cloud computer stops.',
      'Say that preview use adds no awake time.',
      'Services add no activity and hold no turn open.',
      'Keep builds, tests, and CI waits that must finish in this turn.',
      'Delete each wake-up that you do not need with CronDelete.',
      'Then end your reply.',
    ].join('\n')
  }
}
