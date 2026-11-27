import { orphanNote, type OrphanTask } from './claude-orphan-note'

/**
 * The grace time after the work of a parked subagent ends. The agent program
 * wakes such a subagent itself, and retries a failed wake for about a minute.
 */
export const ORPHAN_GRACE_MS = 120_000

/** One entry of `system/background_tasks_changed`. */
export interface ListedTask {
  id: string
  runId: string
  description: string
  owner: string | null
}

interface TaskRecord {
  description: string
  owner: string | null
  runId: string
}

interface Wait {
  key: string
  task: string
  owner: string
  timer: ReturnType<typeof setTimeout>
}

export interface ClaudeOrphanOptions {
  /** Work already named in this turn, shared with the background note. */
  named: Set<string>
  saveNamed: () => void
  /** Sends the note to the main agent and gives the UUID of its message. */
  deliver: (text: string) => string | null
  changed: () => void
  grace?: number
}

/**
 * Finds work that ended while the subagent that started it was not live.
 * The result of such work reaches only that subagent. The turn stays open
 * for the grace time, so that the program can wake the subagent. When the
 * subagent does not run again, the main agent gets one note.
 */
export class ClaudeOrphans {
  private readonly records = new Map<string, TaskRecord>()
  private readonly ends = new Map<string, OrphanTask['status'] | 'stopped'>()
  private readonly outputs = new Map<string, string>()
  private readonly agents = new Map<string, string>()
  private readonly waits = new Map<string, Wait>()
  private readonly sent = new Set<string>()
  private readonly options: ClaudeOrphanOptions
  private closed = false

  constructor(options: ClaudeOrphanOptions) {
    this.options = options
  }

  /** True while the grace time runs or while a note waits for its reply. */
  get holding(): boolean {
    return this.waits.size > 0 || this.sent.size > 0
  }

  isNote(uuid: string): boolean {
    return this.sent.has(uuid)
  }

  /** Reads task events and the replies of subagents. */
  notice(input: Record<string, unknown>): void {
    if (input.type === 'system' && typeof input.task_id === 'string') {
      const id = input.task_id
      if (
        input.subtype === 'task_started' &&
        typeof input.tool_use_id === 'string'
      )
        this.agents.set(input.tool_use_id, id)
      if (input.subtype === 'task_notification') {
        const status = input.status
        if (
          status === 'completed' ||
          status === 'failed' ||
          status === 'stopped'
        )
          this.ends.set(id, status)
        if (typeof input.output_file === 'string')
          this.outputs.set(id, input.output_file)
      }
      return
    }
    // A delivered notice is not a wake. Only a reply of the subagent's model is.
    if (
      input.type !== 'assistant' ||
      typeof input.parent_tool_use_id !== 'string'
    )
      return
    const owner = this.agents.get(input.parent_tool_use_id)
    if (owner) this.resolve(owner)
  }

  /** Takes one task list, and the live task IDs of the list before it. */
  list(tasks: readonly ListedTask[], before: ReadonlySet<string>): void {
    const now = new Set(tasks.map((task) => task.id))
    for (const task of tasks) {
      const record = this.records.get(task.id)
      this.records.set(task.id, {
        description: task.description,
        owner: task.owner ?? record?.owner ?? null,
        runId: task.runId || record?.runId || '',
      })
      this.resolve(task.id)
    }
    const found: Omit<Wait, 'timer'>[] = []
    for (const id of before) {
      if (now.has(id)) continue
      const owner = this.records.get(id)?.owner
      if (!owner || now.has(owner) || !this.records.has(owner)) continue
      if (this.ends.get(id) === 'stopped') continue
      const key = `orphan:${id}:${this.records.get(id)?.runId ?? ''}`
      if (this.options.named.has(key) || this.waits.has(key)) continue
      found.push({ key, task: id, owner })
    }
    if (!found.length) return
    // Work that leaves in one list change shares one grace time and one note.
    const keys = found.map((wait) => wait.key)
    const timer = setTimeout(
      () => this.expire(keys),
      this.options.grace ?? ORPHAN_GRACE_MS,
    )
    for (const wait of found) this.waits.set(wait.key, { ...wait, timer })
  }

  /** Clears each note that a result answered. */
  answered(uuids: readonly string[]): void {
    let changed = false
    for (const uuid of uuids) changed = this.sent.delete(uuid) || changed
    if (changed) this.options.changed()
  }

  close(): void {
    this.closed = true
    for (const wait of this.waits.values()) clearTimeout(wait.timer)
    this.waits.clear()
    this.sent.clear()
  }

  private resolve(owner: string): void {
    let changed = false
    for (const [key, wait] of this.waits) {
      if (wait.owner !== owner) continue
      this.waits.delete(key)
      if (![...this.waits.values()].some((other) => other.timer === wait.timer))
        clearTimeout(wait.timer)
      changed = true
    }
    if (changed) this.options.changed()
  }

  private expire(keys: readonly string[]): void {
    if (this.closed) return
    const tasks: OrphanTask[] = []
    for (const key of keys) {
      const wait = this.waits.get(key)
      if (!wait) continue
      this.waits.delete(key)
      const status = this.ends.get(wait.task) ?? null
      if (status === 'stopped') continue
      this.options.named.add(key)
      tasks.push({
        id: wait.task,
        description: this.records.get(wait.task)?.description ?? '',
        owner: wait.owner,
        ownerDescription: this.records.get(wait.owner)?.description ?? '',
        status,
        output: this.outputs.get(wait.task) ?? null,
      })
    }
    if (tasks.length) {
      this.options.saveNamed()
      const uuid = this.options.deliver(orphanNote(tasks))
      if (uuid) this.sent.add(uuid)
    }
    this.options.changed()
  }
}
