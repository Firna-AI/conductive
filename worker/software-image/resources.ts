import type { SandboxProvider } from '../sandbox/provider'
import { createResource } from '../lifecycle/resource-intents'
import { ProviderError } from '../sandbox/errors'
import type { SoftwareImage } from './types'
import { saveSoftwareImage } from './data'
import { saveSoftwareImageOperation } from './operation-data'

export class AttemptChanged extends Error {}

export async function allocateSoftwareImage(
  db: D1Database,
  provider: SandboxProvider,
  image: SoftwareImage,
): Promise<string> {
  const name = `software-image-${image.id}`
  const sandbox = await createResource(db, provider, {
    kind: 'sandbox',
    // No org owns this computer, so the computer ledger does not hold it.
    ownership: null,
    mayHaveAllocated: true,
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
  if (image.snapshotRecorded === 1 && image.operation !== 'snapshot-missing') {
    try {
      return await provider.getSnapshot(image.snapshotName)
    } catch (error) {
      if (!(error instanceof ProviderError && error.kind === 'not_found'))
        throw error
      if (!(await saveSoftwareImageOperation(db, image, 'snapshot-missing')))
        throw new AttemptChanged()
      return null
    }
  }
  return createResource(db, provider, {
    kind: 'snapshot',
    recorded: false,
    input: { sandboxId: image.sandboxId, name: image.snapshotName },
    persist: async () => {
      if (!(await saveSoftwareImage(db, image, { snapshotRecorded: 1 })))
        throw new AttemptChanged()
    },
  })
}
