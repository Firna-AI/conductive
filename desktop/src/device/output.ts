import { StringDecoder } from 'node:string_decoder'

import { DEVICE_OUTPUT_LIMIT_BYTES } from '../../../src/shared/device.ts'

/** Retain at most one shared byte budget, with a decoder for each stream. */
export function captureOutput() {
  let used = 0
  let truncated = false
  const streams = {
    stdout: { decoder: new StringDecoder('utf8'), parts: new Array<string>() },
    stderr: { decoder: new StringDecoder('utf8'), parts: new Array<string>() },
  }
  const append = (stream: keyof typeof streams, text: string) => {
    const bytes = Buffer.from(text)
    let end = Math.min(bytes.length, DEVICE_OUTPUT_LIMIT_BYTES - used)
    while (end > 0 && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--
    if (end > 0)
      streams[stream].parts.push(bytes.subarray(0, end).toString('utf8'))
    used += end
    if (end < bytes.length) truncated = true
  }
  return {
    write(stream: keyof typeof streams, bytes: Uint8Array) {
      if (bytes.byteLength === 0) return
      if (used === DEVICE_OUTPUT_LIMIT_BYTES || truncated) {
        truncated = true
        return
      }
      const remaining = DEVICE_OUTPUT_LIMIT_BYTES - used
      const input = bytes.subarray(0, remaining)
      append(stream, streams[stream].decoder.write(Buffer.from(input)))
      if (input.byteLength < bytes.byteLength) truncated = true
    },
    finish() {
      if (!truncated) {
        append('stdout', streams.stdout.decoder.end())
        append('stderr', streams.stderr.decoder.end())
      }
      return {
        stdout: streams.stdout.parts.join(''),
        stderr: streams.stderr.parts.join(''),
        truncated,
      }
    },
  }
}
