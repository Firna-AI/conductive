import { readFile } from 'node:fs/promises'
import process from 'node:process'

import { text, ToolInputError } from './input.ts'

export interface MessageInput {
  readFile(path: string): Promise<string>
  readStdin(): Promise<string>
}

export const nativeMessageInput: MessageInput = {
  readFile: (path) => readFile(path, 'utf8'),
  async readStdin() {
    process.stdin.setEncoding('utf8')
    let result = ''
    for await (const chunk of process.stdin) result += String(chunk)
    return result
  },
}

export async function cliMessage(
  values: Readonly<Record<string, unknown>>,
  input: MessageInput = nativeMessageInput,
): Promise<unknown> {
  if (values['message-file'] === undefined) return values.message
  if (values.message !== undefined)
    throw new ToolInputError('Use --message or --message-file for one message.')
  const path = text(values['message-file'])
  try {
    return path === '-' ? await input.readStdin() : await input.readFile(path)
  } catch {
    throw new ToolInputError(
      path === '-'
        ? 'The message could not be read from stdin. Try again.'
        : 'The message file could not be read. Check its path and try again.',
    )
  }
}
