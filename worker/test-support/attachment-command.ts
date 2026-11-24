import type { HttpFetch } from '../env'
import { ATTACHMENT_DOWNLOAD_PATH } from '../chat/attachment-download'
import { shellQuote } from '../lifecycle/commands'
import { identifier, record } from '../chat/inputs'
import type { HostResult } from '../../src/shared/generated/HostResult'

function readAttachmentCommand(command: string) {
  if (!command.includes(ATTACHMENT_DOWNLOAD_PATH)) return null
  const start = command.indexOf('/bin/sh -c ') + '/bin/sh -c '.length
  const quoted = command.slice(start, command.lastIndexOf(' > /dev/null 2>&1'))
  const body = quoted.slice(1, -1).replaceAll("'\"'\"'", "'")
  const path = body.match(/\/bin\/mv -fT -- "\$temporary" '([^']+)'/)?.[1]
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
    return id
  }
  const status = ({ processId }: { processId: number }) => {
    const exitCode = results.get(processId)
    return Promise.resolve({
      kind: 'command.status',
      processId,
      state: exitCode === undefined ? 'lost' : 'exited',
      running: false,
      exitCode: exitCode ?? null,
      timedOut: false,
      stdout: '',
      stderr: '',
      stdoutNextOffset: 0,
      stderrNextOffset: 0,
      more: false,
    } satisfies HostResult)
  }
  const command = async (request: {
    sandboxId: string
    command: string
    detached: boolean
  }): Promise<HostResult> => {
    if (!request.detached)
      throw new Error('Expected a detached attachment command.')
    const processId = await start(request.sandboxId, request.command)
    if (processId === null) throw new Error('Expected an attachment download.')
    return { kind: 'command.started', processId }
  }
  const fetch = async (request: Request): Promise<Response | null> => {
    const url = new URL(request.url)
    const processId = Number(url.pathname.match(/\/commands\/(\d+)$/)?.[1])
    if (results.has(processId)) {
      const { kind, state, ...output } = await status({ processId })
      return Response.json({
        ok: true,
        type: kind,
        success: true,
        status: state,
        stdoutOffset: 0,
        stderrOffset: 0,
        ...output,
      })
    }
    if (request.method !== 'POST' || !url.pathname.endsWith('/commands'))
      return null
    const input = record(await request.clone().json())
    const sandboxId = url.pathname.split('/').at(-2)
    if (!sandboxId) throw new Error('Missing sandbox')
    const id = await start(sandboxId, identifier(input.command))
    return id === null
      ? null
      : Response.json({
          ok: true,
          type: 'command.started',
          success: true,
          processId: id,
        })
  }
  return { paths, copies, commands, fetch, start, command, status }
}

export function attachmentTemporaryPath(command: string): string {
  const body = readAttachmentCommand(command)?.body ?? ''
  const match = body.match(/temporary='([^']+)'/)
  if (!match) throw new Error(`Missing temporary path in ${shellQuote(body)}`)
  return match[1]
}
