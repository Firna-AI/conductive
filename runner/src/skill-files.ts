import { readdir, stat } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

const SKILL_FILE = 'SKILL.md'
/** Codex scans its skill folders to this depth. */
const CODEX_MAX_DEPTH = 6
/** A scan of the Codex folders stops after this many folder entries. */
const CODEX_MAX_ENTRIES = 4096

/** One `SKILL.md` that a scan found. */
export interface SkillFile {
  /** The absolute path of the `SKILL.md`. */
  path: string
  /** The name of the folder that holds it. */
  folder: string
  /** Its size, times, and inode, or the code of its failed stat. */
  signature: string
}

/** The `SKILL.md` files of one agent's folders, in a stable order. */
export interface SkillFiles {
  files: readonly SkillFile[]
  /** Equal for two scans that found the same files with the same stats. */
  fingerprint: string
  warnings: readonly string[]
}

function claudeSkillFolder(repository: string): string {
  return join(repository, '.claude', 'skills')
}

function codexSkillFolders(repository: string): readonly string[] {
  return [
    join(repository, '.agents', 'skills'),
    join(repository, '.codex', 'skills'),
  ]
}

/** Each `<folder>/SKILL.md` one level below the Claude folder, as Claude loads them. */
export async function claudeSkillFiles(
  repository: string,
): Promise<SkillFiles> {
  const root = claudeSkillFolder(repository)
  const entries = await entriesOf(root)
  const found = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .map((entry) => skillFile(join(root, entry.name, SKILL_FILE))),
  )
  return result(
    found.filter((file) => file !== null),
    [],
  )
}

/** Each `SKILL.md` below the Codex folders, without hidden folders, as Codex scans. */
export async function codexSkillFiles(repository: string): Promise<SkillFiles> {
  const files: SkillFile[] = []
  const warnings: string[] = []
  const budget = { entries: CODEX_MAX_ENTRIES }
  for (const root of codexSkillFolders(repository))
    await walk(root, 0, files, warnings, budget)
  return result(files, warnings)
}

async function walk(
  folder: string,
  depth: number,
  files: SkillFile[],
  warnings: string[],
  budget: { entries: number },
): Promise<void> {
  let entries
  try {
    entries = await entriesOf(folder)
  } catch (error) {
    if (depth === 0) throw error
    warnings.push(`The skill folder ${folder} could not be read.`)
    return
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (--budget.entries < 0) {
      if (budget.entries === -1)
        warnings.push('The Codex skill folders hold too many entries to scan.')
      return
    }
    const path = join(folder, entry.name)
    if (entry.name === SKILL_FILE) {
      const file = await skillFile(path)
      if (file) files.push(file)
      continue
    }
    if (depth >= CODEX_MAX_DEPTH) continue
    if (entry.isDirectory())
      await walk(path, depth + 1, files, warnings, budget)
    else if (entry.isSymbolicLink() && (await isFolder(path)))
      await walk(path, depth + 1, files, warnings, budget)
  }
}

/** The entries of a folder by name. A missing folder has none. */
async function entriesOf(folder: string) {
  try {
    const entries = await readdir(folder, { withFileTypes: true })
    return entries.sort((left, right) => compare(left.name, right.name))
  } catch (error) {
    if (missing(error)) return []
    throw error
  }
}

async function isFolder(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

async function skillFile(path: string): Promise<SkillFile | null> {
  const folder = basename(dirname(path))
  try {
    const stats = await stat(path)
    if (stats.isDirectory()) return null
    return {
      path,
      folder,
      signature: `${stats.size}:${stats.mtimeMs}:${stats.ctimeMs}:${stats.ino}`,
    }
  } catch (error) {
    if (missing(error)) return null
    return { path, folder, signature: `error:${code(error)}` }
  }
}

function result(files: SkillFile[], warnings: string[]): SkillFiles {
  return {
    files,
    fingerprint: JSON.stringify(
      files.map((file) => [file.path, file.signature]),
    ),
    warnings,
  }
}

function missing(error: unknown): boolean {
  const value = code(error)
  return value === 'ENOENT' || value === 'ENOTDIR'
}

function code(error: unknown): string {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
    ? error.code
    : 'unknown'
}

/** Orders by UTF-16 code units, the same on every machine and locale. */
export function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
