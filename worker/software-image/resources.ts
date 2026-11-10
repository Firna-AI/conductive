import type { SandboxProvider } from '../sandbox/provider'
import { createResource } from '../lifecycle/resource-intents'
import type { SoftwareImage } from './types'
import { saveSoftwareImage } from './data'

export class AttemptChanged extends Error {}

export async function allocateSoftwareImage(
  db: D1Database,
  provider: SandboxProvider,
  image: SoftwareImage,
): Promise<string> {
  const name = `software-image-${image.id}`
  const sandbox = await createResource(provider, {
    kind: 'sandbox',
    input: {
      name,
      idempotencyKey: name,
      ttlSeconds: 1800,
      labels: { software: image.id },
    },
    persist: async () => {
      if (!(await saveSoftwareImage(db, image, {}))) throw new AttemptChanged()
    },
  })
  return sandbox.id
}

export async function snapshotSoftwareImage(
  db: D1Database,
  provider: SandboxProvider,
  image: SoftwareImage,
) {
  if (!image.sandboxId) throw new Error('Missing software image sandbox')
  return createResource(provider, {
    kind: 'snapshot',
    recorded: image.snapshotRecorded === 1,
    input: { sandboxId: image.sandboxId, name: image.snapshotName },
    persist: async () => {
      if (!(await saveSoftwareImage(db, image, { snapshotRecorded: 1 })))
        throw new AttemptChanged()
    },
  })
}
