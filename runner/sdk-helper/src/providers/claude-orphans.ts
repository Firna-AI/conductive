import { orphanNote, type OrphanTask } from './claude-orphan-note'

/**
 * The grace time after the work of a parked subagent ends. The agent program
 * wakes such a subagent itself, and retries a failed wake for about a minute.
 */
const ORPHAN_GRACE_MS = 120_000

/** One entry of `system/background_tasks_changed`. */
export interface ListedTask {
  id: string
  runId: string
  type: string
  description: string
  owner: string | null
}

interface TaskRecord {
  description: string
  owner: string | null
  runId: string
  subagent: boolean
}

interface Ending {
  status: 'completed' | 'failed' | 'stopped'
  output: string | null
}

interface Wait {
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
  /** A result answered the note with this UUID. */
  settled: (uuid: string) => void
  changed: () => void
}

/** One run of one task. A resumed task keeps its ID and gets a new run. */
function runKey(task: string, run: string): string {
  return `${task}:${run}`
}

/**
 * Finds work that ended while the subagent that started it was not live.
 * The result of such work reaches only that subagent. The turn stays open
 * for the grace time, so that the program can wake the subagent. When the
 * subagent does not run again, the main agent gets one note for each run.
 */
export class ClaudeOrphans {
  private readonly records = new Map<string, TaskRecord>()
  private readonly ends = new Map<string, Ending>()
  private readonly agents = new Map<string, string>()
  private readonly waits = new Map<string, Wait>()
  private readonly sent = new Set<string>()
  private readonly options: ClaudeOrphanOptions
  private closed = false

  constructor(options: ClaudeOrphanOptions) {
    this.options = options
  }

  /** True while a grace time runs or while a note waits for its reply. */
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
      const status = input.status
      if (
        input.subtype === 'task_notification' &&
        (status === 'completed' || status === 'failed' || status === 'stopped')
      )
        this.ends.set(
          runKey(id, typeof input.run_id === 'string' ? input.run_id : ''),
          {
            status,
            output:
              typeof input.output_file === 'string' ? input.output_file : null,
          },
        )
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
        subagent: task.type === 'local_agent' || record?.subagent === true,
      })
      this.resolve(task.id)
    }
    for (const id of before) {
      if (!now.has(id)) this.ended(id, now)
    }
  }

  /** Clears each note that a result answered. */
  answered(uuids: readonly string[]): void {
    let changed = false
    for (const uuid of uuids) {
      if (!this.sent.delete(uuid)) continue
      this.options.settled(uuid)
      changed = true
    }
    if (changed) this.options.changed()
  }

  close(): void {
    this.closed = true
    for (const wait of this.waits.values()) clearTimeout(wait.timer)
    this.waits.clear()
    this.sent.clear()
  }

  private ended(id: string, now: ReadonlySet<string>): void {
    const record = this.records.get(id)
    // The program sends the result of a subagent to the main agent, or to
    // the agent that resumed it, so only other tasks can lose their result.
    if (!record || record.subagent) return
    const owner = record.owner
    if (!owner || now.has(owner) || !this.records.has(owner)) return
    const key = runKey(id, record.runId)
    if (this.ends.get(key)?.status === 'stopped') return
    if (this.options.named.has(`orphan:${key}`) || this.waits.has(key)) return
    const timer = setTimeout(() => this.expire(key), ORPHAN_GRACE_MS)
    this.waits.set(key, { task: id, owner, timer })
  }

  private resolve(owner: string): void {
    let changed = false
    for (const [key, wait] of this.waits) {
      if (wait.owner !== owner) continue
      clearTimeout(wait.timer)
      this.waits.delete(key)
      changed = true
    }
    if (changed) this.options.changed()
  }

  private expire(key: string): void {
    const wait = this.waits.get(key)
    if (this.closed || !wait) return
    this.waits.delete(key)
    const ending = this.ends.get(key)
    const status = ending?.status ?? null
    if (status !== 'stopped') {
      this.options.named.add(`orphan:${key}`)
      this.options.saveNamed()
      const task: OrphanTask = {
        id: wait.task,
        description: this.records.get(wait.task)?.description ?? '',
        owner: wait.owner,
        ownerDescription: this.records.get(wait.owner)?.description ?? '',
        status,
        output: ending?.output ?? null,
      }
      const uuid = this.options.deliver(orphanNote(task))
      if (uuid) this.sent.add(uuid)
    }
    this.options.changed()
  }
}
