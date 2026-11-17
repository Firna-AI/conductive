import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import { join } from 'node:path'

import type { ProviderLifetime } from './lifetime'
import { selectAgentSkills } from './skills'
import type { ProviderOptions } from './types'

export async function prepareClaudeSkills(
  options: ProviderOptions,
  lifetime: ProviderLifetime,
): Promise<string | null> {
  if (!options.skillsDirectory) return null
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
    if (!directory) return
    await rm(directory, { recursive: true, force: true }).catch(() => {
      options.warn('The temporary org skills folder could not be removed.')
    })
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
