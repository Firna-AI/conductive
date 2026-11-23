import { expect, it } from 'vitest'

import type { HostFrame } from './generated/HostFrame'
import { decodeHostFrame, encodeHostFrame } from './host-frames'

it('encodes and decodes the stream data golden bytes', () => {
  const frame: HostFrame = {
    kind: 'streamData',
    streamId: 0x0102_0304,
    data: new Uint8Array([0, 255, 128]),
  }
  const bytes = new Uint8Array([1, 1, 2, 3, 4, 0, 255, 128])
  expect(encodeHostFrame(frame)).toEqual(bytes)
  expect(decodeHostFrame(bytes)).toEqual(frame)
})

it('encodes and decodes the message part golden bytes', () => {
  const frame: HostFrame = {
    kind: 'messagePart',
    requestId: 0x0102_0304,
    last: true,
    data: new Uint8Array([123, 125]),
  }
  const bytes = new Uint8Array([2, 1, 2, 3, 4, 1, 123, 125])
  expect(encodeHostFrame(frame)).toEqual(bytes)
  expect(decodeHostFrame(bytes)).toEqual(frame)
})

it('preserves empty message parts and split UTF-8 code points', () => {
  const cases = [
    { last: true, data: [], bytes: [2, 255, 255, 255, 255, 1] },
    { last: false, data: [226], bytes: [2, 255, 255, 255, 255, 0, 226] },
  ]
  for (const { last, data, bytes } of cases) {
    const frame: HostFrame = {
      kind: 'messagePart',
      requestId: 0xffff_ffff,
      last,
      data: new Uint8Array(data),
    }
    expect(encodeHostFrame(frame)).toEqual(new Uint8Array(bytes))
    expect(decodeHostFrame(new Uint8Array(bytes))).toEqual(frame)
  }
})

it('accepts payloads at both frame limits', () => {
  const frames: HostFrame[] = [
    { kind: 'streamData', streamId: 0, data: new Uint8Array(65_536) },
    {
      kind: 'messagePart',
      requestId: 0,
      last: false,
      data: new Uint8Array(262_144),
    },
  ]
  for (const [index, frame] of frames.entries()) {
    const bytes = encodeHostFrame(frame)
    expect(bytes.length).toBe([65_541, 262_150][index])
    expect(decodeHostFrame(bytes)).toEqual(frame)
  }
})

it('rejects a bad frame kind', () => {
  for (const kind of [0, 3, 255]) {
    expect(() =>
      decodeHostFrame(new Uint8Array([kind, 0, 0, 0, 1, 1])),
    ).toThrow(new RangeError('Invalid host frame kind.'))
  }
})

it('rejects short stream and message part headers', () => {
  for (const bytes of [[], [1], [1, 0, 0, 0], [2, 0, 0, 0, 1]]) {
    expect(() => decodeHostFrame(new Uint8Array(bytes))).toThrow(
      new RangeError('Short host frame header.'),
    )
  }
})

it('rejects an empty stream frame during encoding and decoding', () => {
  expect(() => decodeHostFrame(new Uint8Array([1, 0, 0, 0, 1]))).toThrow(
    new RangeError('Empty host stream frame.'),
  )
  expect(() =>
    encodeHostFrame({
      kind: 'streamData',
      streamId: 1,
      data: new Uint8Array(),
    }),
  ).toThrow(new RangeError('Empty host stream frame.'))
})

it('rejects reserved message part flags', () => {
  for (const flags of [2, 3, 128, 255]) {
    expect(() =>
      decodeHostFrame(new Uint8Array([2, 0, 0, 0, 1, flags])),
    ).toThrow(new RangeError('Invalid host message part flags.'))
  }
})

it('rejects decoding payloads above both frame limits', () => {
  for (const { header, size } of [
    { header: [1, 0, 0, 0, 1], size: 65_537 },
    { header: [2, 0, 0, 0, 1, 1], size: 262_145 },
  ]) {
    const bytes = new Uint8Array(header.length + size)
    bytes.set(header)
    expect(() => decodeHostFrame(bytes)).toThrow(
      new RangeError('Host frame payload is too large.'),
    )
  }
})

it('rejects encoding payloads above both frame limits', () => {
  const frames: HostFrame[] = [
    { kind: 'streamData', streamId: 1, data: new Uint8Array(65_537) },
    {
      kind: 'messagePart',
      requestId: 1,
      last: true,
      data: new Uint8Array(262_145),
    },
  ]
  for (const frame of frames) {
    expect(() => encodeHostFrame(frame)).toThrow(
      new RangeError('Host frame payload is too large.'),
    )
  }
})

it('refuses IDs that cannot fit the four byte header', () => {
  for (const id of [-1, 1.5, 0x1_0000_0000, NaN, Infinity]) {
    expect(() =>
      encodeHostFrame({
        kind: 'streamData',
        streamId: id,
        data: new Uint8Array([1]),
      }),
    ).toThrow(new RangeError('Invalid host frame ID.'))
    expect(() =>
      encodeHostFrame({
        kind: 'messagePart',
        requestId: id,
        last: false,
        data: new Uint8Array(),
      }),
    ).toThrow(new RangeError('Invalid host frame ID.'))
  }
})

it('reads a frame from a byte view with a non-zero offset', () => {
  const bytes = new Uint8Array([99, 1, 1, 2, 3, 4, 128, 99])
  expect(decodeHostFrame(bytes.subarray(1, 7))).toEqual({
    kind: 'streamData',
    streamId: 0x0102_0304,
    data: new Uint8Array([128]),
  })
})
