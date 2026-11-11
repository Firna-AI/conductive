import { isRecord } from '../../http'
import type { SourceRepository } from './data'

export interface MetadataRepository {
  sourceIndex: number
  githubRepositoryId: number
}

export interface MetadataBatch {
  installationId: number
  repositories: readonly MetadataRepository[]
}

/** Pin installation and source indexes before the first token is minted. */
export function metadataPlan(
  sources: readonly (SourceRepository & { sourceIndex: number })[],
): MetadataBatch[] {
  const groups = new Map<number, MetadataRepository[]>()
  for (const source of sources) {
    const group = groups.get(source.installationId) ?? []
    group.push({
      sourceIndex: source.sourceIndex,
      githubRepositoryId: source.githubRepositoryId,
    })
    groups.set(source.installationId, group)
  }
  const batches: MetadataBatch[] = []
  for (const [installationId, repositories] of groups)
    for (let index = 0; index < repositories.length; index += 500)
      batches.push({
        installationId,
        repositories: repositories.slice(index, index + 500),
      })
  return batches
}

export function readMetadataPlan(text: string): MetadataBatch[] {
  const value: unknown = JSON.parse(text)
  if (!Array.isArray(value)) throw new Error('Invalid metadata ownership')
  const batches: MetadataBatch[] = []
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.installationId !== 'number' ||
      !Number.isSafeInteger(item.installationId) ||
      item.installationId <= 0 ||
      !Array.isArray(item.repositories)
    )
      throw new Error('Invalid metadata ownership')
    const repositories: MetadataRepository[] = []
    for (const source of item.repositories) {
      if (
        !isRecord(source) ||
        typeof source.sourceIndex !== 'number' ||
        !Number.isSafeInteger(source.sourceIndex) ||
        source.sourceIndex < 0 ||
        typeof source.githubRepositoryId !== 'number' ||
        !Number.isSafeInteger(source.githubRepositoryId) ||
        source.githubRepositoryId <= 0
      )
        throw new Error('Invalid metadata ownership')
      repositories.push({
        sourceIndex: source.sourceIndex,
        githubRepositoryId: source.githubRepositoryId,
      })
    }
    batches.push({ installationId: item.installationId, repositories })
  }
  return batches
}
