import { createHash } from 'node:crypto'
import { writeFile, rename } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join } from 'node:path'

const directory = process.argv[2]
const sensitive = JSON.parse(process.argv[3]).map((name) => name.toLowerCase())
const clean = (request) =>
  sensitive.every((name) => request.headers[name] === undefined)
const servers = []

for (const host of ['127.0.0.1', '::1', '0.0.0.0']) {
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json')
    response.end(
      JSON.stringify({
        marker: 'conductive-e2b-probe',
        host: request.headers.host,
        clean: clean(request),
      }),
    )
  })
  server.on('upgrade', (request, socket, head) => {
    if (!clean(request) || !request.headers.host?.startsWith('localhost:')) {
      socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n')
      return
    }
    const accept = createHash('sha1')
      .update(
        `${request.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`,
      )
      .digest('base64')
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
    )
    let pending = head
    const consume = (chunk) => {
      pending = Buffer.concat([pending, chunk])
      while (pending.length >= 6) {
        const length = pending[1] & 127
        if (length > 125 || !(pending[1] & 128)) return socket.destroy()
        if (pending.length < length + 6) return
        const opcode = pending[0] & 15
        const payload = Buffer.from(pending.subarray(6, length + 6))
        for (let index = 0; index < length; index++)
          payload[index] ^= pending[2 + (index % 4)]
        pending = pending.subarray(length + 6)
        if (opcode === 8) return socket.end(Buffer.from([0x88, 0]))
        socket.write(
          Buffer.concat([Buffer.from([0x80 | opcode, length]), payload]),
        )
      }
    }
    socket.on('data', consume)
    socket.on('error', () => undefined)
    if (head.length) consume(Buffer.alloc(0))
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen({ host, port: 0, ipv6Only: host === '::1' }, resolve)
  })
  servers.push(server)
}
const ports = servers.map((server) => server.address().port)
const temporary = join(directory, 'ports.new')
await writeFile(
  temporary,
  JSON.stringify({ ipv4: ports[0], ipv6: ports[1], network: ports[2] }),
)
await rename(temporary, join(directory, 'ports.json'))
