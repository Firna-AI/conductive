import { OutputSanitizer } from '../../src/shared/output-sanitizer'
import type { HelperOptions } from '../sdk-helper/src/generated/HelperOptions'
import type { ProviderFactory } from '../sdk-helper/src/providers/types'
import { HelperConnection } from './helper-connection'
import { spawnHelper, type HelperPort } from './helper-port'

/** The engine drives SDK agents only through this private child-process boundary. */
export function createHelperFactory(
  start: () => HelperPort = spawnHelper,
): ProviderFactory {
  return async (options) => {
    options.signal?.throwIfAborted()
    const sanitizer = new OutputSanitizer()
    sanitizer.add(options.tools.workspaceToken)
    sanitizer.add(
      options.credential.type === 'gateway'
        ? options.credential.token
        : options.credential.login.secret,
    )
    const connection = new HelperConnection(
      start(),
      (output) => {
        if (output.type === 'event') options.event(output.event)
        if (output.type === 'warning')
          options.warn(sanitizer.text(output.message))
        if (output.type === 'background.notes') {
          for (const id of output.ids) options.backgroundNoteIds?.add(id)
        }
      },
      () =>
        options.event({
          type: 'failed',
          code: 'agent_exited',
          message: 'The SDK helper process ended.',
        }),
    )
    const close = () => {
      options.signal?.removeEventListener('abort', abort)
      return connection.close()
    }
    const abort = () => {
      void close().catch(() => {})
    }
    options.lifetime?.registerCleanup(close)
    options.signal?.addEventListener('abort', abort, { once: true })
    if (options.signal?.aborted) abort()
    const input: HelperOptions = {
      cwd: options.cwd,
      home: options.home,
      sessionId: options.sessionId,
      endpoint: options.endpoint,
      credential: options.credential,
      commitAuthor: options.commitAuthor,
      choice: options.choice,
      conversationId: options.conversationId,
      instructions: options.instructions,
      ...(options.instructionBranches === undefined
        ? {}
        : { instructionBranches: options.instructionBranches }),
      tools: options.tools,
      backgroundNoteIds: [...(options.backgroundNoteIds ?? [])],
    }
    try {
      await connection.request((requestId) => ({
        type: 'start',
        requestId,
        options: input,
      }))
      options.signal?.throwIfAborted()
    } catch (error) {
      await close()
      throw error
    }
    return {
      send: async (input) => {
        await connection.request((requestId) => ({
          type: 'send',
          requestId,
          input,
        }))
      },
      model: async (choice) => {
        const result = await connection.request((requestId) => ({
          type: 'model',
          requestId,
          choice,
        }))
        if (result === null)
          throw new Error('The SDK helper returned no model result.')
        return result
      },
      interrupt: async () => {
        await connection.request((requestId) => ({
          type: 'interrupt',
          requestId,
        }))
      },
      stop: close,
      close,
    }
  }
}

export async function warmHelper(
  start: () => HelperPort = spawnHelper,
): Promise<void> {
  const port = start()
  const connection = new HelperConnection(
    port,
    () => {},
    () => {},
  )
  try {
    await connection.request((requestId) => ({ type: 'warm', requestId }))
    await port.exited
  } finally {
    await connection.close()
  }
}
