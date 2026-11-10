import type { HttpFetch } from '../env'
import type { CommandResult, CommandStatus } from '../sandbox/provider'
import { fakeE2bFrames, fakeE2bStartConfig } from './fake-e2b-frames'

export function fakeE2bJobPath(id: number, name: string): string {
  return `/run/conductive-e2b-commands/${id}/${name}`
}

export class FakeE2bEnvd {
  readonly files = new Map<string, Uint8Array>()
  readonly sizes = new Map<string, number>()
  readonly paths = new Map<string, string>()
  readonly rangeLimits = new Map<string, number>()
  readonly environmentContents: string[] = []
  readonly commands: Record<string, unknown>[] = []
  result: CommandResult = {
    exitCode: 0,
    stdout: 'done\n',
    stderr: '',
    timedOut: false,
  }
  nextJobId = 1234
  chunkBytes = 0
  omitExit = false
  malformedExit = false
  uploadEarly = false
  uploadPath: string | null = null
  afterRead: (() => void) | null = null
  response: (() => Response) | null = null

  fetch: HttpFetch = async (request) => {
    if (this.response) return this.response()
    const url = new URL(request.url)
    if (url.pathname === '/process.Process/Start') {
      const config = await fakeE2bStartConfig(request)
      if (config.kind === 'preview_ingress') {
        const path =
          typeof config.ingressPath === 'string' ? config.ingressPath : ''
        this.files.set(
          path,
          new TextEncoder().encode(JSON.stringify(config.ingress)),
        )
        return fakeE2bFrames(
          [
            { event: { start: { pid: 4321 } } },
            { event: { end: { exited: true } } },
          ],
          this.chunkBytes,
        )
      }
      if (
        typeof config.kind === 'string' &&
        config.kind.startsWith('environment_')
      ) {
        const temporary =
          typeof config.temporary === 'string' ? config.temporary : ''
        if (config.kind === 'environment_prepare')
          this.files.set(temporary, new Uint8Array())
        if (config.kind === 'environment_cleanup') this.files.delete(temporary)
        if (config.kind === 'environment_commit') {
          const bytes = this.files.get(temporary)
          if (!bytes) throw new Error('Missing fake environment upload.')
          this.environmentContents.push(new TextDecoder().decode(bytes))
          this.files.set('/run/ascii-secrets/env.sh', bytes)
          this.files.delete(temporary)
          if (typeof config.ingressPath === 'string')
            this.files.set(
              config.ingressPath,
              new TextEncoder().encode(JSON.stringify(config.ingress)),
            )
        }
        return fakeE2bFrames(
          [
            { event: { start: { pid: 4321 } } },
            { event: { end: { exited: true } } },
          ],
          this.chunkBytes,
        )
      }
      this.commands.push(config)
      this.setJob({
        processId: this.nextJobId,
        state: 'exited',
        running: false,
        ...this.result,
        stdoutOffset: 0,
        stderrOffset: 0,
        stdoutNextOffset: new TextEncoder().encode(this.result.stdout)
          .byteLength,
        stderrNextOffset: new TextEncoder().encode(this.result.stderr)
          .byteLength,
        more: false,
      })
      if (this.omitExit)
        this.files.delete(fakeE2bJobPath(this.nextJobId, 'exit.json'))
      if (this.malformedExit)
        this.files.set(
          fakeE2bJobPath(this.nextJobId, 'exit.json'),
          new TextEncoder().encode('null'),
        )
      const ready = btoa(
        JSON.stringify({ processId: this.nextJobId, pid: 4321 }) + '\n',
      )
      return fakeE2bFrames(
        [
          { event: { start: { pid: 4321 } } },
          { event: { data: { stdout: ready } } },
          { event: { end: { exited: true } } },
        ],
        this.chunkBytes,
      )
    }
    let path = url.searchParams.get('path') ?? ''
    if (url.pathname === '/filesystem.Filesystem/Stat') {
      const value: unknown = await request.json()
      path =
        typeof value === 'object' &&
        value !== null &&
        'path' in value &&
        typeof value.path === 'string'
          ? value.path
          : ''
      const bytes = this.files.get(path)
      if (!bytes && !this.sizes.has(path))
        return new Response(null, { status: 404 })
      return Response.json({
        entry: {
          path: this.paths.get(path) ?? path,
          name: path.split('/').at(-1),
          type: 'FILE_TYPE_FILE',
          size: String(this.sizes.get(path) ?? bytes?.byteLength ?? 0),
        },
      })
    }
    if (request.method === 'POST') {
      if (!this.uploadEarly)
        this.files.set(path, new Uint8Array(await request.arrayBuffer()))
      return Response.json([
        {
          path: this.uploadPath ?? path,
          name: path.split('/').at(-1),
          type: 'file',
        },
      ])
    }
    const bytes = this.files.get(path)
    if (!bytes) return new Response(null, { status: 404 })
    this.afterRead?.()
    const range = request.headers.get('Range')?.match(/^bytes=(\d+)-(\d+)$/)
    if (!range) return new Response(bytes)
    const offset = Number(range[1])
    if (offset >= bytes.byteLength) return new Response(null, { status: 416 })
    const end = Math.min(
      Number(range[2]),
      bytes.byteLength - 1,
      offset + (this.rangeLimits.get(path) ?? bytes.byteLength) - 1,
    )
    return new Response(bytes.subarray(offset, end + 1), {
      status: 206,
      headers: {
        'Content-Range': `bytes ${offset}-${end}/${bytes.byteLength}`,
      },
    })
  }

  setJob(status: CommandStatus): void {
    const json = (value: unknown) =>
      new TextEncoder().encode(JSON.stringify(value))
    this.files.set(
      fakeE2bJobPath(status.processId, 'meta.json'),
      json({ processId: status.processId, pid: 4321, startTicks: '999' }),
    )
    this.files.delete(fakeE2bJobPath(status.processId, 'exit.json'))
    this.files.delete('/proc/4321/stat')
    if (status.state === 'exited')
      this.files.set(
        fakeE2bJobPath(status.processId, 'exit.json'),
        json({
          processId: status.processId,
          exitCode: status.exitCode,
          timedOut: status.timedOut,
        }),
      )
    if (status.state === 'running' || status.state === 'exited')
      this.files.set(
        '/proc/4321/stat',
        new TextEncoder().encode(
          `4321 (python3) S ${Array.from({ length: 18 }, () => '0').join(' ')} 999`,
        ),
      )
    for (const stream of ['stdout', 'stderr'] as const) {
      const prefix =
        stream === 'stdout' ? status.stdoutOffset : status.stderrOffset
      const content = new TextEncoder().encode(status[stream])
      const path = fakeE2bJobPath(status.processId, stream)
      const bytes = new Uint8Array(
        prefix +
          content.byteLength +
          (status.more && stream === 'stderr' ? 1 : 0),
      ).fill(88)
      bytes.set(content, prefix)
      this.files.set(path, bytes)
      if (content.byteLength) this.rangeLimits.set(path, content.byteLength)
      else this.rangeLimits.delete(path)
    }
  }
}
