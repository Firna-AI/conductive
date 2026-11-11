import { vi } from 'vitest'
import { MACHINE_PATHS } from '../../../src/shared/agent-tools.ts'
import type { RelayContext, RelayDependencies, RelayEnv } from './env.ts'

export function relayFixture(zone = 'preview.example') {
  const list = vi
    .fn<RelayEnv['PREVIEWS']['list']>()
    .mockResolvedValue({ keys: [], list_complete: true })
  const send = vi.fn<RelayDependencies['fetch']>(
    async () => new Response(null, { status: 204 }),
  )
  const warn = vi.fn<RelayDependencies['warn']>()
  const background: Promise<unknown>[] = []
  const waitUntil = vi.fn<RelayContext['waitUntil']>((promise) => {
    background.push(promise)
  })
  const env: RelayEnv = {
    PREVIEWS: { list },
    PREVIEW_ZONE: zone,
    GITHUB_WEBHOOK_SECRET: 'fake-webhook-secret',
  }
  return {
    env,
    ctx: { waitUntil },
    dependencies: { fetch: send, warn },
    list,
    send,
    warn,
    background,
  }
}

export const RAW_BODY = ' {"action":"opened","note":"☃"}\n'

export async function signedRequest() {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('fake-webhook-secret'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(RAW_BODY)),
  )
  const hex = [...signature]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return new Request(`https://preview.example${MACHINE_PATHS.githubWebhook}`, {
    method: 'POST',
    body: RAW_BODY,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'GitHub-Hookshot/fake',
      'X-GitHub-Event': 'pull_request',
      'X-GitHub-Delivery': 'delivery-123',
      'X-GitHub-Hook-ID': '7',
      'X-GitHub-Hook-Installation-Target-ID': '8',
      'X-GitHub-Hook-Installation-Target-Type': 'integration',
      'X-Hub-Signature-256': `sha256=${hex}`,
      Authorization: 'fake-do-not-forward',
      Cookie: 'fake-do-not-forward',
      Origin: 'https://elsewhere.example',
    },
  })
}
