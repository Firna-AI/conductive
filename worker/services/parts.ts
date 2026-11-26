import type { RunnerServiceMessage } from '../../src/shared/generated/RunnerServiceMessage'
import {
  serviceCounter,
  ServiceInputError,
  serviceRecord,
  serviceString,
} from '../../src/shared/service-inputs'
import { checkRunnerEnvelopeBytes } from '../chat/runner-event-limits'

export function isServiceMessage(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    typeof value.type === 'string' &&
    value.type.startsWith('services.')
  )
}

export function readServiceMessage(value: unknown): RunnerServiceMessage {
  checkRunnerEnvelopeBytes(value)
  const input = serviceRecord(value)
  const raw = serviceRecord(input.part)
  const partNumber = serviceCounter(raw.partNumber)
  if (partNumber === 0 || typeof raw.finalPart !== 'boolean')
    throw new ServiceInputError('Invalid service part.')
  const part = {
    partNumber,
    finalPart: raw.finalPart,
    text: serviceString(raw.text),
  }
  if (input.type === 'services.report.part')
    return {
      type: input.type,
      transferId: serviceString(input.transferId),
      part,
    }
  if (
    input.type === 'services.control.result.part' ||
    input.type === 'services.logs.part'
  )
    return { type: input.type, requestId: serviceString(input.requestId), part }
  throw new ServiceInputError('Invalid service message.')
}

function transferKey(message: RunnerServiceMessage): string {
  return JSON.stringify([
    message.type,
    'transferId' in message ? message.transferId : message.requestId,
  ])
}

export class ServiceParts {
  private readonly transfers = new Map<string, string[]>()

  discard(value: unknown): void {
    const input = serviceRecord(value)
    this.transfers.delete(
      JSON.stringify([
        input.type,
        input.type === 'services.report.part'
          ? input.transferId
          : input.requestId,
      ]),
    )
  }

  accept(message: RunnerServiceMessage): unknown | undefined {
    const key = transferKey(message)
    const parts = this.transfers.get(key) ?? []
    if (message.part.partNumber !== parts.length + 1) {
      this.transfers.delete(key)
      throw new ServiceInputError('Nonconsecutive service part.')
    }
    parts.push(message.part.text)
    if (!message.part.finalPart) {
      this.transfers.set(key, parts)
      return undefined
    }
    this.transfers.delete(key)
    const value: unknown = JSON.parse(parts.join(''))
    return value
  }
}
