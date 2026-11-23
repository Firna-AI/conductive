import type { HostFrame } from './generated/HostFrame'
import { HOST_MESSAGE_PART_BYTES, HOST_STREAM_FRAME_BYTES } from './host'

/** Encode one binary host frame after checking its payload bounds. */
export function encodeHostFrame(frame: HostFrame): Uint8Array {
  const stream = frame.kind === 'streamData'
  const id = stream ? frame.streamId : frame.requestId
  if (!Number.isInteger(id) || id < 0 || id > 0xffff_ffff) {
    throw new RangeError('Invalid host frame ID.')
  }
  checkPayload(frame.data.byteLength, stream)
  const headerBytes = stream ? 5 : 6
  const bytes = new Uint8Array(headerBytes + frame.data.byteLength)
  bytes[0] = stream ? 1 : 2
  new DataView(bytes.buffer).setUint32(1, id, false)
  if (frame.kind === 'messagePart') bytes[5] = frame.last ? 1 : 0
  bytes.set(frame.data, headerBytes)
  return bytes
}

/** Decode bytes without decoding a message part as UTF-8. */
export function decodeHostFrame(bytes: Uint8Array): HostFrame {
  if (bytes.byteLength < 5) throw new RangeError('Short host frame header.')
  const id = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(1, false)
  switch (bytes[0]) {
    case 1:
      checkPayload(bytes.byteLength - 5, true)
      return { kind: 'streamData', streamId: id, data: bytes.slice(5) }
    case 2: {
      if (bytes.byteLength < 6) throw new RangeError('Short host frame header.')
      const flags = bytes[5]
      if ((flags & ~1) !== 0) {
        throw new RangeError('Invalid host message part flags.')
      }
      checkPayload(bytes.byteLength - 6, false)
      return {
        kind: 'messagePart',
        requestId: id,
        last: flags === 1,
        data: bytes.slice(6),
      }
    }
    default:
      throw new RangeError('Invalid host frame kind.')
  }
}

function checkPayload(size: number, stream: boolean): void {
  if (stream && size === 0) throw new RangeError('Empty host stream frame.')
  const limit = stream ? HOST_STREAM_FRAME_BYTES : HOST_MESSAGE_PART_BYTES
  if (size > limit) throw new RangeError('Host frame payload is too large.')
}
