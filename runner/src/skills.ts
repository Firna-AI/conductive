import type { Agent } from '../../src/shared/agents'
import type { RunnerSkillsUpdated } from '../../src/shared/skills'
import { startProcess, type StartProcess } from './providers/process'
import { SerialQueue } from './serial-queue'
import { CODEX_SKILLS_TIMEOUT_MS, listCodexSkills } from './skill-codex'
import {
  claudeSkillFiles,
  codexSkillFiles,
  type SkillFiles,
} from './skill-files'
import { readClaudeSkill, readCodexSkill, type FoundSkill } from './skill-read'
import {
  budgetSkillLists,
  skillEntries,
  skillsEvent,
  type SkillEntry,
} from './skill-report'

/** A repository change asks the Codex app server again after this time. */
const CODEX_SKILLS_REASK_MS = 30_000

/** The current skill list of each agent, with the path of each `SKILL.md`. */
export class SkillLists {
  private lists: Record<Agent, readonly SkillEntry[]> = {
    claude: [],
    codex: [],
  }

  /** The skills of the last report of one agent, in name order. */
  of(agent: Agent): readonly SkillEntry[] {
    return this.lists[agent]
  }

  replace(lists: Record<Agent, readonly SkillEntry[]>): void {
    this.lists = lists
  }
}

export interface SkillReporterOptions {
  /** The lists that the agent providers read. */
  lists: SkillLists
  /** Tests start a fake Codex app server. */
  start?: StartProcess
  timeoutMs?: number
}

interface SkillReporterContext extends SkillReporterOptions {
  repository: string
  home: string
  now: () => number
  /** Removes known credentials from a name or a description. */
  filter: (text: string) => string
  emit: (event: RunnerSkillsUpdated, commandId?: string) => Promise<void>
  warn: (message: string) => void
}

export interface SkillRefresh {
  /** Send the report also when no list changed. */
  full?: boolean
  /** Ask the Codex app server again, as after each connect. */
  reload?: boolean
  commandId?: string
}

export class SkillReporter {
  private readonly scans = new SerialQueue()
  private readonly context: SkillReporterContext
  private claude: { fingerprint: string | null; found: FoundSkill[] } = {
    fingerprint: null,
    found: [],
  }
  private codex: { fingerprint: string | null; found: FoundSkill[] } = {
    fingerprint: null,
    found: [],
  }
  private codexAskedAt: number | null = null
  private codexFallback = false
  private lastReport: string | null = null
  private warned = new Set<string>()
  private queued = false
  private stopped = false

  constructor(context: SkillReporterContext) {
    this.context = context
  }

  refresh(request: SkillRefresh = {}): Promise<void> {
    return this.scans.run(() => this.scan(request))
  }

  /** A repository change. Changes during a wait share one more scan. */
  changed(): void {
    if (this.stopped || this.queued) return
    this.queued = true
    void this.scans
      .run(() => {
        this.queued = false
        return this.scan({})
      })
      .catch(() => this.context.warn('The skill lists could not update.'))
  }

  async close(): Promise<void> {
    this.stopped = true
    await this.scans.run(async () => {})
  }

  private async scan(request: SkillRefresh): Promise<void> {
    if (this.stopped) return
    const warnings: string[] = []
    const warn = (message: string) => warnings.push(message)
    await this.scanClaude(warn)
    await this.scanCodex(request.reload === true, warn)
    if (this.stopped) return
    const { filter } = this.context
    const lists = budgetSkillLists(
      skillEntries('Claude', this.claude.found, filter, warn),
      skillEntries('Codex', this.codex.found, filter, warn),
      warn,
    )
    this.context.lists.replace(lists)
    for (const message of warnings)
      if (!this.warned.has(message)) this.context.warn(message)
    this.warned = new Set(warnings)
    const event = skillsEvent(lists.claude, lists.codex)
    const text = JSON.stringify(event)
    if (request.full || text !== this.lastReport) {
      await this.context.emit(event, request.commandId)
      this.lastReport = text
    }
  }

  private async scanClaude(warn: (message: string) => void): Promise<void> {
    const files = await this.files('Claude', claudeSkillFiles, warn)
    if (!files || files.fingerprint === this.claude.fingerprint) return
    this.claude = {
      fingerprint: files.fingerprint,
      found: await read(files, readClaudeSkill, warn),
    }
  }

  private async scanCodex(
    reload: boolean,
    warn: (message: string) => void,
  ): Promise<void> {
    const files = await this.files('Codex', codexSkillFiles, warn)
    const changed =
      files !== null && files.fingerprint !== this.codex.fingerprint
    const asked = this.codexAskedAt
    if (
      !reload &&
      !changed &&
      asked !== null &&
      this.context.now() - asked < CODEX_SKILLS_REASK_MS
    )
      return
    this.codexAskedAt = this.context.now()
    try {
      const found = await listCodexSkills({
        home: this.context.home,
        repository: this.context.repository,
        start: this.context.start ?? startProcess,
        timeoutMs: this.context.timeoutMs ?? CODEX_SKILLS_TIMEOUT_MS,
      })
      this.codex = { fingerprint: files?.fingerprint ?? null, found }
      this.codexFallback = false
    } catch {
      if (!this.codexFallback)
        this.context.warn(
          'The Codex app server did not list its skills. The Codex list uses a scan of the Codex skill folders.',
        )
      this.codexFallback = true
      if (!files) return
      this.codex = {
        fingerprint: files.fingerprint,
        found: await read(files, readCodexSkill, warn),
      }
    }
  }

  /** A failed scan of the folders keeps the last list of the agent. */
  private async files(
    agent: 'Claude' | 'Codex',
    scan: (repository: string) => Promise<SkillFiles>,
    warn: (message: string) => void,
  ): Promise<SkillFiles | null> {
    try {
      const files = await scan(this.context.repository)
      for (const message of files.warnings) warn(message)
      return files
    } catch {
      warn(
        `The ${agent} skill folders could not be read. The list keeps its last skills.`,
      )
      return null
    }
  }
}

async function read(
  files: SkillFiles,
  reader: typeof readClaudeSkill,
  warn: (message: string) => void,
): Promise<FoundSkill[]> {
  const found: FoundSkill[] = []
  for (const file of files.files) {
    const skill = await reader(file, warn)
    if (skill) found.push(skill)
  }
  return found
}
