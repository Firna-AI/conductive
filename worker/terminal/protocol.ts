import { HttpError, isRecord } from '../http'

/** ttyd also authenticates its first JSON message, after HTTP Basic auth. */
export function terminalFrames(auth: string) {
  let initialized = false
  return async (data: string | ArrayBuffer): Promise<string | ArrayBuffer> => {
    if (!initialized) {
      let value: unknown
      try {
        value = JSON.parse(
          typeof data === 'string' ? data : new TextDecoder().decode(data),
        )
      } catch {
        throw new HttpError(
          400,
          'terminal_protocol',
          'Open the terminal again.',
        )
      }
      if (!isRecord(value))
        throw new HttpError(
          400,
          'terminal_protocol',
          'Open the terminal again.',
        )
      initialized = true
      return JSON.stringify({ ...value, AuthToken: auth })
    }
    return data
  }
}
