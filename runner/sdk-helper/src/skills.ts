import type { HelperSkillLists } from './generated/HelperSkillLists'
import type { SkillEntry } from './generated/SkillEntry'
import { startProcess, type StartProcess } from './providers/process'
import { CODEX_SKILLS_TIMEOUT_MS, listCodexSkills } from './skill-codex'
import {
  claudeSkillFiles,
  codexSkillFiles,
  type SkillFiles,
} from './skill-files'
import { readClaudeSkill, readCodexSkill } from './skill-read'

const CODEX_SKILLS_REASK_MS = 30_000

export interface SkillScannerContext {
  repository: string
  home: string
  now: () => number
  warn: (message: string) => void
  start?: StartProcess
  timeoutMs?: number
}

/** Reads agent metadata. The Rust runner owns schedules, filtering and reports. */
export class SkillScanner {
  private claude: { fingerprint: string | null; found: SkillEntry[] } = {
    fingerprint: null,
    found: [],
  }
  private codex: { fingerprint: string | null; found: SkillEntry[] } = {
    fingerprint: null,
    found: [],
  }
  private codexAskedAt: number | null = null
  private codexFallback = false
  private warned = new Set<string>()

  private readonly context: SkillScannerContext

  constructor(context: SkillScannerContext) {
    this.context = context
  }

  async scan(reload = false): Promise<HelperSkillLists> {
    const warnings: string[] = []
    const warn = (message: string) => warnings.push(message)
    await this.scanClaude(warn)
    await this.scanCodex(reload, warn)
    for (const message of warnings)
      if (!this.warned.has(message)) this.context.warn(message)
    this.warned = new Set(warnings)
    return { claude: this.claude.found, codex: this.codex.found }
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
): Promise<SkillEntry[]> {
  const found: SkillEntry[] = []
  for (const file of files.files) {
    const skill = await reader(file, warn)
    if (skill) found.push(skill)
  }
  return found
}
