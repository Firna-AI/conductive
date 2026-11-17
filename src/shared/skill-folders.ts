interface SkillFolder {
  name: string
  path: string
}

export interface SkillFolderClash {
  name: string
  keptPath: string
  skippedPath: string
}

interface SkillFolders {
  skills: SkillFolder[]
  clashes: SkillFolderClash[]
}

export function isSkillsRepository(value: string): boolean {
  const parts = value.split('/')
  if (parts.length !== 2) return false
  const [owner, name] = parts
  return (
    !/\s/.test(value) &&
    owner.length <= 39 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(owner) &&
    name.length <= 100 &&
    /^[a-z0-9_.-]+$/i.test(name) &&
    name !== '.' &&
    !name.includes('..')
  )
}

/** Save removes surrounding whitespace and converts valid GitHub links. */
export function normalizeSkillsRepository(value: string): string {
  const trimmed = value.trim()
  const link = /^https:\/\/github\.com\/([^/?#]+)\/([^/?#]+)/i.exec(trimmed)
  if (!link) return trimmed
  const name = `${link[1]}/${link[2].replace(/\.git$/i, '')}`
  return isSkillsRepository(name) ? name : trimmed
}

/** Paths are relative to the repository. A root skill uses the path `.`. */
export function findSkillFolders(
  paths: readonly string[],
  repositoryName: string,
): SkillFolders {
  const layout = paths.some((path) => path.startsWith('skills/'))
    ? 'skills'
    : paths.includes('SKILL.md')
      ? 'root'
      : 'top-level'
  if (layout === 'root')
    return { skills: [{ name: repositoryName, path: '.' }], clashes: [] }
  const candidates = [...new Set(paths)]
    .filter((path) => !path.split('/').includes('.git'))
    .filter((path) => {
      const parts = path.split('/')
      return (
        parts.at(-1) === 'SKILL.md' &&
        (layout === 'skills'
          ? parts[0] === 'skills' && parts.length > 2
          : parts.length === 2)
      )
    })
    .map((path) => path.slice(0, -'/SKILL.md'.length))
    .sort()
  const folders = new Set<string>()
  const byName = new Map<string, SkillFolder>()
  const clashes: SkillFolderClash[] = []
  for (const path of candidates) {
    const parts = path.split('/')
    if (parts.some((_, index) => folders.has(parts.slice(0, index).join('/'))))
      continue
    folders.add(path)
    const name = parts[parts.length - 1]
    const previous = byName.get(name)
    if (previous)
      clashes.push({ name, keptPath: previous.path, skippedPath: path })
    else byName.set(name, { name, path })
  }
  return {
    skills: [...byName.values()].sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    ),
    clashes,
  }
}
