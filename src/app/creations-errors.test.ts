import { expect, test } from 'vitest'
import type { WorkspaceState } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { WorkspaceStream } from './events'
import { OrgModel } from './org-model'
import { RecordingEvents, testServices } from './test-kit'

const orgId = FAKE_IDS.org
const { created } = workspaceFixtures()
const workspaceId = created.workspace.id
const savedError = {
  code: 'workspace_start_failed',
  message:
    'The cloud computer did not start within the 20-minute limit. Try again.',
}
const defaults = {
  repositoryId: 'storefront',
  choice: { agent: 'codex', model: 'GPT-6.1 Sol', effort: 'medium' } as const,
}

function update(
  eventNumber: number,
  error?: unknown,
  state: WorkspaceState = 'error',
) {
  return {
    workspaceId,
    eventNumber,
    occurredAt: FAKE_TIME,
    event: {
      type: 'workspace.updated',
      workspace: { ...created.workspace, state },
      ...(error === undefined ? {} : { error }),
    },
  }
}

async function setup() {
  const events = new RecordingEvents()
  const server = new FakeApiServer()
  const services = testServices(server, { events })
  const org = new OrgModel(services, orgId)
  await org.reload('list')
  const form = org.newWorkspace(null)
  form.setText('Keep the cart changes.')
  await form.attach([new File(['Cart notes'], 'notes.txt')])
  await form.send(defaults)
  const stream = new WorkspaceStream(
    events,
    { orgId, workspaceId },
    services.delay,
  )
  stream.subscribe((envelope) => org.creations.observe(workspaceId, envelope))
  stream.start()
  return { events, org, stream }
}

test('the returned first-message form keeps the saved public cause through a retry to the same workspace', async () => {
  const { events, org, stream } = await setup()
  events.send({
    type: 'history',
    history: {
      events: [update(1, { ...savedError, log: 'Private start output.' })],
      throughEventNumber: 1,
    },
  })
  const recovered = org.creations.of(workspaceId).get()
  if (recovered?.state !== 'failed') throw new Error('No form came back.')
  expect(recovered.form.create.get()).toEqual({
    state: 'not-started',
    error: savedError,
  })
  expect(recovered.form.draft.get()).toMatchObject({
    text: 'Keep the cart changes.',
    attachments: [{ id: 'draft-attachment-1' }],
    messageId: 'client-1',
  })
  expect(await recovered.form.send(defaults)).toBeNull()
  expect(recovered.form.create.get()).toEqual({
    state: 'not-started',
    error: savedError,
  })
  stream.stop()
})

test('old recovery events keep a saved cause and an explicit null clears it without changing the edited draft', async () => {
  const { events, org, stream } = await setup()
  events.send({ type: 'event', envelope: update(1, savedError) })
  const recovered = org.creations.of(workspaceId).get()
  if (recovered?.state !== 'failed') throw new Error('No form came back.')
  recovered.form.setText('Keep these newer cart changes.')
  const draft = recovered.form.draft.get()
  events.send({ type: 'event', envelope: update(2) })
  expect(recovered.form.create.get()).toEqual({
    state: 'not-started',
    error: savedError,
  })
  events.send({ type: 'event', envelope: update(3, null, 'starting') })
  expect(recovered.form.create.get()).toEqual({
    state: 'not-started',
    error: null,
  })
  expect(recovered.form.draft.get()).toEqual(draft)
  stream.stop()
})
