import { HttpError } from '../http'

export type FeatureResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { status: number; code: string; message: string } }

export async function featureResult<T>(
  operation: () => Promise<T>,
): Promise<FeatureResult<T>> {
  try {
    return { ok: true, value: await operation() }
  } catch (error) {
    if (!(error instanceof HttpError)) throw error
    return {
      ok: false,
      error: { status: error.status, code: error.code, message: error.message },
    }
  }
}

export function requireFeatureResult<T>(result: FeatureResult<T>): T {
  if (!result.ok)
    throw new HttpError(
      result.error.status,
      result.error.code,
      result.error.message,
    )
  return result.value
}
