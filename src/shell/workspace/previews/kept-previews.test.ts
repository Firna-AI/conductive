import { expect, it } from 'vitest'
import { previewsPath } from '../../../shared/previews'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { toolFixtures } from '../../../test-support/fixtures/tools'
import { devSubscribe } from '../../../terminal/dev/devServer'
import { createPreviewsStore } from '../../../previews/previewsStore'
import { visiblePreviews } from '../../../previews/previewsState'
import { connectPreviews } from './kept-previews'

const { org, workspace } = FAKE_IDS
const listed = toolFixtures().preview.preview

/** Waits until the store has no read that runs. */
async function loaded(store: ReturnType<typeof createPreviewsStore>) {
  for (let turn = 0; turn < 50 && store.getSnapshot().load !== null; turn++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

it('reads the list again at each new connection, so a preview that opened meanwhile shows', async () => {
  const server = new FakeApiServer()
  server.json('GET', previewsPath(org, workspace), { previews: [listed] })
  const store = createPreviewsStore({ orgId: org, workspaceId: workspace })
  const source = { fetch: server.fetch, subscribe: devSubscribe(server) }

  const stop = connectPreviews(store, source)
  await loaded(store)
  stop()
  // The end of the connection marks the list as not current at once, so no
  // Preview tab takes it as current before the next read.
  const stale = store.getSnapshot().load
  // An agent opened port 8080 while the store was not connected.
  const opened = { ...listed, id: 'preview-8080', port: 8080 }
  server.json('GET', previewsPath(org, workspace), {
    previews: [listed, opened],
  })
  const again = connectPreviews(store, source)
  await loaded(store)
  again()

  const reads = server.requests.filter(
    (request) =>
      request.method === 'GET' &&
      new URL(request.url).pathname === previewsPath(org, workspace),
  )
  expect({
    stale,
    reads: reads.length,
    ports: visiblePreviews(store.getSnapshot()).map((each) => each.port),
  }).toEqual({ stale: { state: 'loading' }, reads: 2, ports: [3000, 8080] })
})
