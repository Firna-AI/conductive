export function record(value: unknown, label: string): Record<string, unknown> {
  if (isRecord(value)) return value
  throw new Error(`${label} returned an invalid object.`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function array(value: unknown, label: string): unknown[] {
  if (Array.isArray(value)) return value
  throw new Error(`${label} returned an invalid list.`)
}

export function text(value: unknown, label: string): string {
  if (typeof value === 'string' && value.length) return value
  throw new Error(`${label} returned an invalid string.`)
}

export function json(value: string, label: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`${label} returned invalid JSON.`)
  }
}

export async function httpJson(
  send: (request: Request) => Promise<Response>,
  request: Request,
  label: string,
  missing = false,
): Promise<unknown> {
  let response: Response
  try {
    response = await send(request)
  } catch {
    throw new Error(`${label} request could not complete.`)
  }
  if (missing && response.status === 404) return null
  if (!response.ok)
    throw new Error(`${label} request failed with HTTP ${response.status}.`)
  if (response.status === 204 || response.body === null) return null
  try {
    return await response.json()
  } catch {
    throw new Error(`${label} returned invalid JSON.`)
  }
}
