import WebSocket from 'ws'
import source from './preview-probe.mjs?raw'
import { E2B_PRIVATE_HEADER_NAMES } from '../../src/shared/preview-ingress'

import {
  PREVIEW_RELAY_MARK_HEADER,
  PREVIEW_RELAY_PORT,
  PREVIEW_RELAY_PORT_HEADER,
} from '../../src/shared/previews'
import { imageNodeExecutable } from '../../worker/lifecycle/image-runtime'
import { shellQuote } from '../../worker/lifecycle/commands'
import type {
  PrivatePort,
  SandboxProvider,
} from '../../worker/sandbox/provider'
import { readBoundedJson } from '../../worker/http/bounded-body'
import { CheckError, integer, object } from '../live-input'
import { command, jsonFile, probeDirectory, upload } from './live-command'

interface PreviewRequests {
  fetch: typeof fetch
  websocket(url: URL, headers: Headers): WebSocket
}

const previewRequests: PreviewRequests = {
  fetch: (input, init) => fetch(input, init),
  websocket: (url, headers) =>
    new WebSocket(url.href, {
      headers: Object.fromEntries(headers),
      handshakeTimeout: 30_000,
    }),
}

function outerPort(descriptor: PrivatePort): number {
  const port = Number(new URL(descriptor.origin).hostname.split('-', 1)[0])
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new CheckError('The E2B relay returned an invalid port.')
  return port
}

function headers(
  descriptor: PrivatePort,
  target: number,
  sandboxId?: string,
): Headers {
  const value = new Headers(descriptor.credential.headers)
  if (sandboxId) {
    const routing = new Map<string, string>([
      [E2B_PRIVATE_HEADER_NAMES.sandboxId, sandboxId],
      [E2B_PRIVATE_HEADER_NAMES.sandboxPort, String(outerPort(descriptor))],
    ])
    for (const name of descriptor.credential.stripHeaders)
      if (!value.has(name))
        value.set(
          name,
          routing.get(name.toLowerCase()) ?? 'conductive-live-header-probe',
        )
  }
  value.set(PREVIEW_RELAY_PORT_HEADER, String(target))
  return value
}

async function httpProbe(
  descriptor: PrivatePort,
  target: number,
  requests: PreviewRequests,
  sandboxId?: string,
  relayed = true,
): Promise<void> {
  const response = await requests.fetch(`${descriptor.origin}/probe`, {
    headers: headers(descriptor, target, sandboxId),
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
  })
  const value = object(await readBoundedJson(response.body, 4096))
  if (
    response.status !== 200 ||
    value.marker !== 'conductive-e2b-probe' ||
    (relayed &&
      (value.host !== `localhost:${target}` ||
        value.clean !== true ||
        response.headers.get(PREVIEW_RELAY_MARK_HEADER) !== '1'))
  )
    throw new CheckError(
      'The E2B private preview did not preserve its HTTP boundary.',
    )
}

async function websocketProbe(
  descriptor: PrivatePort,
  target: number,
  sandboxId: string,
  requests: PreviewRequests,
): Promise<void> {
  const url = new URL('/socket', descriptor.origin)
  url.protocol = 'wss:'
  const expected = Buffer.from([0, 255, 128, 1])
  await new Promise<void>((resolve, reject) => {
    const socket = requests.websocket(
      url,
      headers(descriptor, target, sandboxId),
    )
    const deadline = setTimeout(() => {
      socket.terminate()
      reject(new CheckError('The E2B preview WebSocket did not answer.'))
    }, 30_000)
    socket.once('open', () => socket.send(expected))
    socket.once('error', () => {
      clearTimeout(deadline)
      reject(new CheckError('The E2B preview WebSocket failed.'))
    })
    socket.once('message', (data, binary) => {
      clearTimeout(deadline)
      socket.terminate()
      if (!binary || !Buffer.isBuffer(data) || !data.equals(expected))
        reject(new CheckError('The E2B preview WebSocket changed binary data.'))
      else resolve()
    })
  })
}

export async function checkPreview(
  provider: SandboxProvider,
  id: string,
  requests: PreviewRequests = previewRequests,
) {
  const descriptor = await provider.privatePort(
    id,
    PREVIEW_RELAY_PORT,
    'localhost',
  )
  const sensitive = [
    ...descriptor.credential.stripHeaders,
    PREVIEW_RELAY_PORT_HEADER,
  ]
  await upload(provider, id, 'preview-probe.mjs', source)
  await provider.startCommand(
    id,
    `${shellQuote(imageNodeExecutable())} ${probeDirectory}/preview-probe.mjs ${probeDirectory} ${shellQuote(JSON.stringify(sensitive))}`,
  )
  const ports = await jsonFile(provider, id, `${probeDirectory}/ports.json`)
  const ipv4 = integer(ports.ipv4),
    ipv6 = integer(ports.ipv6),
    network = integer(ports.network)
  const denied = await requests.fetch(`${descriptor.origin}/probe`, {
    headers: { [PREVIEW_RELAY_PORT_HEADER]: String(ipv4) },
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
  })
  if (denied.status !== 403)
    throw new CheckError(
      'The E2B ingress did not require its traffic credential.',
    )
  await denied.body?.cancel()
  await httpProbe(descriptor, ipv4, requests, id)
  await httpProbe(descriptor, ipv6, requests, id)
  await websocketProbe(descriptor, ipv4, id, requests)
  await httpProbe(
    await provider.privatePort(id, network, 'network'),
    network,
    requests,
    undefined,
    false,
  )
  return {
    privateIngress: true,
    httpIpv4: true,
    httpIpv6: true,
    websocketBinary: true,
    directNetwork: true,
    outerPort: outerPort(descriptor),
  }
}

export async function checkOldAlias(
  provider: SandboxProvider,
  id: string,
  domain: string,
  oldPort: number,
) {
  const host = `${oldPort}-${id}.${domain}`
  const script = `const http=require('node:http');const request=http.get({host:'127.0.0.1',port:${PREVIEW_RELAY_PORT},headers:{Host:${JSON.stringify(host)},${JSON.stringify(PREVIEW_RELAY_PORT_HEADER)}:'3000'}},response=>{response.resume();response.on('end',()=>{if(response.statusCode!==403)process.exitCode=1})});request.on('error',()=>{process.exitCode=1})`
  await command(
    provider,
    id,
    `${shellQuote(imageNodeExecutable())} -e ${shellQuote(script)}`,
  )
  return { oldAliasRejected: true }
}
