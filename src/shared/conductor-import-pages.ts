import { DEVICE_FRAME_LIMIT_BYTES } from './device.ts'
import { ImportContractError } from './conductor-import-values.ts'

export const IMPORT_PART_BYTES = DEVICE_FRAME_LIMIT_BYTES
export const importEncodedBytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).byteLength

export function importPage<T>(
  entries: readonly T[],
  envelope: (entries: T[]) => unknown,
  budget = DEVICE_FRAME_LIMIT_BYTES,
): T[] {
  let low = 0
  let high = entries.length
  while (low < high) {
    const count = Math.ceil((low + high) / 2)
    if (importEncodedBytes(envelope(entries.slice(0, count))) < budget)
      low = count
    else high = count - 1
  }
  if (entries.length && !low) throw new ImportContractError()
  return entries.slice(0, low)
}

export function importWire(value: unknown): string {
  const wire = JSON.stringify(value)
  if (new TextEncoder().encode(wire).byteLength >= DEVICE_FRAME_LIMIT_BYTES)
    throw new ImportContractError()
  return wire
}
