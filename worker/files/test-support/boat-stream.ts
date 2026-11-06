export const STREAM_FILE_PATH = '/home/user/repos/storefront/note.txt'

/** A fresh body with no eager pulls and no cloned or teed response branch. */
export function oversizedFileStream() {
  const encoder = new TextEncoder()
  const prefix = encoder.encode(
    JSON.stringify({
      ok: true,
      type: 'file.read',
      success: true,
      path: STREAM_FILE_PATH,
      encoding: 'base64',
      size: 24_576,
      content: '',
    }).slice(0, -2),
  )
  const content = new Uint8Array(4096).fill(65)
  const chunks = [
    prefix,
    ...Array.from({ length: 8 }, () => content),
    encoder.encode('"}'),
  ]
  const observed = { chunks: 0, bytes: 0, cancelled: 0 }
  return {
    observed,
    firstChunkBytes: prefix.byteLength,
    totalChunks: chunks.length,
    totalBytes: chunks.reduce((size, chunk) => size + chunk.byteLength, 0),
    response: () =>
      new Response(
        new ReadableStream<Uint8Array>(
          {
            pull(controller) {
              const chunk = chunks[observed.chunks]
              if (!chunk) {
                controller.close()
                return
              }
              observed.chunks++
              observed.bytes += chunk.byteLength
              controller.enqueue(chunk)
            },
            cancel() {
              observed.cancelled++
            },
          },
          { highWaterMark: 0 },
        ),
        { headers: { 'Content-Type': 'application/json' } },
      ),
  }
}

export function fileInfoResponse(path = STREAM_FILE_PATH): Response {
  return Response.json({
    ok: true,
    type: 'file.info',
    name: 'note.txt',
    path,
    isDir: false,
    isSymlink: false,
    size: 123_456,
    mode: '0644',
    modifiedAt: '2026-11-06T00:00:00Z',
  })
}
