import {
  DEVICE_FRAME_LIMIT_BYTES,
  DEVICE_OUTPUT_LIMIT_BYTES,
} from '../../../src/shared/device.ts'
import type { DeviceToWorker } from '../../../src/shared/device.ts'

function prefix(text: string, bytes: number): string {
  return new TextDecoder().decode(Buffer.from(text).subarray(0, bytes), {
    stream: true,
  })
}

/** Long public request IDs also consume the result frame's output budget. */
export function deviceFrame(message: DeviceToWorker): string | undefined {
  const frame = JSON.stringify(message)
  if (Buffer.byteLength(frame) <= DEVICE_FRAME_LIMIT_BYTES) return frame
  if (message.type !== 'command.result') return
  const empty = {
    ...message,
    result: { ...message.result, stdout: '', stderr: '', truncated: true },
  }
  const room =
    DEVICE_FRAME_LIMIT_BYTES - Buffer.byteLength(JSON.stringify(empty))
  if (room < 0) return
  // Each UTF-8 output byte can use at most six bytes after JSON escaping.
  const budget = Math.min(DEVICE_OUTPUT_LIMIT_BYTES, Math.floor(room / 6))
  const stdout = prefix(message.result.stdout, budget)
  const stderr = prefix(
    message.result.stderr,
    budget - Buffer.byteLength(stdout),
  )
  return JSON.stringify({
    ...empty,
    result: { ...empty.result, stdout, stderr },
  })
}
