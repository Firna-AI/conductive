import { HttpError, isRecord } from '../http'
import { BodyBudgetExceeded, readBoundedJson } from './bounded-body'

const JSON_BODY_BUDGET = 1_000_000

/** Read a request JSON object with the shared content type and byte policy. */
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
    value = await readBoundedJson(request.body, JSON_BODY_BUDGET)
  } catch (error) {
    if (error instanceof BodyBudgetExceeded) {
      throw new HttpError(
        413,
        'body_too_large',
        'The request is too large. Send less data.',
      )
    }
    throw new HttpError(400, 'invalid_json', 'The request is not valid JSON.')
  }
  if (!isRecord(value)) {
    throw new HttpError(400, 'invalid_json', 'Send a JSON object.')
  }
  return value
}
