import { isRecord } from '../../http'
import { BodyBudgetExceeded } from '../../http/bounded-body'
import { ProviderError } from '../errors'
import { fileWriteBody } from '../file-write-body'
import type { SandboxFileRead } from '../provider'
import { CONTROL_BUDGET, ResponseBudget } from './budgets'
import type { E2bContext } from './context'
import { envdSession, type EnvdSession } from './envd'
import { invalidResponse } from './errors'
import { base64, statFile } from './file-content'

export async function readFile(
  context: E2bContext,
  sandboxId: string,
  path: string,
  maxBytes: number,
): Promise<SandboxFileRead> {
  const session = await envdSession(context, sandboxId)
  const size = await statFile(
    session,
    path,
    new ResponseBudget('sandbox'),
    'user',
  )
  if (size > maxBytes)
    return { kind: 'too_large', sizeBytes: size, limitBytes: maxBytes }
  try {
    const budget = new ResponseBudget('file', maxBytes)
    const response = await session.send({ operation: 'read', path }, budget, {
      user: 'user',
    })
    const bytes = await budget.read(response.body)
    return {
      kind: 'file',
      file: {
        path,
        sizeBytes: bytes.byteLength,
        encoding: 'base64',
        content: base64(bytes),
      },
    }
  } catch (error) {
    if (!(
      error instanceof ProviderError || error instanceof BodyBudgetExceeded
    ))
      throw error
    try {
      const currentSize = await statFile(
        session,
        path,
        new ResponseBudget('sandbox'),
        'user',
      )
      if (currentSize > maxBytes)
        return {
          kind: 'too_large',
          sizeBytes: currentSize,
          limitBytes: maxBytes,
        }
    } catch (metadataError) {
      if (
        error instanceof BodyBudgetExceeded ||
        !(metadataError instanceof ProviderError)
      )
        throw metadataError
    }
    if (error instanceof BodyBudgetExceeded) return invalidResponse()
    throw error
  }
}

export async function writeFile(
  context: E2bContext,
  sandboxId: string,
  path: string,
  body: ReadableStream<Uint8Array>,
  sizeBytes: number,
): Promise<void> {
  let session: EnvdSession
  try {
    session = await envdSession(context, sandboxId)
  } catch (error) {
    await body.cancel().catch(() => undefined)
    throw error
  }
  return uploadFile(session, path, body, sizeBytes)
}

export async function uploadFile(
  session: EnvdSession,
  path: string,
  body: ReadableStream<Uint8Array>,
  sizeBytes: number,
): Promise<void> {
  let transfer: ReturnType<typeof fileWriteBody> | undefined
  try {
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0)
      throw new ProviderError('invalid_request', 400)
    transfer = fileWriteBody(body, sizeBytes)
    const budget = new ResponseBudget('sandbox')
    const response = await session.send({ operation: 'write', path }, budget, {
      user: 'user',
      body: transfer.body,
      headers: { 'Content-Type': 'application/octet-stream' },
    })
    const bytes = await budget.read(response.body, CONTROL_BUDGET)
    let value: unknown
    try {
      value = JSON.parse(new TextDecoder().decode(bytes))
    } catch {
      return invalidResponse()
    }
    if (
      !Array.isArray(value) ||
      value.length !== 1 ||
      !isRecord(value[0]) ||
      value[0].path !== path ||
      value[0].type !== 'file'
    )
      return invalidResponse()
    if (!transfer.complete()) throw new ProviderError('unavailable', 503)
  } catch (error) {
    await (transfer ? transfer.cancel() : body.cancel()).catch(() => undefined)
    throw error
  }
}
