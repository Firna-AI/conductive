import { mkdir, symlink } from 'node:fs/promises'
import { join } from 'node:path'

import type { ProviderLifetime } from './lifetime'
import { prepareSkillView } from './skill-view'
import type { ProviderOptions } from './types'

export async function prepareClaudeSkills(
  options: ProviderOptions,
  lifetime: ProviderLifetime,
): Promise<string | null> {
  const view = await prepareSkillView(options, 'claude', lifetime)
  if (!view) return null
  try {
    const skills = join(view.directory, '.claude', 'skills')
    await mkdir(skills, { recursive: true })
    for (const skill of view.skills)
      await symlink(skill.path, join(skills, skill.name), 'dir')
    return view.directory
  } catch {
    options.warn(
      'The org skills could not be prepared. The turn will continue.',
    )
    return null
  }
}
