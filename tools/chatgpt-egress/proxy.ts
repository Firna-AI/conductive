// The ChatGPT egress proxy. The egress container runs it with
// CHATGPT_EGRESS_PRIVATE_NETWORK=1. A host outside Cloudflare runs it
// behind a named Cloudflare Tunnel with a shared secret.
// Run: node tools/chatgpt-egress/proxy.ts
import { readFileSync } from 'node:fs'
import {
  createEgressServer,
  drainEgressServer,
  type EgressAccess,
} from './egress-server.ts'

function access(): EgressAccess {
  if (process.env.CHATGPT_EGRESS_PRIVATE_NETWORK === '1')
    return { kind: 'private-network' }
  const file = process.env.CHATGPT_EGRESS_SECRET_FILE
  const secret = (
    file
      ? readFileSync(file, 'utf8')
      : (process.env.CHATGPT_EGRESS_SECRET ?? '')
  ).trim()
  if (secret.length < 32) {
    console.error('Set CHATGPT_EGRESS_SECRET or CHATGPT_EGRESS_SECRET_FILE.')
    console.error('The secret needs at least 32 characters.')
    process.exit(1)
  }
  return { kind: 'secret', secret }
}

const host = process.env.HOST ?? '127.0.0.1'
const port = Number(process.env.PORT ?? '8789')
const server = createEgressServer({ access: access() })
server.listen(port, host, () => {
  console.log(`ChatGPT egress proxy listens on http://${host}:${port}`)
})

process.once('SIGTERM', () => {
  console.log('Stopping: no new connections. Open answers finish first.')
  drainEgressServer(server).then(
    () => process.exit(0),
    (error: unknown) => {
      console.error('The drain failed:', error)
      process.exit(1)
    },
  )
})
