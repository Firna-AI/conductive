import { hideMachineTokens } from '../lifecycle/build-machine-token'
import type { RedactedCommandOutput } from '../lifecycle/build-output-redaction'

const OUTPUT_LIMIT = 64 * 1024

export function keptOutput(
  previous: string,
  output: RedactedCommandOutput,
): string {
  const text = hideMachineTokens(previous + output.text)
  const bytes = new TextEncoder().encode(text)
  if (bytes.length <= OUTPUT_LIMIT) return text
  let start = bytes.length - OUTPUT_LIMIT
  while ((bytes[start] & 0xc0) === 0x80) start++
  return new TextDecoder().decode(bytes.subarray(start))
}
