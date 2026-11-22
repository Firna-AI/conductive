import { describe, expect, test } from 'vitest'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { toolFixtures } from '../test-support/fixtures/tools'
import { createFilesPreviewStore } from './filesPreview'

const retained = toolFixtures().filesPreview.preview
const stale = {
  ...retained,
  id: 'files-preview-old',
  url: retained.url.replace(retained.id, 'files-preview-old'),
}
const current = {
  ...retained,
  id: 'files-preview-current',
  url: retained.url.replace(retained.id, 'files-preview-current'),
}

describe('the running period of a files preview', () => {
  test.each([
    {
      name: 'opened',
      oldReply: { type: 'opened', preview: stale },
      currentReply: { type: 'opened', preview: current },
      expectedPreview: current,
    },
    {
      name: 'open-failed',
      oldReply: { type: 'open-failed' },
      currentReply: { type: 'open-failed' },
      expectedPreview: null,
    },
  ] as const)(
    'ends the old opening and preserves the newer opening and retained preview when an old $name reply arrives',
    ({ oldReply, currentReply, expectedPreview }) => {
      const store = createFilesPreviewStore({
        orgId: FAKE_IDS.org,
        workspaceId: FAKE_IDS.workspace,
      })
      store.dispatch({ type: 'running', running: true })
      const oldPeriod = store.getSnapshot().period
      store.dispatch({ type: 'open' })
      store.dispatch({ type: 'opened', preview: retained, period: oldPeriod })
      store.dispatch({ type: 'open' })

      store.dispatch({ type: 'running', running: false })
      expect(store.getSnapshot()).toMatchObject({
        running: false,
        opening: false,
        preview: retained,
      })
      store.dispatch({ type: 'running', running: true })
      store.dispatch({ type: 'open' })
      const waiting = store.getSnapshot()
      expect(waiting).toMatchObject({
        running: true,
        opening: true,
        preview: retained,
      })

      store.dispatch({ ...oldReply, period: oldPeriod })
      expect(store.getSnapshot()).toEqual(waiting)

      store.dispatch({ ...currentReply, period: waiting.period })
      expect(store.getSnapshot()).toMatchObject({
        running: true,
        opening: false,
        preview: expectedPreview,
      })
    },
  )
})
