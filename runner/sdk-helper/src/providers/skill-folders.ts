import { readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { findSkillFolders } from '../../../../src/shared/skill-folders'
import type { ProviderOptions } from './types'

type FolderOptions = Pick<ProviderOptions, 'orgSkills' | 'warn'>

export async function orgSkillFolders(options: FolderOptions) {
  const directory = options.orgSkills?.directory
  if (!directory) return []
  const paths: string[] = []
  const walk = async (folder: string): Promise<void> => {
    for (const entry of await readdir(join(directory, folder), {
      withFileTypes: true,
    })) {
      if (entry.name === '.git') continue
      const path = folder ? `${folder}/${entry.name}` : entry.name
      if (entry.isDirectory()) await walk(path)
      else if (entry.isFile() || entry.isSymbolicLink()) paths.push(path)
    }
  }
  await walk('')
  const { skills, clashes } = findSkillFolders(paths, basename(directory))
  for (const clash of clashes)
    options.warn(
      `The org skill ${clash.name} uses ${clash.keptPath}. The duplicate ${clash.skippedPath} will not load.`,
    )
  return skills.map((skill) => ({
    ...skill,
    path: join(directory, skill.path),
  }))
}
