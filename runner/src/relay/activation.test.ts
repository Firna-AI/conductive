import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { request, type IncomingMessage } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'
import { expect, it, onTestFinished } from 'vitest'

import {
  PREVIEW_RELAY_MARK_HEADER,
  PREVIEW_RELAY_PORT_HEADER,
} from '../../../src/shared/previews'
import { localServer, readBody } from './test-support'

it('serves requests on the listening descriptor inherited through systemd activation', async () => {
  const target = await localServer((incoming, response) => {
    response.end(`served ${incoming.url} for ${incoming.headers.host}`)
  })
  const root = await mkdtemp(join(tmpdir(), 'conductive-relay-activation-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const socketPath = join(root, 'relay.sock')
  const bundle = await build({
    stdin: {
      contents: `
        import { startPreviewRelay } from './server'
        const server = startPreviewRelay({ port: 0 })
        server.once('listening', () => process.stdout.write(JSON.stringify({
          address: server.address(),
          descriptors: process.env.LISTEN_FDS,
          ownProcess: process.env.LISTEN_PID === String(process.pid),
        }) + '\\n'))
      `,
      resolveDir: fileURLToPath(new URL('.', import.meta.url)),
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
  })
  const child = spawn(
    'systemd-socket-activate',
    [
      `--listen=${socketPath}`,
      process.execPath,
      '--input-type=module',
      '--eval',
      bundle.outputFiles[0].text,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  onTestFinished(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = once(child, 'close')
      child.kill()
      await closed
    }
  })
  const ready = once(child.stdout, 'data')
  await once(child.stderr, 'data')
  const client = request({
    socketPath,
    path: '/activated?value=1',
    headers: {
      Host: 'sandbox-0.on.boat.dev',
      [PREVIEW_RELAY_PORT_HEADER]: String(target.port),
    },
  })
  onTestFinished(() => {
    client.destroy()
  })
  const response = new Promise<IncomingMessage | Error>((resolve) => {
    client.once('response', resolve)
    client.once('error', resolve)
  })
  client.end()
  const [announcement] = await ready
  expect(JSON.parse(announcement.toString())).toEqual({
    address: null,
    descriptors: '1',
    ownProcess: true,
  })
  const incoming = await response
  if (incoming instanceof Error) throw incoming
  expect(incoming.statusCode).toBe(200)
  expect(incoming.headers[PREVIEW_RELAY_MARK_HEADER.toLowerCase()]).toBe('1')
  expect(await readBody(incoming)).toBe(
    `served /activated?value=1 for localhost:${target.port}`,
  )
})
