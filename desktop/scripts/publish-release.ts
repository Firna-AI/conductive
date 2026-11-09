import { join } from 'node:path'

import { selectReleaseFiles } from './publish-assets.ts'

const REPOSITORY = 'Firna-AI/remote-code'

export interface PublishDependencies {
  run(program: string, args: string[]): Promise<{ stdout: string }>
  list(directory: string): Promise<string[]>
  read(path: string): Promise<string>
  size(path: string): Promise<number>
  warn(message: string): void
}

export async function publishRelease(
  release: { tag: string; version: string; directory: string },
  dependencies: PublishDependencies,
): Promise<'published' | 'unchanged'> {
  const { tag, version, directory } = release
  if (tag !== `v${version}` || !/^\d+\.\d+\.\d+$/.test(version))
    throw new Error('The release tag must match its full release version')
  const api = async (path: string) => {
    const { stdout } = await dependencies.run('gh', [
      'api',
      '--paginate',
      '--slurp',
      `repos/${REPOSITORY}/${path}?per_page=100`,
    ])
    const pages: unknown = JSON.parse(stdout)
    if (!Array.isArray(pages) || pages.some((page) => !Array.isArray(page)))
      throw new Error('GitHub did not return release pages')
    const entries: unknown[] = pages.flat()
    return entries
  }
  const releases = (await api('releases')).map(parseRelease)
  const matching = releases.filter((candidate) => candidate.tag === tag)
  if (matching.some((candidate) => !candidate.draft)) {
    dependencies.warn(
      `Release ${tag} is already published; leaving it unchanged.`,
    )
    return 'unchanged'
  }
  const draft = matching.find((candidate) => candidate.draft)
  if (!draft) throw new Error(`No draft release exists for ${tag}`)

  const names = selectReleaseFiles(
    await dependencies.read(join(directory, 'latest-mac.yml')),
    version,
    await dependencies.list(directory),
  )
  const files = await Promise.all(
    names.map(async (name) => ({
      name,
      path: join(directory, name),
      size: await dependencies.size(join(directory, name)),
    })),
  )
  await dependencies.run('gh', [
    'release',
    'upload',
    tag,
    '--repo',
    REPOSITORY,
    '--clobber',
    ...files.map((file) => file.path),
  ])
  const assets = (await api(`releases/${draft.id}/assets`)).map(parseAsset)
  for (const file of files) {
    const asset = assets.find((candidate) => candidate.name === file.name)
    if (!asset || asset.size !== file.size || asset.state !== 'uploaded')
      throw new Error(
        `GitHub has not uploaded the complete asset: ${file.name}`,
      )
  }
  await dependencies.run('gh', [
    'release',
    'edit',
    tag,
    '--repo',
    REPOSITORY,
    '--draft=false',
    '--latest',
  ])
  return 'published'
}
function parseRelease(value: unknown): {
  id: number
  tag: string
  draft: boolean
} {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('id' in value) ||
    typeof value.id !== 'number' ||
    !('tag_name' in value) ||
    typeof value.tag_name !== 'string' ||
    !('draft' in value) ||
    typeof value.draft !== 'boolean'
  )
    throw new Error('GitHub returned an invalid release')
  return { id: value.id, tag: value.tag_name, draft: value.draft }
}

function parseAsset(value: unknown): {
  name: string
  size: number
  state: string
} {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('name' in value) ||
    typeof value.name !== 'string' ||
    !('size' in value) ||
    typeof value.size !== 'number' ||
    !('state' in value) ||
    typeof value.state !== 'string'
  )
    throw new Error('GitHub returned an invalid asset')
  return { name: value.name, size: value.size, state: value.state }
}
