import { object, string } from '../parse'
import { JsonRpcError, type JsonRpc } from './rpc'
import type { ProviderOptions } from './types'

export async function openCodexThread(
  rpc: JsonRpc,
  options: ProviderOptions,
  modelProvider: string,
): Promise<string> {
  const params = {
    ...(options.conversationId ? { threadId: options.conversationId } : {}),
    model: options.choice.model,
    modelProvider,
    cwd: options.cwd,
    developerInstructions: options.instructions,
    approvalPolicy: 'never',
    sandbox: 'danger-full-access',
  }
  if (!options.conversationId)
    return threadId(await rpc.request('thread/start', params))
  const saved = await savedProvider(rpc, options.conversationId)
  if (saved !== null && saved !== modelProvider)
    return threadId(await rpc.request('thread/fork', params))
  let response: unknown
  try {
    response = await rpc.request('thread/resume', params)
  } catch (error) {
    if (!providerChanged(error)) throw error
    response = await rpc.request('thread/fork', params)
  }
  return threadId(response)
}

function threadId(response: unknown): string {
  return string(object(object(response).thread).id)
}

/**
 * The provider that the saved conversation used, or null when Codex cannot
 * say. Codex 0.170.0 refuses a resume from `openai` to another provider
 * without the error data that `providerChanged` reads, so the runner checks
 * the saved provider before it resumes. A null value keeps the resume, and
 * the resume then gives its own error.
 */
async function savedProvider(
  rpc: JsonRpc,
  threadId: string,
): Promise<string | null> {
  let response: unknown
  try {
    response = await rpc.request('thread/read', {
      threadId,
      includeTurns: false,
    })
  } catch (error) {
    if (error instanceof JsonRpcError) return null
    throw error
  }
  const thread =
    typeof response === 'object' && response !== null && 'thread' in response
      ? response.thread
      : null
  return typeof thread === 'object' &&
    thread !== null &&
    'modelProvider' in thread &&
    typeof thread.modelProvider === 'string'
    ? thread.modelProvider
    : null
}

function providerChanged(error: unknown): boolean {
  if (!(error instanceof JsonRpcError)) return false
  const data = error.data
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    (data.type === 'modelProviderMismatch' ||
      data.type === 'modelProviderNotConfigured')
  )
}
