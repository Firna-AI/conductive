import { isRecord } from '../http'
import type { SelectedRepository } from './settings-data'

export interface RepositoryLocation {
  repositoryId: string
  directory: string
  variable: string
}

/** Old snapshots keep their original folders until a build moves all contents. */
export function legacyRepositoryDirectory(id: string): string {
  return `/home/user/conductive/repositories/${encodeURIComponent(id)}`
}

function safeFolder(value: string): string {
  const safe = value.replace(/[^a-zA-Z0-9._-]/gu, '-').slice(0, 100)
  return !safe || safe === '.' || safe === '..' ? 'repository' : safe
}

/** The captured set, rather than a live repository picker, owns every name. */
export function repositoryLocations(
  repositories: readonly SelectedRepository[],
): RepositoryLocation[] {
  const names = repositories.map((repository) => {
    const parts = repository.fullName.split('/')
    return {
      repositoryId: repository.id,
      owner: safeFolder(parts.slice(0, -1).join('-')),
      name: safeFolder(parts.at(-1) ?? ''),
    }
  })
  const used = new Set<string>()
  const variables = new Set<string>()
  return names
    .sort((left, right) =>
      left.repositoryId < right.repositoryId
        ? -1
        : left.repositoryId > right.repositoryId
          ? 1
          : 0,
    )
    .map((repository) => {
      const base =
        names.filter(
          (other) => other.name.toLowerCase() === repository.name.toLowerCase(),
        ).length > 1
          ? `${repository.owner}-${repository.name}`
          : repository.name
      let name = base
      let suffix = 1
      while (used.has(name.toLowerCase())) name = `${base}-${++suffix}`
      used.add(name.toLowerCase())
      const variableBase = name.replace(/[^a-zA-Z0-9_]/gu, '_').toUpperCase()
      let variable = variableBase
      suffix = 1
      while (variables.has(variable)) variable = `${variableBase}_${++suffix}`
      variables.add(variable)
      return {
        repositoryId: repository.repositoryId,
        directory: `/home/user/code/${name}`,
        variable: `CONDUCTIVE_REPOSITORY_${variable}_DIR`,
      }
    })
}

export function legacyRepositoryLocations(
  repositories: readonly SelectedRepository[],
): RepositoryLocation[] {
  return repositoryLocations(repositories).map((location) => ({
    ...location,
    directory: legacyRepositoryDirectory(location.repositoryId),
  }))
}

export function readRepositoryLocations(value: unknown): RepositoryLocation[] {
  if (!Array.isArray(value)) throw new Error('Invalid repository folders')
  const ids = new Set<string>()
  const directories = new Set<string>()
  const variables = new Set<string>()
  return value.map((entry: unknown) => {
    if (
      !isRecord(entry) ||
      typeof entry.repositoryId !== 'string' ||
      typeof entry.directory !== 'string' ||
      typeof entry.variable !== 'string' ||
      !/^CONDUCTIVE_REPOSITORY_[A-Z0-9_]+_DIR$/u.test(entry.variable) ||
      ((!/^\/home\/user\/code\/[a-zA-Z0-9._-]+$/u.test(entry.directory) ||
        ['.', '..'].includes(
          entry.directory.slice(entry.directory.lastIndexOf('/') + 1),
        )) &&
        entry.directory !== legacyRepositoryDirectory(entry.repositoryId)) ||
      ids.has(entry.repositoryId) ||
      directories.has(entry.directory) ||
      variables.has(entry.variable)
    )
      throw new Error('Invalid repository folder')
    ids.add(entry.repositoryId)
    directories.add(entry.directory)
    variables.add(entry.variable)
    return {
      repositoryId: entry.repositoryId,
      directory: entry.directory,
      variable: entry.variable,
    }
  })
}

export function capturedRepositoryLocations(
  json: string | null,
  repositories: readonly SelectedRepository[],
): RepositoryLocation[] {
  return json === null
    ? legacyRepositoryLocations(repositories)
    : readRepositoryLocations(JSON.parse(json))
}

export function repositoryLocation(
  locations: readonly RepositoryLocation[] | undefined,
  repositoryId: string,
): string {
  if (!locations) return legacyRepositoryDirectory(repositoryId)
  const location = locations.find(
    (entry) => entry.repositoryId === repositoryId,
  )
  if (!location) throw new Error('Missing captured repository folder')
  return location.directory
}

export function repositoryEnvironment(
  locations: readonly RepositoryLocation[],
): Record<string, string> {
  return Object.fromEntries(
    locations.map((location) => [location.variable, location.directory]),
  )
}
