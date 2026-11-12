import type { CommandResult, CommandStatus } from '../provider'
import { COMMAND_BUDGET, responseOverflow } from './budgets'

/** Predict JSON escaping without allocating the serialized command text. */
export function enforceCommandJson(
  result: CommandResult | CommandStatus,
): void {
  const { stdout, stderr, ...metadata } = result
  let size = new TextEncoder().encode(
    JSON.stringify({ ...metadata, stdout: '', stderr: '' }),
  ).byteLength
  for (const text of [stdout, stderr])
    for (let index = 0; index < text.length; index++) {
      const code = text.charCodeAt(index)
      if (
        code === 8 ||
        code === 9 ||
        code === 10 ||
        code === 12 ||
        code === 13 ||
        code === 34 ||
        code === 92
      )
        size += 2
      else if (code < 32) size += 6
      else if (code < 128) size++
      else if (code < 2048) size += 2
      else if (
        code >= 0xd800 &&
        code <= 0xdbff &&
        text.charCodeAt(index + 1) >= 0xdc00 &&
        text.charCodeAt(index + 1) <= 0xdfff
      ) {
        size += 4
        index++
      } else if (code >= 0xd800 && code <= 0xdfff) size += 6
      else size += 3
      if (size > COMMAND_BUDGET) return responseOverflow('command')
    }
}
