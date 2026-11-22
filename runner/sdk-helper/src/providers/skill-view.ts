import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { basename, dirname, join, relative, sep } from 'node:path'

import type { Agent } from '../generated/Agent'
import type { ProviderLifetime } from './lifetime'
import { isTrustedOrgSkills } from './org-skills'
import { safeSkillContent, safeSkillSidecar } from './skill-metadata'
import { selectAgentSkills } from './skills'
import type { ProviderOptions } from './types'

async function replaceMetadata(
  path: string,
  text: (content: string) => string,
) {
  const info = await lstat(path).catch((error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return null
    throw error
  })
  if (!info || (!info.isFile() && !info.isSymbolicLink())) return
  const safe = text(await readFile(path, 'utf8'))
  if (info.isSymbolicLink()) await rm(path)
  await writeFile(path, safe)
}

async function exportSkills(
  source: string,
  destination: string,
  agent: Agent,
  trustedClaudeBody: boolean,
) {
  await cp(source, destination, {
    recursive: true,
    verbatimSymlinks: true,
    filter: (path) => !relative(source, path).split(sep).includes('.git'),
  })
  // The runner closes source links before publication. Map each target into
  // the view: a link can leave the root and re-enter through its parent names.
  const sourceRoot = await realpath(source)
  const mapLinks = async (folder: string): Promise<void> => {
    for (const entry of await readdir(join(source, folder), {
      withFileTypes: true,
    })) {
      if (entry.name === '.git') continue
      const path = join(folder, entry.name)
      if (entry.isDirectory()) await mapLinks(path)
      else if (entry.isSymbolicLink()) {
        const target = await realpath(join(source, path))
        const mapped = join(destination, relative(sourceRoot, target))
        const link = join(destination, path)
        await rm(link)
        await symlink(relative(dirname(link), mapped) || '.', link)
      }
    }
  }
  await mapLinks('')
  const walk = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true })
    if (entries.some((entry) => entry.name === 'SKILL.md')) {
      await replaceMetadata(join(directory, 'SKILL.md'), (content) =>
        safeSkillContent(content, directory, agent, trustedClaudeBody),
      )
      await replaceMetadata(
        join(directory, 'agents', 'openai.yaml'),
        safeSkillSidecar,
      )
    }
    for (const entry of entries)
      if (entry.isDirectory()) await walk(join(directory, entry.name))
  }
  await walk(destination)
}

export async function prepareSkillView(
  options: ProviderOptions,
  agent: Agent,
  lifetime: ProviderLifetime,
) {
  const source = options.orgSkills?.directory
  if (!source) return null
  const preparation = (async () => {
    const selected = await selectAgentSkills(options, agent)
    if (!selected.length) return null
    const parent = join(options.home, '.conductive', 'skill-sessions')
    await mkdir(parent, { recursive: true })
    const directory = await mkdtemp(join(parent, 'turn-'))
    try {
      const repository = join(directory, 'repository', basename(source))
      await exportSkills(
        source,
        repository,
        agent,
        isTrustedOrgSkills(options.orgSkills),
      )
      const skills = selected.map((skill) => ({
        ...skill,
        path: join(repository, relative(source, skill.path)),
      }))
      const claudeDirectory =
        agent === 'claude' ? join(directory, 'discovery') : null
      if (claudeDirectory) {
        const links = join(claudeDirectory, '.claude', 'skills')
        await mkdir(links, { recursive: true })
        for (const skill of skills)
          await symlink(skill.path, join(links, skill.alias), 'dir')
      }
      return { directory, skills, claudeDirectory }
    } catch (error) {
      await rm(directory, { recursive: true, force: true })
      throw error
    }
  })()
  lifetime.registerCleanup(async () => {
    const view = await preparation.catch(() => null)
    if (!view) return
    await rm(view.directory, { recursive: true, force: true }).catch(() => {
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
