import type { Sandbox } from '../provider'
import { ProviderError } from '../errors'
import type { E2bContext } from './context'
import { deleteSandboxState } from './create-data'
import { readAccess, readSandbox } from './parsers'
import { saveTrafficToken } from './traffic-tokens'

export async function getSandbox(
  context: E2bContext,
  sandboxId: string,
): Promise<Sandbox> {
  const reply = await context.control.request({ operation: 'get', sandboxId })
  return readSandbox(reply.value, sandboxId)
}

export async function resumeSandbox(
  context: E2bContext,
  sandboxId: string,
  ttlSeconds: number,
): Promise<Sandbox> {
  const reply = await context.control.request(
    { operation: 'connect', sandboxId },
    { body: { timeout: ttlSeconds, memory: false } },
  )
  const access = readAccess(reply.value, sandboxId)
  await saveTrafficToken(context, sandboxId, access.trafficToken)
  return { id: sandboxId, state: 'ready' }
}

export async function stopSandbox(
  context: E2bContext,
  sandboxId: string,
): Promise<Sandbox> {
  try {
    await context.control.request(
      { operation: 'pause', sandboxId },
      { body: { memory: false } },
    )
  } catch (error) {
    if (!(error instanceof ProviderError && error.kind === 'conflict'))
      throw error
    const sandbox = await getSandbox(context, sandboxId)
    if (sandbox.state === 'archived' || sandbox.state === 'archiving')
      return sandbox
    throw error
  }
  return getSandbox(context, sandboxId)
}

export async function deleteSandbox(
  context: E2bContext,
  sandboxId: string,
): Promise<void> {
  try {
    await context.control.request({ operation: 'delete', sandboxId })
  } catch (error) {
    if (!(error instanceof ProviderError && error.kind === 'not_found'))
      throw error
  }
  await deleteSandboxState(context.db, context.accountId, sandboxId)
}

export async function setTimeout(
  context: E2bContext,
  sandboxId: string,
  ttlSeconds: number,
): Promise<Sandbox> {
  await context.control.request(
    { operation: 'timeout', sandboxId },
    { body: { timeout: ttlSeconds } },
  )
  return getSandbox(context, sandboxId)
}
