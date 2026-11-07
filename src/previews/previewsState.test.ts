import { describe, expect, it } from 'vitest'
import type { WorkspaceEvent } from '../shared/events'
import { previewsPath } from '../shared/previews'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { devSubscribe, emitDevEvent } from '../terminal/dev/devServer'
import { ToolStore } from '../terminal/tool-parts/toolStore'
import { listPreviews } from './previewsApi'
import {
  initialPreviews,
  previewsReducer,
  selectedPreview,
  visiblePreviews,
  type PreviewsAction,
} from './previewsState'

const first = {
  id: 'preview-1',
  port: 3000,
  url: 'https://a4826b97d1c04f15802c7e9bb2546d30.conductive-previews.test',
  expiresAt: 1_800_086_400_000,
}
const second = {
  id: 'preview-2',
  port: 4000,
  url: 'https://k7q2m9x4p8w3zr5t.conductive-previews.test',
  expiresAt: 1_800_086_400_000,
}

/** A fake API that lists both previews, as a list read can after a revoke. */
function serverWithBoth(): FakeApiServer {
  const server = new FakeApiServer()
  const path = previewsPath(FAKE_IDS.org, FAKE_IDS.workspace)
  server.json('GET', path, { previews: [first, second] })
  return server
}

/** The tool's list read, as the action that the tool sends with its reply. */
async function listReply(server: FakeApiServer): Promise<PreviewsAction> {
  const requests = {
    orgId: FAKE_IDS.org,
    workspaceId: FAKE_IDS.workspace,
    fetch: server.fetch,
  }
  const result = await listPreviews(requests, new AbortController().signal)
  if (!result.ok) throw new Error(`The list failed: ${result.error.message}`)
  return { type: 'loaded', previews: result.value }
}

function reduce(...actions: (PreviewsAction | WorkspaceEvent)[]) {
  return actions.reduce(previewsReducer, initialPreviews)
}

describe('preview list', () => {
  it('keeps a revoked preview hidden after an event of another workspace, a later list, and a new subscription', async () => {
    const server = serverWithBoth()
    const store = new ToolStore(
      previewsReducer,
      initialPreviews,
      FAKE_IDS.workspace,
    )
    const stop = store.listen(() => undefined, devSubscribe(server))
    store.dispatch(await listReply(server))

    emitDevEvent(server, 'saved-carts', {
      type: 'preview.revoked',
      previewId: 'preview-1',
    })
    expect(visiblePreviews(store.getSnapshot())).toEqual([first, second])

    emitDevEvent(server, FAKE_IDS.workspace, {
      type: 'preview.revoked',
      previewId: 'preview-1',
    })
    expect(visiblePreviews(store.getSnapshot())).toEqual([second])

    store.dispatch(await listReply(server))
    expect(visiblePreviews(store.getSnapshot())).toEqual([second])

    // React subscribes again for a new subscription, after the old one stops.
    stop()
    const next = serverWithBoth()
    const stopNext = store.listen(() => undefined, devSubscribe(next))
    emitDevEvent(server, FAKE_IDS.workspace, {
      type: 'preview.revoked',
      previewId: 'preview-2',
    })
    store.dispatch(await listReply(next))
    stopNext()
    expect(visiblePreviews(store.getSnapshot())).toEqual([second])
  })

  it('shows an open reply with a new ID for the same port after a revoke', () => {
    const reopened = {
      id: 'preview-3',
      port: 3000,
      url: 'https://f3c91d0e6b2a4c7d9e8f1a2b3c4d5e6f.conductive-previews.test',
      expiresAt: 1_800_086_400_000,
    }
    const state = reduce(
      { type: 'loaded', previews: [first, second] },
      { type: 'preview.revoked', previewId: 'preview-1' },
      { type: 'open' },
      { type: 'opened', preview: reopened },
    )

    expect(visiblePreviews(state)).toEqual([second, reopened])
  })

  it('shows the first tab when the address names a closed preview', () => {
    const state = reduce(
      { type: 'loaded', previews: [first, second] },
      { type: 'close', previewId: 'preview-1' },
      { type: 'closed', previewId: 'preview-1' },
    )

    expect(selectedPreview(visiblePreviews(state), 'preview-1')).toEqual(second)
    expect(state.closing.size).toBe(0)
  })
})
