import type { FileResponse } from '../../src/shared/files'
import { readBoatKey } from '../data/boat-keys'
import type { AppEnv, HttpFetch } from '../env'
import { HttpError, isRecord } from '../http'
import { decrypt } from '../security/crypto'
import type { FilesWorkspace } from './data'
import { fileBytes, parseFile } from './content'
import {
  FileTooLargeError,
  fileUnavailable,
  invalidFileResponse,
} from './errors'
import { natural } from './parsers'
import { checkByteLimit, readFilePath } from './paths'

/** Fixed Boat file route. The handler supplies the authorized D1 workspace. */
export async function readBoatFile(
  env: AppEnv,
  workspace: FilesWorkspace,
  repositoryRoot: string,
  path: string,
  maxBytes: number,
  fetch: HttpFetch,
): Promise<FileResponse> {
  checkByteLimit(maxBytes)
  readFilePath(path)
  if (!workspace.sandboxId) throw fileUnavailable()
  const root = repositoryRoot.replace(/\/$/, '')
  if (!root.startsWith('/home/user/') || !readFilePath(root.slice(1))) {
    throw new Error('Configure the absolute repository root under /home/user.')
  }
  const stored = await readBoatKey(env.DB, workspace.orgId)
  if (!stored) throw fileUnavailable()
  const key = await decrypt(
    stored.ciphertext,
    JSON.stringify([
      'boat-key',
      workspace.orgId,
      stored.accountType,
      stored.accountId,
    ]),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
  const sandboxId = workspace.sandboxId
  if (
    !sandboxId ||
    /[/\\?#]/.test(sandboxId) ||
    sandboxId === '.' ||
    sandboxId === '..'
  )
    throw fileUnavailable()
  const url = new URL(
    `https://boat.dev/api/v1/sandboxes/${encodeURIComponent(sandboxId)}/files`,
  )
  const absolutePath = `${root}/${path}`
  url.search = new URLSearchParams({
    path: absolutePath,
    encoding: 'base64',
  }).toString()
  let response: Response
  try {
    response = await fetch(
      new Request(url, {
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
          'X-Boat-Org':
            stored.accountType === 'personal' ? 'personal' : stored.accountId,
        },
        redirect: 'error',
        signal: AbortSignal.timeout(65_000),
      }),
    )
  } catch {
    throw fileUnavailable()
  }
  if (response.status === 404)
    throw new HttpError(404, 'file_not_found', 'The file is not available.')
  if (!response.ok) throw fileUnavailable()
  let value: unknown
  try {
    value = await response.json()
  } catch {
    throw invalidFileResponse()
  }
  if (
    !isRecord(value) ||
    value.ok !== true ||
    value.type !== 'file.read' ||
    typeof value.success !== 'boolean' ||
    typeof value.path !== 'string' ||
    (value.encoding !== 'utf8' && value.encoding !== 'base64') ||
    !natural(value.size) ||
    typeof value.content !== 'string'
  )
    throw invalidFileResponse()
  if (!value.success) throw fileUnavailable()
  if (value.path !== absolutePath) throw invalidFileResponse()
  if (value.size > maxBytes) throw new FileTooLargeError(value.size, maxBytes)
  const file = parseFile(
    {
      path,
      mediaType: 'application/octet-stream',
      sizeBytes: value.size,
      encoding: value.encoding === 'utf8' ? 'utf-8' : 'base64',
      content: value.content,
    },
    path,
    maxBytes,
  )
  try {
    const content = new TextDecoder('utf-8', {
      fatal: true,
      ignoreBOM: true,
    }).decode(fileBytes(file))
    return {
      ...file,
      encoding: 'utf-8',
      content,
      mediaType: textMediaType(path),
    }
  } catch {
    return file
  }
}

function textMediaType(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase()
  if (extension === 'md' || extension === 'markdown') return 'text/markdown'
  if (extension === 'json') return 'application/json'
  return 'text/plain'
}
