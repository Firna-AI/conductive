import { HttpError, isRecord } from '../http'

/** Parse an entry-bounded request with the shared JSON object policy. */
export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  const contentType = request.headers
    .get('Content-Type')
    ?.split(';')[0]
    .trim()
    .toLowerCase()
  if (contentType !== 'application/json') {
    throw new HttpError(415, 'json_required', 'Send the request as JSON.')
  }
  let value: unknown
  try {
    value = await request.json()
  } catch {
    throw new HttpError(400, 'invalid_json', 'The request is not valid JSON.')
  }
  if (!isRecord(value)) {
    throw new HttpError(400, 'invalid_json', 'Send a JSON object.')
  }
  return value
}
