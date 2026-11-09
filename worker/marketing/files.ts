import {
  SITE_FILE_LIST,
  SITE_FOLDER,
  type SiteFile,
} from '../../src/shared/site-build'
import type { AppEnv } from '../env'
import { isRecord } from '../http'

export type SiteAssets = NonNullable<AppEnv['ASSETS']>

type SiteFiles = ReadonlyMap<string, SiteFile>
const lists = new WeakMap<SiteAssets, Promise<SiteFiles>>()

function parseFile(value: unknown): SiteFile {
  if (!isRecord(value) || typeof value.path !== 'string')
    throw new Error('Invalid site file.')
  const path = value.path
  if (
    !/^[\w.-]+(?:\/[\w.-]+)*$/.test(path) ||
    path.split('/').some((part) => part === '.' || part === '..') ||
    path === SITE_FILE_LIST
  ) {
    throw new Error('Invalid site file path.')
  }
  if (!path.endsWith('.html')) {
    if (value.styleHashes !== undefined) throw new Error('Invalid site asset.')
    return { path }
  }
  const hashes: unknown = value.styleHashes
  if (
    !Array.isArray(hashes) ||
    !hashes.every(
      (hash): hash is string =>
        typeof hash === 'string' && /^[A-Za-z0-9+/]{43}=$/.test(hash),
    )
  ) {
    throw new Error('Invalid site style hashes.')
  }
  return { path, styleHashes: hashes }
}

/** A binding can belong to a different build, including each test's build. */
export function readSiteFiles(assets: SiteAssets): Promise<SiteFiles> {
  const cached = lists.get(assets)
  if (cached) return cached
  const pending = loadSiteFiles(assets).catch((error: unknown) => {
    lists.delete(assets)
    throw error
  })
  lists.set(assets, pending)
  return pending
}

async function loadSiteFiles(assets: SiteAssets): Promise<SiteFiles> {
  const response = await fetchSiteFile(
    assets,
    new Request(`https://site.invalid/${SITE_FOLDER}/${SITE_FILE_LIST}`),
  )
  const value: unknown = await response.json()
  if (!isRecord(value) || !Array.isArray(value.files))
    throw new Error('Invalid site file list.')
  const files = new Map<string, SiteFile>()
  for (const entry of value.files) {
    const file = parseFile(entry)
    if (files.has(file.path)) throw new Error('Duplicate site file.')
    files.set(file.path, file)
  }
  if (!files.has('index.html') || !files.has('404.html'))
    throw new Error('Missing site pages.')
  return files
}

export async function fetchSiteFile(
  assets: SiteAssets,
  request: Request,
): Promise<Response> {
  const response = await assets.fetch(request)
  if (response.status !== 200 && response.status !== 304)
    throw new Error('Site file unavailable.')
  return response
}
