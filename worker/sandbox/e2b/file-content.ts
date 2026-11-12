import { isRecord } from '../../http'
import { BodyBudgetExceeded } from '../../http/bounded-body'
import { ProviderError } from '../errors'
import { CONTROL_BUDGET, ResponseBudget } from './budgets'
import { EnvdSession } from './envd'
import { invalidResponse } from './errors'

export async function statFile(
  session: EnvdSession,
  path: string,
  budget: ResponseBudget,
  user: 'user' | 'root' = 'root',
): Promise<number> {
  const value = await session.json({ operation: 'stat', path }, budget, {
    body: { path },
    user,
  })
  if (!isRecord(value) || !isRecord(value.entry) || value.entry.path !== path)
    return invalidResponse()
  const entry = value.entry
  if (entry.type === 'FILE_TYPE_DIRECTORY' || entry.type === 2)
    throw new ProviderError('invalid_request', 400)
  if (entry.type !== 'FILE_TYPE_FILE' && entry.type !== 1)
    return invalidResponse()
  const raw = entry.size ?? 0
  const size = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw
  if (typeof size !== 'number' || !Number.isSafeInteger(size) || size < 0)
    return invalidResponse()
  return size
}

export async function jsonFile(
  session: EnvdSession,
  path: string,
  budget: ResponseBudget,
): Promise<unknown> {
  let response: Response
  try {
    response = await session.send({ operation: 'read', path }, budget)
  } catch (error) {
    if (error instanceof ProviderError && error.kind === 'not_found')
      return undefined
    throw error
  }
  const bytes = await budget.read(response.body, CONTROL_BUDGET)
  try {
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return invalidResponse()
  }
}

export async function fileSlice(
  session: EnvdSession,
  path: string,
  offset: number,
  count: number,
  budget: ResponseBudget,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!count) return new Uint8Array()
  const response = await session.send({ operation: 'read', path }, budget, {
    headers: {
      Range: `bytes=${offset}-${offset + count - 1}`,
      'Accept-Encoding': 'identity',
    },
  })
  const range = response.headers
    .get('Content-Range')
    ?.match(/^bytes (\d+)-(\d+)\/(\d+)$/)
  if (
    response.status !== 206 ||
    !range ||
    Number(range[1]) !== offset ||
    Number(range[2]) >= offset + count ||
    Number(range[3]) <= Number(range[2])
  )
    return invalidResponse()
  const [start, end, total] = range.slice(1).map(Number)
  if (![start, end, total].every(Number.isSafeInteger) || end < start)
    return invalidResponse()
  let bytes: Uint8Array<ArrayBuffer>
  try {
    bytes = await budget.read(response.body, count)
  } catch (error) {
    if (error instanceof BodyBudgetExceeded) return invalidResponse()
    throw error
  }
  if (bytes.byteLength !== Number(range[2]) - offset + 1)
    return invalidResponse()
  return bytes
}

export function base64(bytes: Uint8Array): string {
  const chunks: string[] = []
  for (let offset = 0; offset < bytes.byteLength; offset += 32_768)
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 32_768)))
  return btoa(chunks.join(''))
}
