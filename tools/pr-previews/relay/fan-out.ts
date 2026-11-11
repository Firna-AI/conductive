import { MACHINE_PATHS } from '../../../src/shared/agent-tools.ts'
import type { RelayDependencies, RelayEnv } from './env.ts'
import { previewNumbers } from './previews.ts'

const FORWARDED_HEADERS = [
  'Content-Type',
  'User-Agent',
  'X-GitHub-Event',
  'X-GitHub-Delivery',
  'X-GitHub-Hook-ID',
  'X-GitHub-Hook-Installation-Target-ID',
  'X-GitHub-Hook-Installation-Target-Type',
  'X-Hub-Signature-256',
] as const

const BODY_COPY_BUDGET = 48 * 1024 * 1024

async function deliver(
  number: number,
  body: Uint8Array<ArrayBuffer>,
  headers: Headers,
  env: RelayEnv,
  dependencies: RelayDependencies,
): Promise<void> {
  const preview = `pr-${number}`
  let response: Response
  try {
    response = await dependencies.fetch(
      new Request(
        `https://${preview}-api.${env.PREVIEW_ZONE}${MACHINE_PATHS.githubWebhook}`,
        { method: 'POST', headers, body, redirect: 'manual' },
      ),
    )
  } catch {
    dependencies.warn({
      kind: 'preview_webhook_delivery_failed',
      preview,
      status: null,
    })
    return
  }
  if (!response.ok)
    dependencies.warn({
      kind: 'preview_webhook_delivery_failed',
      preview,
      status: response.status,
    })
  await response.body?.cancel().catch(() => {})
}

export async function fanOut(
  request: Request,
  body: Uint8Array<ArrayBuffer>,
  env: RelayEnv,
  dependencies: RelayDependencies,
): Promise<void> {
  let numbers: number[]
  try {
    numbers = await previewNumbers(env.PREVIEWS)
  } catch {
    dependencies.warn({
      kind: 'preview_registry_unavailable',
      preview: null,
      status: null,
    })
    return
  }
  const headers = new Headers()
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name)
    if (value !== null) headers.set(name, value)
  }
  let next = 0
  // Bound body copies while letting small events reach every preview at once.
  const concurrency = Math.min(
    numbers.length,
    Math.max(1, Math.floor(BODY_COPY_BUDGET / Math.max(1, body.byteLength))),
  )
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < numbers.length) {
        const number = numbers[next++]
        await deliver(number, body, headers, env, dependencies)
      }
    }),
  )
}
