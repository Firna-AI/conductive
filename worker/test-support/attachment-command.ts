import type { HttpFetch } from '../env'
import { ATTACHMENT_DOWNLOAD_PATH } from '../chat/attachment-download'
import { shellQuote } from '../lifecycle/commands'
import { identifier, record } from '../chat/inputs'

function readAttachmentCommand(command: string) {
  if (!command.includes(ATTACHMENT_DOWNLOAD_PATH)) return null
  const start = command.indexOf('/bin/sh -c ') + '/bin/sh -c '.length
  const quoted = command.slice(start, command.lastIndexOf(' > /dev/null 2>&1'))
  const body = quoted.slice(1, -1).replaceAll("'\"'\"'", "'")
  const path = body.match(/\/bin\/mv -f -- "\$temporary" '([^']+)'/)?.[1]
  const token = body.match(/Authorization: Bearer ([A-Za-z0-9_-]+)/)?.[1]
  const url = body
    .match(/'(https:[^']+)'/g)
    ?.at(-1)
    ?.slice(1, -1)
  if (!path || !token || !url) throw new Error('Invalid attachment command')
  return { path, token, url, body }
}

export function attachmentCommandTransfer(options: {
  download: HttpFetch
  before?: (sandboxId: string, path: string) => Promise<void>
  copied?: (sandboxId: string, path: string, bytes: Uint8Array) => void
  fail?: () => boolean
}) {
  const paths: string[] = []
  const copies: Uint8Array[] = []
  const commands: string[] = []
  let nextProcess = 10_000
  const results = new Map<number, number>()
  const fetch = async (request: Request): Promise<Response | null> => {
    const url = new URL(request.url)
    const processId = Number(url.pathname.match(/\/commands\/(\d+)$/)?.[1])
    const exitCode = results.get(processId)
    if (exitCode !== undefined)
      return Response.json({
        ok: true,
        type: 'command.status',
        success: true,
        processId,
        status: 'exited',
        running: false,
        exitCode,
        timedOut: false,
        stdout: '',
        stderr: '',
        stdoutOffset: 0,
        stderrOffset: 0,
        stdoutNextOffset: 0,
        stderrNextOffset: 0,
        more: false,
      })
    if (request.method !== 'POST' || !url.pathname.endsWith('/commands'))
      return null
    const input = record(await request.clone().json())
    const command = identifier(input.command)
    const sandboxId = url.pathname.split('/').at(-2)
    if (!sandboxId) throw new Error('Missing sandbox')
    return start(sandboxId, command)
  }
  const start = async (sandboxId: string, command: string) => {
    const parsed = readAttachmentCommand(command)
    if (!parsed) return null
    commands.push(command)
    const ignore = parsed.body.match(/printf %s '\*' > '([^']+)'/)?.[1]
    if (!ignore) throw new Error('Missing ignore file')
    paths.push(ignore, parsed.path)
    copies.push(new Uint8Array([42]))
    await options.before?.(sandboxId, parsed.path)
    let result = 1
    if (!options.fail?.()) {
      const response = await options.download(
        new Request(parsed.url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${parsed.token}` },
        }),
      )
      const bytes = new Uint8Array(await response.arrayBuffer())
      if (response.ok && parsed.body.includes(`-eq ${bytes.byteLength}\n`)) {
        copies.push(bytes)
        options.copied?.(sandboxId, parsed.path, bytes)
        result = 0
      }
    }
    const id = ++nextProcess
    results.set(id, result)
    return Response.json({
      ok: true,
      type: 'command.started',
      success: true,
      processId: id,
    })
  }
  return { paths, copies, commands, fetch, start }
}

export function attachmentTemporaryPath(command: string): string {
  const body = readAttachmentCommand(command)?.body ?? ''
  const match = body.match(/temporary='([^']+)'/)
  if (!match) throw new Error(`Missing temporary path in ${shellQuote(body)}`)
  return match[1]
}
