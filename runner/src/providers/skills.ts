import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  readdir,
  rm,
  stat,
  symlink,
} from 'node:fs/promises'
import { basename, join } from 'node:path'

import type { Agent } from '../../../src/shared/agents'
import type { SkillFolders } from '../skills-repository'
import type { ProviderLifetime } from './lifetime'
import type { ProviderOptions } from './types'

/** A scalar skill name can differ from the name of its folder. */
async function names(path: string): Promise<string[]> {
  const content = await readFile(join(path, 'SKILL.md'), 'utf8')
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(content)?.[1]
  const name = /^name:\s*(.*?)\s*$/mu
    .exec(frontmatter ?? '')?.[1]
    .replace(/\s+#.*$/u, '')
    .replace(/^['"]|['"]$/gu, '')
  return name ? [basename(path), name] : [basename(path)]
}

async function repositoryNames(
  cwd: string,
  agent: Agent,
): Promise<Set<string>> {
  const result = new Set<string>()
  const visited = new Set<string>()
  const walk = async (directory: string): Promise<void> => {
    const info = await stat(directory).catch((error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
        return null
      throw error
    })
    if (!info?.isDirectory()) return
    const target = await realpath(directory)
    if (visited.has(target)) return
    visited.add(target)
    const entries = await readdir(directory, { withFileTypes: true }).catch(
      (error: unknown) => {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        )
          return []
        throw error
      },
    )
    if (
      entries.some(
        (entry) =>
          entry.name === 'SKILL.md' &&
          (entry.isFile() || entry.isSymbolicLink()),
      )
    ) {
      for (const name of await names(directory)) result.add(name)
      if (agent === 'claude') return
    }
    for (const entry of entries)
      if (
        entry.name !== '.git' &&
        (entry.isDirectory() || entry.isSymbolicLink())
      )
        await walk(join(directory, entry.name))
  }
  for (const folder of agent === 'claude' ? ['.claude'] : ['.agents', '.codex'])
    await walk(join(cwd, folder, 'skills'))
  return result
}

export async function selectAgentSkills(
  options: ProviderOptions,
  agent: Agent,
): Promise<SkillFolders> {
  if (!options.skillFolders?.length) return []
  const local = await repositoryNames(options.cwd, agent)
  const selected = []
  for (const skill of options.skillFolders) {
    if ((await names(skill.path)).some((name) => local.has(name))) {
      options.warn(
        `The workspace skill ${skill.name} takes precedence. The org skill will not load.`,
      )
    } else selected.push(skill)
  }
  return selected
}

/** The extra directory has skills only, with no repository settings or rules. */
export async function prepareClaudeSkills(
  options: ProviderOptions,
  lifetime: ProviderLifetime,
): Promise<string | null> {
  if (!options.skillFolders?.length) return null
  const preparation = (async () => {
    const selected = await selectAgentSkills(options, 'claude')
    if (!selected.length) return null
    const parent = join(options.home, '.conductive', 'skill-sessions')
    await mkdir(parent, { recursive: true })
    const directory = await mkdtemp(join(parent, 'turn-'))
    try {
      const skills = join(directory, '.claude', 'skills')
      await mkdir(skills, { recursive: true })
      for (const skill of selected)
        await symlink(skill.path, join(skills, skill.name), 'dir')
      return directory
    } catch (error) {
      await rm(directory, { recursive: true, force: true })
      throw error
    }
  })()
  lifetime.registerCleanup(async () => {
    const directory = await preparation.catch(() => null)
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  try {
    return await preparation
  } catch {
    options.warn(
      'The org skills could not be prepared. The turn will continue.',
    )
    return null
  }
}
