import { expect, it, vi } from 'vitest'

import { compacted, session } from './batch-fold.test-support'
import { SessionLog } from './session-log'

function isTranscriptEntry(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  return (
    ('ended' in value && 'messageIds' in value) ||
    ('kind' in value &&
      (value.kind === 'user' ||
        value.kind === 'agent' ||
        value.kind === 'tool' ||
        value.kind === 'turn-end'))
  )
}

function readWork(turns: number) {
  const events = compacted(turns)
  let entries = 0
  const map = Array.prototype.map
  const findIndex = Array.prototype.findIndex
  const some = Array.prototype.some
  const push = Array.prototype.push
  const count = (value: unknown) => {
    if (isTranscriptEntry(value)) entries += 1
  }
  const maps = vi.spyOn(Array.prototype, 'map').mockImplementation(function (
    this: unknown[],
    callback,
    receiver,
  ) {
    return map.call(this, (value, index, array) => {
      count(value)
      return callback.call(receiver, value, index, array)
    })
  })
  const finds = vi
    .spyOn(Array.prototype, 'findIndex')
    .mockImplementation(function (this: unknown[], callback, receiver) {
      return findIndex.call(this, (value, index, array) => {
        count(value)
        return callback.call(receiver, value, index, array)
      })
    })
  const searches = vi
    .spyOn(Array.prototype, 'some')
    .mockImplementation(function (this: unknown[], callback, receiver) {
      return some.call(this, (value, index, array) => {
        count(value)
        return callback.call(receiver, value, index, array)
      })
    })
  Array.prototype.push = function (this: unknown[], ...values: unknown[]) {
    for (const value of values) count(value)
    return push.apply(this, values)
  }
  const log = new SessionLog()
  try {
    log.offer(session, events.length + 1)
    log.merge(events.slice(-5))
    void log.transcript
    log.merge(events.slice(0, -5))
    void log.transcript
  } finally {
    Array.prototype.push = push
    maps.mockRestore()
    finds.mockRestore()
    searches.mockRestore()
  }
  return { entries, transcript: log.transcript }
}

it('reads and copies transcript entries about linearly when compacted history quadruples', () => {
  const small = readWork(64)
  const large = readWork(256)
  expect(small.transcript.items).toHaveLength(256)
  expect(large.transcript.items).toHaveLength(1024)
  expect(large.transcript.items.at(-1)).toEqual({
    kind: 'turn-end',
    id: 'end:turn-255',
    turnId: 'turn-255',
    durationMs: 3,
    files: [],
  })
  expect(small.entries).toBeGreaterThan(0)
  expect(large.entries).toBeLessThanOrEqual(small.entries * 4.5)
})
