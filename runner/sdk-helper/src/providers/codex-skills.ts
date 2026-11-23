import { readdir, realpath, stat } from 'node:fs/promises'
import { join } from 'node:path'

import type { ProviderLifetime } from './lifetime'
import { prepareSkillView } from './skill-view'
import type { ProviderOptions } from './types'

async function nestedSkills(root: string): Promise<string[]> {
  const paths: string[] = []
  const visited = new Set<string>()
  const walk = async (directory: string): Promise<void> => {
    const target = await realpath(directory)
    if (visited.has(target)) return
    visited.add(target)
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === '.git') continue
      const path = join(directory, entry.name)
      if (entry.name === 'SKILL.md' && directory !== root) paths.push(path)
      if (
        entry.isDirectory() ||
        (entry.isSymbolicLink() && (await stat(path)).isDirectory())
      )
        await walk(path)
    }
  }
  await walk(root)
  return paths.sort()
}

export async function prepareCodexSkills(
  options: ProviderOptions,
  lifetime: ProviderLifetime,
) {
  try {
    const view = await prepareSkillView(options, 'codex', lifetime)
    if (!view) return { extraRoots: [], args: [], inputs: new Map() }
    const selected = view.skills
    const disabled = (
      await Promise.all(selected.map((skill) => nestedSkills(skill.path)))
    ).flat()
    return {
      extraRoots: selected.map((skill) => skill.path),
      inputs: new Map(
        selected.map((skill) => [
          skill.shownName,
          join(skill.path, 'SKILL.md'),
        ]),
      ),
      args: disabled.length
        ? [
            '-c',
            `skills.config=[${disabled.map((path) => `{path=${JSON.stringify(path)},enabled=false}`).join(',')}]`,
          ]
        : [],
    }
  } catch {
    options.warn(
      'The org skills could not be prepared. The turn will continue.',
    )
    return { extraRoots: [], args: [], inputs: new Map() }
  }
}
