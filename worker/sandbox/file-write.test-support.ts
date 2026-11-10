import type { HttpFetch } from '../env'
import { BoatClient } from './boat'

export const filePath = '/home/user/note.bin'
export const uploadUrl =
  'https://file-transfer.example/upload/note.bin?token=server-only%2Bkey&path=%2Fhome%2Fuser%2Fnote.bin'
export const now = Date.parse('2026-11-08T12:00:00Z')

export function uploadGrant() {
  return {
    ok: true,
    type: 'file.upload_url',
    method: 'PUT',
    path: filePath,
    url: uploadUrl,
    expiresAt: '2026-11-08T12:15:00Z',
  }
}

export function uploadBody(chunks: number[][] = [], failure?: Error) {
  const observed = { pulled: 0, cancelled: 0 }
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const chunk = chunks[observed.pulled]
        if (chunk) {
          observed.pulled++
          controller.enqueue(new Uint8Array(chunk))
        } else if (failure) {
          controller.error(failure)
        } else {
          controller.close()
        }
      },
      cancel() {
        observed.cancelled++
      },
    },
    { highWaterMark: 0 },
  )
  return { body, observed }
}

export function uploadFixture(
  options: {
    grantReply?: () => Response
    transferReply?: () => Response
    consumeTransfer?: boolean
    failAt?: 'grant' | 'transfer'
    onRequest?: () => void
  } = {},
) {
  const requests: Request[] = []
  const transferred: number[][] = []
  const fetch: HttpFetch = async (request) => {
    requests.push(request)
    options.onRequest?.()
    const grant = requests.length === 1
    if (options.failAt === (grant ? 'grant' : 'transfer'))
      throw new Error(`private boat-first ${uploadUrl}`)
    if (grant) return options.grantReply?.() ?? Response.json(uploadGrant())
    if (options.consumeTransfer !== false)
      transferred.push([
        ...new Uint8Array(await new Response(request.body).arrayBuffer()),
      ])
    return options.transferReply?.() ?? new Response(null, { status: 204 })
  }
  return {
    client: new BoatClient('boat-first', fetch, 'app-org'),
    requests,
    transferred,
  }
}

export function countedUploadReply(
  bytes: Uint8Array,
  options: { overflow?: boolean; status?: number } = {},
) {
  const chunks = [
    bytes.subarray(0, bytes.length / 2),
    bytes.subarray(bytes.length / 2),
  ]
  if (options.overflow) chunks.push(new Uint8Array([32]), new Uint8Array([32]))
  const observed = { pulled: 0, bytes: 0, cancelled: 0 }
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const chunk = chunks[observed.pulled]
        if (!chunk) return controller.close()
        observed.pulled++
        observed.bytes += chunk.byteLength
        controller.enqueue(chunk)
      },
      cancel() {
        observed.cancelled++
      },
    },
    { highWaterMark: 0 },
  )
  return {
    observed,
    response: new Response(body, {
      status: options.status ?? 200,
      headers: { 'Content-Length': '1' },
    }),
  }
}
