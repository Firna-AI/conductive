import type { ImportLfsObject } from '../../src/shared/conductor-import-lfs.ts'
import type { HttpFetch } from '../env'
import { githubFailure, object, text } from '../github/parsers'
import { githubJson } from '../github/transport'

function downloadAction(value: unknown, now: number) {
  const action = object(value)
  const url = new URL(text(action.href))
  if (url.protocol !== 'https:' || url.username || url.password || url.hash)
    throw githubFailure()
  if (action.header !== undefined) {
    const headers = new Headers()
    for (const [name, value] of Object.entries(object(action.header)))
      headers.append(name, text(value))
  }
  if (action.expires_in !== undefined) {
    if (
      typeof action.expires_in !== 'number' ||
      !Number.isSafeInteger(action.expires_in) ||
      action.expires_in <= 0
    )
      throw githubFailure()
  } else if (action.expires_at !== undefined) {
    const timestamp = text(action.expires_at)
    const expires = Date.parse(timestamp)
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        timestamp,
      ) ||
      !Number.isFinite(expires) ||
      expires <= now
    )
      throw githubFailure()
  }
}

function batchResult(
  value: unknown,
  requested: readonly ImportLfsObject[],
  now: number,
) {
  const response = object(value)
  if (
    (response.transfer !== undefined && response.transfer !== 'basic') ||
    (response.hash_algo !== undefined && response.hash_algo !== 'sha256') ||
    !Array.isArray(response.objects)
  )
    throw githubFailure()
  const expected = new Map(requested.map((entry) => [entry.oid, entry]))
  const availability = new Map<string, boolean>()
  for (const value of response.objects) {
    const entry = object(value)
    const oid = text(entry.oid)
    const match = expected.get(oid)
    if (!match || match.sizeBytes !== entry.size || availability.has(oid))
      throw githubFailure()
    if (
      entry.authenticated !== undefined &&
      typeof entry.authenticated !== 'boolean'
    )
      throw githubFailure()
    const actions = entry.actions === undefined ? {} : object(entry.actions)
    if (entry.error !== undefined) {
      const error = object(entry.error)
      if (
        (error.code !== 404 && error.code !== 410) ||
        Object.keys(actions).length !== 0
      )
        throw githubFailure()
      text(error.message)
      availability.set(oid, false)
    } else {
      if (Object.keys(actions).some((kind) => kind !== 'download'))
        throw githubFailure()
      downloadAction(actions.download, now)
      availability.set(oid, true)
    }
  }
  if (availability.size !== expected.size) throw githubFailure()
  return availability
}

/** Reads advertisement only. Download actions and headers never leave this function. */
export async function readLfsBatch(
  fetch: HttpFetch,
  fullName: string,
  token: string,
  objects: readonly ImportLfsObject[],
  now: () => number,
) {
  try {
    const components = fullName.split('/')
    if (
      components.length !== 2 ||
      components.some(
        (part) => !/^[\w.-]+$/.test(part) || part === '.' || part === '..',
      )
    )
      throw githubFailure()
    const path = `/${components.map(encodeURIComponent).join('/')}.git/info/lfs/objects/batch`
    const request = new Request(`https://github.com${path}`, {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
      headers: {
        Accept: 'application/vnd.git-lfs+json',
        'Content-Type': 'application/vnd.git-lfs+json',
        Authorization: `Basic ${btoa(`x-access-token:${token}`)}`,
        'User-Agent': 'Conductive',
      },
      body: JSON.stringify({
        operation: 'download',
        transfers: ['basic'],
        hash_algo: 'sha256',
        objects: objects.map(({ oid, sizeBytes }) => ({
          oid,
          size: sizeBytes,
        })),
      }),
    })
    const value = await githubJson(async (request) => {
      const response = await fetch(request)
      if (
        response.status !== 200 ||
        response.headers
          .get('Content-Type')
          ?.split(';')[0]
          .trim()
          .toLowerCase() !== 'application/vnd.git-lfs+json'
      ) {
        void response.body?.cancel().catch(() => undefined)
        throw githubFailure()
      }
      return response
    }, request)
    return batchResult(value, objects, now())
  } catch {
    throw githubFailure()
  }
}
