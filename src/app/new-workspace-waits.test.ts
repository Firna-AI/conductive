import { expect, test, vi } from 'vitest'
import { attachmentUploadPartPath } from '../shared/messages'
import { FakeApiServer } from '../test-support/fake-api'
import { sentParts } from '../test-support/fake-files'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { pickWorkspaceFiles } from './draft-files.test-support'
import { OrgModel } from './org-model'
import { ManualDelay, testServices } from './test-kit'

const org = FAKE_IDS.org
const partPath = attachmentUploadPartPath(
  org,
  { type: 'new-workspace', messageId: '' },
  FAKE_IDS.upload,
  1,
)
const shortly = { timeout: 10_000 }

test('a New workspace upload waits on the timer of the app before a part goes again, and a Remove during the wait stops it at once', async () => {
  const server = new FakeApiServer()
  server.json(
    'PUT',
    partPath,
    { error: { code: 'attachment_upload_failed', message: 'Try again.' } },
    503,
  )
  const timer = new ManualDelay()
  const model = new OrgModel(testServices(server, { delay: timer.delay }), org)
  await model.reload('list')
  const form = model.newWorkspace(null)
  const notes = new File(['Cart notes'], 'notes.txt', { type: 'text/plain' })
  const attaching = pickWorkspaceFiles(form, [notes])
  // The first send of the part failed, so the upload waits 1 second on the
  // timer of the app. The chip leaves the text during that wait.
  await vi.waitFor(() => expect(timer.waits).toContain(1_000), shortly)
  form.setText('')
  await attaching
  const parts = await sentParts(server.requests)
  expect({
    waits: timer.waits.filter((ms) => ms === 1_000),
    parts: parts.map(({ text }) => text),
    files: form.draft.get().files,
  }).toEqual({ waits: [], parts: ['Cart notes'], files: [] })
})
