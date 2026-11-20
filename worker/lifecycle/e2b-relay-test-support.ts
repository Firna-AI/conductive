import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import {
  createConnection,
  createServer,
  type NetConnectOpts,
  type Socket,
} from 'node:net'
import { join, resolve } from 'node:path'

import { onTestFinished } from 'vitest'

import { isolatedProcessEnvironment } from '../test-support/process-environment'
import { imageTestProcess } from '../tools/image-test-process'

const loadRelay = `import asyncio, importlib.util, pathlib, sys
spec = importlib.util.spec_from_file_location("conductive_port_relay", sys.argv[1])
relay = importlib.util.module_from_spec(spec)
spec.loader.exec_module(relay)
directory = pathlib.Path(sys.argv[2])
`

interface RelayReply {
  targetPort: number
  listenPort: number
}

function readReply(output: string): RelayReply {
  const value: unknown = JSON.parse(output)
  if (
    typeof value !== 'object' ||
    value === null ||
    !('targetPort' in value) ||
    typeof value.targetPort !== 'number' ||
    !('listenPort' in value) ||
    typeof value.listenPort !== 'number'
  )
    throw new Error('The relay client returned an invalid reply.')
  return { targetPort: value.targetPort, listenPort: value.listenPort }
}

function exchange(options: NetConnectOpts, chunks: readonly Uint8Array[]) {
  return new Promise<{ bytes: Buffer; error: string | null }>((resolve) => {
    const connection = createConnection({ ...options, allowHalfOpen: true })
    const output: Buffer[] = []
    let error: string | null = null
    connection.on('data', (chunk: Buffer) => output.push(chunk))
    connection.once('connect', () => {
      for (const chunk of chunks) connection.write(chunk)
      connection.end()
    })
    connection.once('error', (value: Error) => {
      error = value.message
    })
    connection.once('close', () =>
      resolve({ bytes: Buffer.concat(output), error }),
    )
  })
}

export async function e2bRelayFixture() {
  const source = resolve(import.meta.dirname, '../../image/e2b/port-relay.py')
  const parent = resolve(import.meta.dirname, '../../.context/e2b-relay-tests')
  await mkdir(parent, { recursive: true })
  const directory = await mkdtemp(join(parent, 'relay-'))
  const control = join(directory, 'relay.sock')
  const peers = new Set<() => Promise<void>>()
  const child = spawn(
    '/usr/bin/python3',
    [
      '-u',
      '-c',
      `${loadRelay}\nasyncio.run(relay.serve(directory, lambda: print("ready", flush=True)))`,
      source,
      directory,
    ],
    {
      env: isolatedProcessEnvironment({
        PATH: '/usr/bin:/bin',
        PYTHONDONTWRITEBYTECODE: '1',
      }),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  onTestFinished(async () => {
    await Promise.all([...peers].map((close) => close()))
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      const ended = once(child, 'exit')
      child.kill('SIGTERM')
      await ended
    }
    await rm(directory, { recursive: true, force: true })
  })
  await new Promise<void>((resolve, reject) => {
    let output = ''
    let errors = ''
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8')
      if (output.includes('ready\n')) resolve()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      errors += chunk.toString('utf8')
    })
    child.once('error', reject)
    child.once('exit', (code) =>
      reject(new Error(`Relay exited with ${code}: ${errors}`)),
    )
  })

  return {
    directory,
    control,
    async ensure(port: number): Promise<RelayReply> {
      const result = await imageTestProcess(
        '/usr/bin/python3',
        [
          '-c',
          `${loadRelay}\nsys.exit(relay.main(["ensure", sys.argv[3]], directory))`,
          source,
          directory,
          String(port),
        ],
        '',
        { PYTHONDONTWRITEBYTECODE: '1' },
      )
      if (result.exitCode !== 0) throw new Error(result.stderr)
      return readReply(result.stdout)
    },
    async peer(host: '127.0.0.1' | '::1', accept: (socket: Socket) => void) {
      const connections = new Set<Socket>()
      const server = createServer({ allowHalfOpen: true }, (connection) => {
        connections.add(connection)
        connection.on('error', () => undefined)
        connection.once('close', () => connections.delete(connection))
        accept(connection)
      })
      peers.add(
        () =>
          new Promise<void>((resolve, reject) => {
            for (const connection of connections) connection.destroy()
            if (!server.listening) return resolve()
            server.close((error) => (error ? reject(error) : resolve()))
          }),
      )
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen({ host, port: 0, ipv6Only: host === '::1' }, resolve)
      })
      const address = server.address()
      if (!address || typeof address === 'string')
        throw new Error('No TCP peer address.')
      return address.port
    },
    exchange: (port: number, chunks: readonly Uint8Array[]) =>
      exchange({ host: '127.0.0.1', port }, chunks),
    async request(value: unknown): Promise<unknown> {
      const result = await exchange({ path: control }, [
        Buffer.from(`${JSON.stringify(value)}\n`),
      ])
      if (result.error) throw new Error(result.error)
      return JSON.parse(result.bytes.toString('utf8'))
    },
  }
}
