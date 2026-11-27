import type { SessionCronSummary } from '@anthropic-ai/claude-agent-sdk'

import type { ProviderEvent } from '../generated/ProviderEvent'
import { object } from '../parse'
import type { ClaudeOrphans, ListedTask } from './claude-orphans'

/** Process-local level signals. A removed task can still have a queued reply. */
export class ClaudeBackground {
  private tasks = new Set<string>()
  private ambient = new Set<string>()
  private crons: readonly SessionCronSummary[] = []
  private idle = false
  private observed = false
  private readonly emit: (event: ProviderEvent) => void
  private orphans: ClaudeOrphans | null = null
  waited = false

  constructor(emit: (event: ProviderEvent) => void) {
    this.emit = emit
  }

  /** Work of a parked subagent holds the turn open, as live work does. */
  watch(orphans: ClaudeOrphans): void {
    this.orphans = orphans
  }

  get live(): boolean {
    return (
      this.tasks.size > 0 ||
      this.crons.length > 0 ||
      this.orphans?.holding === true
    )
  }

  /**
   * The engine also waits for a fresh idle state after work that this process
   * saw. So a wake-up reply in that wait counts too, like in a live wait.
   */
  result(allAnswered: boolean): void {
    if (allAnswered && (this.live || (this.observed && !this.idle)))
      this.waited = true
  }

  input(): void {
    this.waited = false
  }

  /** A message of the runner's own note, not of a member. */
  isNote(uuid: string): boolean {
    return this.orphans?.isNote(uuid) === true
  }

  /** A result names the input that it answered, such as a note. */
  answered(uuids: readonly string[]): void {
    this.orphans?.answered(uuids)
  }

  isAmbient(id: string): boolean {
    return this.ambient.has(id)
  }

  stop(crons: readonly SessionCronSummary[]): void {
    this.idle = false
    this.emit({ type: 'activity', idle: false })
    this.crons = crons
    this.publish()
  }

  accept(input: Record<string, unknown>): boolean {
    this.orphans?.notice(input)
    if (input.type !== 'system' || input.parent_tool_use_id) return false
    if (input.subtype === 'session_state_changed') {
      if (!['idle', 'running', 'requires_action'].includes(String(input.state)))
        return true
      this.idle = input.state === 'idle'
      this.emit({ type: 'activity', idle: this.idle })
      return true
    }
    if (input.subtype !== 'background_tasks_changed') return false
    const all = new Set<string>()
    const live = new Set<string>()
    const ambient = new Set<string>()
    const listed: ListedTask[] = []
    for (const value of Array.isArray(input.tasks) ? input.tasks : []) {
      if (typeof value !== 'object' || value === null || !('task_id' in value))
        continue
      if (typeof value.task_id !== 'string') continue
      all.add(value.task_id)
      if (!('ambient' in value) || value.ambient !== true) {
        live.add(value.task_id)
        listed.push(listedTask(value.task_id, value))
      } else ambient.add(value.task_id)
    }
    // Becoming ambient needs no notification. Removal can precede its wake-up.
    if ([...this.tasks].some((id) => !all.has(id))) this.idle = false
    const before = this.tasks
    this.tasks = live
    this.ambient = ambient
    this.orphans?.list(listed, before)
    this.publish()
    return true
  }

  publish(): void {
    if (this.live) this.observed = true
    this.emit({ type: 'background', live: this.live, idle: this.idle })
  }
}

function listedTask(id: string, value: unknown): ListedTask {
  const entry = object(value)
  const text = (field: unknown) => (typeof field === 'string' ? field : null)
  return {
    id,
    runId: text(entry.run_id) ?? '',
    type: text(entry.task_type) ?? '',
    description: text(entry.description) ?? '',
    owner: text(entry.parent_task_id),
  }
}
