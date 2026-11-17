import type {
  AnswerSecretRequest,
  RunWithSecretsRequest,
} from '../../src/shared/secret-requests'
import { HttpError } from '../http'

export function secretInputError() {
  return new HttpError(400, 'invalid_input', 'Complete the required fields.')
}

function text(value: unknown): string {
  if (typeof value !== 'string') throw secretInputError()
  return value
}

export function readSecretRun(
  body: Record<string, unknown>,
): RunWithSecretsRequest {
  if (!Array.isArray(body.names) || !body.names.length) throw secretInputError()
  const names = [...new Set(body.names.map((name: unknown) => text(name)))]
  if (names.some((name) => !name)) throw secretInputError()
  return {
    names,
    command: text(body.command),
    ...(body.reason === undefined ? {} : { reason: text(body.reason) }),
  }
}

export function readSecretAnswer(
  body: Record<string, unknown>,
): AnswerSecretRequest {
  if (body.kind === 'deny' || body.kind === 'allow') return { kind: body.kind }
  if (
    body.kind !== 'values' ||
    (body.lifetime !== '15-minutes' &&
      body.lifetime !== 'workspace' &&
      body.lifetime !== 'save') ||
    !body.values ||
    typeof body.values !== 'object' ||
    Array.isArray(body.values)
  )
    throw secretInputError()
  const values = Object.fromEntries(
    Object.entries(body.values).map(([name, value]) => [name, text(value)]),
  )
  return { kind: 'values', lifetime: body.lifetime, values }
}
