import { readFile, realpath, readdir, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'

import type { Agent } from '../generated/Agent'
import { orgSkillFolders } from './skill-folders'
import type { ProviderOptions } from './types'

async function names(path: string): Promise<string[]> {
  const content = await readFile(join(path, 'SKILL.md'), 'utf8')
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(content)?.[1]
  const name = /^name:\s*(.*?)\s*$/mu
    .exec(frontmatter ?? '')?.[1]
    .replace(/\s+#.*$/u, '')
    .replace(/^['"]|['"]$/gu, '')
  return name ? [basename(path), name] : [basename(path)]
}

async function repositoryNames(cwd: string, agent: Agent) {
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
    const entries = await readdir(directory, { withFileTypes: true })
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
) {
  const skills = await orgSkillFolders(options)
  if (!skills.length) return []
  const local = await repositoryNames(options.cwd, agent)
  const selected: typeof skills = []
  for (const skill of skills) {
    if ((await names(skill.path)).some((name) => local.has(name))) {
      options.warn(
        `The workspace skill ${skill.name} takes precedence. The org skill will not load.`,
      )
    } else selected.push(skill)
  }
  return selected
}
