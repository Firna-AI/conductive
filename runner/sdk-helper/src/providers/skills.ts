import { readFile, realpath, readdir, stat } from 'node:fs/promises'
import { basename, join, relative } from 'node:path'

import type { Agent } from '../generated/Agent'
import { orgSkillFolders } from './skill-folders'
import { isClaudeSkillAlias, skillMetadata } from './skill-metadata'
import type { ProviderOptions } from './types'

async function metadata(path: string, agent: Agent) {
  const content = await readFile(join(path, 'SKILL.md'), 'utf8')
  return skillMetadata(content, path, agent)
}

async function repositoryNames(options: OrgSkillOptions, agent: Agent) {
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
      const value = await metadata(directory, agent)
      for (const name of value.aliases) result.add(name)
      if (agent === 'claude') result.add(basename(directory))
      if (!value.name)
        options.warn(
          `The workspace skill ${relative(options.cwd, directory)} has no usable ${agent === 'claude' ? 'Claude' : 'Codex'} name. It will not take precedence.`,
        )
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
    await walk(join(options.cwd, folder, 'skills'))
  return result
}

/** What the choice of the org skills needs: the repository folder, the org skills, and a warning. */
export type OrgSkillOptions = Pick<
  ProviderOptions,
  'cwd' | 'orgSkills' | 'warn'
>

export async function selectAgentSkills(
  options: OrgSkillOptions,
  agent: Agent,
) {
  const skills = await orgSkillFolders(options)
  if (!skills.length) return []
  const local = await repositoryNames(options, agent)
  const selected: ((typeof skills)[number] & { shownName: string })[] = []
  const shown = new Map<string, string>()
  for (const skill of skills) {
    const value = await metadata(skill.path, agent)
    const path = relative(options.orgSkills?.directory ?? '', skill.path)
    if (!value.name) {
      options.warn(
        `The org skill ${path} has no usable ${agent === 'claude' ? 'Claude' : 'Codex'} name. It will not load.`,
      )
    } else if (value.aliases.some((name) => local.has(name))) {
      options.warn(
        `The workspace skill ${skill.name} takes precedence. The org skill will not load.`,
      )
    } else {
      const kept = shown.get(value.name)
      if (kept !== undefined)
        options.warn(
          `The org skill ${value.name} uses ${kept}. The duplicate ${path} will not load.`,
        )
      else {
        shown.set(value.name, path)
        selected.push({ ...skill, shownName: value.name })
      }
    }
  }
  const claimed = new Set([
    ...local,
    ...selected.map((skill) => skill.name),
    ...shown.keys(),
  ])
  let generated = 0
  return selected.map((skill) => {
    let alias = skill.name
    if (agent === 'claude' && !isClaudeSkillAlias(alias)) {
      do {
        alias = `conductive-org-skill-${++generated}`
      } while (claimed.has(alias))
      claimed.add(alias)
    }
    return { ...skill, alias }
  })
}
