import { spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { watch } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { request, type IncomingMessage, type Server } from 'node:http'
import type { Socket } from 'node:net'
import { basename, dirname, join, resolve } from 'node:path'
import { URL as NodeURL } from 'node:url'

import { onTestFinished } from 'vitest'
import WebSocket from 'ws'

import { probeDirectory } from '../../image/e2b/live-command'
import { startPreviewRelay } from '../../runner/src/relay/server'
import {
  E2B_PRIVATE_HEADER_NAMES,
  E2B_PRIVATE_HEADERS,
  type PreviewIngressIdentity,
} from '../../src/shared/preview-ingress'
import { PREVIEW_RELAY_PORT } from '../../src/shared/previews'
import { imageNodeExecutable } from './image-runtime'
import { shellQuote } from './commands'
import type { SandboxProvider } from '../sandbox/provider'
import { isolatedProcessEnvironment } from '../test-support/process-environment'

const unused = async (): Promise<never> => {
  throw new Error('Unexpected live provider operation.')
}

export async function livePreviewFixture() {
  const parent = resolve(
    import.meta.dirname,
    '../../.context/e2b-live-preview-tests',
  )
  await mkdir(parent, { recursive: true })
  const directory = await mkdtemp(join(parent, 'probe-'))
  const sandboxId = 'sandbox-one'
  const domain = 'eu.e2b.test'
  const credential = 'live-probe-traffic-token'
  const identity: PreviewIngressIdentity = { sandboxId, domain, aliases: {} }
  const sockets = new Set<Socket>()
  let relay: Server | null = null
  let child: ChildProcess | null = null
  let closeWatch: () => void = () => undefined
  onTestFinished(async () => {
    closeWatch()
    if (child?.pid && child.exitCode === null && child.signalCode === null) {
      const stopped = once(child, 'exit')
      child.kill('SIGTERM')
      await stopped
    }
    for (const socket of sockets) socket.destroy()
    if (relay?.listening)
      await new Promise<void>((done) => relay?.close(() => done()))
    await rm(directory, { recursive: true, force: true })
  })
  relay = startPreviewRelay({ port: 0, ingressIdentity: async () => identity })
  relay.on('connection', (socket) => {
    sockets.add(socket)
    socket.once('close', () => sockets.delete(socket))
  })
  await once(relay, 'listening')
  const address = relay.address()
  if (!address || typeof address === 'string')
    throw new Error('The local relay has no TCP port.')
  const outerPort = address.port
  identity.aliases[String(outerPort)] = outerPort

  let ready: () => void = () => undefined
  let failed: (error: Error) => void = () => undefined
  const probeReady = new Promise<void>((done, reject) => {
    ready = done
    failed = reject
  })
  const watcher = watch(directory, (_event, name) => {
    if (name === 'ports.json') ready()
  })
  closeWatch = () => watcher.close()
  const provider: SandboxProvider = {
    create: unused,
    get: unused,
    stop: unused,
    resume: unused,
    fork: unused,
    delete: unused,
    setAutoStop: unused,
    saveSnapshot: unused,
    getSnapshot: unused,
    deleteSnapshot: unused,
    desktop: unused,
    getCommandStatus: unused,
    runCommand: async () => ({
      exitCode: 0,
      stdout: '',
      stderr: '',
      timedOut: false,
    }),
    writeFile: async (_id, path, body) => {
      await writeFile(
        join(directory, basename(path)),
        new Uint8Array(await new Response(body).arrayBuffer()),
      )
    },
    startCommand: async (_id, command) => {
      const local = command
        .replace(
          shellQuote(imageNodeExecutable()),
          shellQuote(process.execPath),
        )
        .replaceAll(probeDirectory, shellQuote(directory))
      child = spawn('/bin/sh', ['-c', `exec ${local}`], {
        env: isolatedProcessEnvironment({
          PATH: `${dirname(process.execPath)}:/usr/bin:/bin`,
        }),
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let errors = ''
      child.stdout?.resume()
      child.stderr?.on('data', (chunk: Buffer) => {
        errors += chunk.toString('utf8')
      })
      child.once('error', failed)
      child.once('exit', (code) =>
        failed(
          new Error(`The shipped preview probe exited ${code}: ${errors}`),
        ),
      )
      return { processId: child.pid ?? 1 }
    },
    readFile: async (_id, path) => {
      await probeReady
      const content = await readFile(join(directory, basename(path)))
      return {
        kind: 'file',
        file: {
          path,
          content: content.toString('base64'),
          encoding: 'base64',
          sizeBytes: content.byteLength,
        },
      }
    },
    privatePort: async (_id, port, mode) => ({
      origin: `https://${mode === 'localhost' && port === PREVIEW_RELAY_PORT ? outerPort : port}-${sandboxId}.${domain}`,
      credential: {
        headers: { [E2B_PRIVATE_HEADER_NAMES.trafficToken]: credential },
        stripHeaders: E2B_PRIVATE_HEADERS,
        stripCookies: [],
        stripQueryParameters: [],
      },
    }),
  }
  const sent: {
    protocol: 'http' | 'websocket'
    headers: Headers
    port: number
  }[] = []
  const route = (url: NodeURL, headers: Headers) => {
    const port = Number(url.hostname.split('-', 1)[0])
    headers.set('Host', url.hostname)
    return new NodeURL(
      `${url.pathname}${url.search}`,
      `http://127.0.0.1:${port}`,
    )
  }
  return {
    provider,
    sandboxId,
    outerPort,
    sent,
    requests: {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new NodeURL(
          input instanceof Request ? input.url : String(input),
        )
        const headers = new Headers(init?.headers)
        if (headers.get(E2B_PRIVATE_HEADER_NAMES.trafficToken) !== credential)
          return new Response(null, { status: 403 })
        const local = route(url, headers)
        sent.push({
          protocol: 'http',
          headers: new Headers(headers),
          port: Number(url.hostname.split('-', 1)[0]),
        })
        const response = await new Promise<IncomingMessage>((done, reject) => {
          const client = request(local, {
            headers: Object.fromEntries(headers),
            signal: init?.signal ?? undefined,
          })
          client.once('response', done)
          client.once('error', reject)
          client.end()
        })
        const chunks: Buffer[] = []
        for await (const chunk of response) chunks.push(Buffer.from(chunk))
        const responseHeaders = new Headers()
        for (const [name, value] of Object.entries(response.headers)) {
          if (Array.isArray(value))
            for (const item of value) responseHeaders.append(name, item)
          else if (value !== undefined) responseHeaders.set(name, value)
        }
        return new Response(Buffer.concat(chunks), {
          status: response.statusCode,
          headers: responseHeaders,
        })
      },
      websocket: (input: URL, headers: Headers) => {
        const url = new NodeURL(String(input))
        const local = route(url, headers)
        local.protocol = 'ws:'
        sent.push({
          protocol: 'websocket',
          headers: new Headers(headers),
          port: Number(url.hostname.split('-', 1)[0]),
        })
        return new WebSocket(local, {
          headers: Object.fromEntries(headers),
          handshakeTimeout: 30_000,
        })
      },
    },
  }
}
